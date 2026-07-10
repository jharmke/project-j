# SPEC: Monetization / "Support the Mission" (Pro / Member / Supporter)

Status: DRAFTING 2026-07-10. Design direction locked in principle; names, prices, exact limits, and copy are
OPEN (see Open Decisions). Must be BUILT + FUNCTIONAL before public App Store launch (barreling toward release).
This doc is the single source of truth for monetization. Keep the roadmap to one-liners; detail lives here.

---

## PHILOSOPHY (the vibe, locked)
- The app gives away ~95% of its value FREE. That generosity IS the credibility for ever asking for money.
- The paid layer is framed as SUPPORT ("this is made by one person; if it helps you, chip in to keep it alive
  and improving"), NOT as unlocking features we hid from you. Anti-MyFitnessPal, anti-scumbag.
- The mission line must be UNIVERSAL, not faith-centric. Faith is only ~1/3 of the app; leading with "keep
  faith features free" only rallies faith users and can cool off everyone else. "Faith stays free too" is a
  quiet footnote, never the headline. The pitch is: independent solo dev, no ads, doesn't sell your data,
  doesn't lock the basics away like the big apps.
- Walk the fine line carefully: "let's support this person" vs "another scumbag asking for money." The line is
  won by (a) already having given the whole app, (b) transparency about real costs (AI costs money per use),
  (c) never nagging, never interrupting core flows, (d) making the ask easy to ignore, (e) perks framed as a
  thank-you, not a ransom.
- Goal is modest passive income, honestly earned. Revenue comes more from GOODWILL than from perk-value; a
  small slice of fans pay because they like what was built. That is acceptable and expected. It will not be
  thousands; that's fine.
- Faith features are NEVER paywalled (locked, app-wide rule; see feedback_monetization memory + CLAUDE.md).

## APPROVED WORDING DIRECTION (not final copy)
- The vibe of "One person builds this. No ads. Your data isn't sold. Nothing real is locked away. If it's
  helping you, chipping in keeps it alive and getting better." is the RIGHT direction -- but the exact wording
  is NOT approved. Copy must be drafted + reviewed. Universal (non-faith) mission line is required.

---

## CURRENT STATE IN CODE (verified 2026-07-10 -- what actually exists)
There is NO paywall screen, NO purchase flow, NO real subscription system. "Pro" is entirely faked by a dev
toggle. A real user who hits a wall today CANNOT upgrade -- the paying half was never built. So adopting any of
this reframe costs nothing to tear out; we are building the money layer for the FIRST time.

What exists:
- `isPro` gating flag, but it is set ONLY by `__DEV__ || pj_settings.devProUnlocked` (the dev toggle in
  Settings). No StoreKit / RevenueCat / receipt check anywhere.
  - Settings dev toggle: app/settings.tsx (`devProUnlocked` state + `saveSetting('devProUnlocked', ...)`).
- Feature GATES that read `isPro`:
  - Day-vs-Day comparison: app/comparison-report.tsx (locked icon + "Pro" pill + blocks with an info toast
    when `!isPro`).
  - AI Meal Estimator monthly limit: app/ai-meal-estimator.tsx + services/aiMealEstimator.ts
    (`limitFor(isPro)`, `getRemainingUses`, "You have used all N AI estimates this month" message).
  - Custom Reports: app/reports.tsx is Pro-gated BUT currently OPEN TO ALL via `REPORTS_BETA_OPEN = true`.
- USAGE CAPS (server-side, per-user), currently RAISED for TestFlight beta (all on the REVERT list):
  - AI Meal Estimator: services/aiMealEstimator.ts `FREE_LIMIT = 100` (real intended 3/month), `PRO_LIMIT =
    9999` (effectively unlimited). Pro caps only apply in release builds.
  - Otto (appCompanion): functions/src/appCompanion.ts `FREE_DAILY_CAP = 100` (real intended 10/day).
  - Halo (faithCompanion): functions/src/faithCompanion.ts `FREE_DAILY_CAP = 50` (real intended 5/day).
  - `DEV_UNLIMITED_UIDS` get 100000/day on both companions.

## WHAT THE ROADMAP ALREADY DOCUMENTS (REVERT BEFORE LAUNCH list)
These are the TestFlight-only hacks that this monetization build must resolve:
- #2 `devProUnlocked` = FREE UNLIMITED PRO via the Settings dev toggle. Before launch: gate Pro on a real
  subscription (RevenueCat/StoreKit) + REMOVE the override + toggle.
- #3 AI Estimator quota raised (PRO_LIMIT effectively unlimited). Restore real caps.
- #4 Beta caps raised: Otto 10->100/day, Halo 5->50/day, AI Estimator 3->100/month. Revert to 10 / 5 / 3
  (or whatever final free numbers we lock here).
- #5 Custom Reports open to all (`REPORTS_BETA_OPEN = true`). Gate on the real subscription + set false.
- (Related launch blocker) Anthropic account hard monthly spend cap in the console -- the "sleep at night"
  ceiling on top of per-user caps.

---

## THE MODEL (direction locked; names/prices/limits open)
Three layers:

1. FREE (the 95%): everything except the perks below. Generous by design. Includes ALL faith features, all
   logging, workouts, stats, most reports, Otto/Halo (capped), AI Estimator (small monthly allowance). We are
   NOT boosting the free tier beyond its already-generous state (decided 2026-07-10 -- 95% free IS the
   generosity; leave the gates where they are).

2. SUPPORTER / MEMBER (one cheap recurring sub, ~$5-10/mo, price TBD): the ONLY recurring paid tier. Reframed
   as "Support the Mission." Perks (a thank-you, not the reason):
   - Unlimited (or greatly raised) AI Meal Estimator.
   - Unlimited (or greatly raised) Otto + Halo messages.
   - Custom Reports access.
   - Day-vs-Day comparison.
   - A Supporter badge / in-app recognition (see below).
   - (Any future power-user extras land here, not in a new tier.)
   Deliberately a SINGLE feature tier -- we don't have enough paywallable surface to justify multiple feature
   tiers, and a random higher-priced "more features" tier would feel arbitrary.

3. TIP JAR (one-time gifts, "give more" path): consumable in-app purchases at a few fixed amounts (e.g. $2.99 /
   $4.99 / $9.99, "Show extra support" / "Buy me a coffee"), available anytime, standalone OR on top of the
   sub. NO features attached -- pure gratitude. This is the honest answer to "someone wants to give more" WITHOUT
   a weird fake $20 feature tier: you're openly saying "give what you want, when you want," not pretending more
   money buys more app. Optionally bumps the badge / adds them to a thank-you list.
   - OPTIONAL FUTURE: a recurring "Patron" tier (higher price, SAME perks + a shinier badge/recognition),
     framed as gratitude not features, self-selected. Lead with the one-time tip first; only add Patron if
     there's demand. Do NOT ship an arbitrary higher feature tier.

## PERKS LIST (what Supporter unlocks -- maps to the existing gates)
- AI Meal Estimator: free = small monthly allowance (intended 3/mo); Supporter = unlimited/raised.
- Otto (appCompanion): free = 10/day (intended); Supporter = unlimited/raised.
- Halo (faithCompanion): free = 5/day (intended); Supporter = unlimited/raised.
- Custom Reports (app/reports.tsx): free = no access; Supporter = full.
- Day-vs-Day comparison (app/comparison-report.tsx): free = locked; Supporter = on.
- Supporter badge / recognition: Supporter (and Tip givers) only.
- NOTE: the AI features are the most DEFENSIBLE paid line because they cost real money per call (Anthropic +
  FatSecret bills). Framing = "this costs me money to run," which is honest, not withholding.

## FREE-TIER LIMITS (the real numbers to restore at launch -- the decision with teeth)
Currently beta-inflated. Intended real free caps (confirm/adjust here before launch):
- AI Meal Estimator: 3 / month (FREE_LIMIT).
- Otto: 10 / day (FREE_DAILY_CAP).
- Halo: 5 / day (FREE_DAILY_CAP).
- Custom Reports: locked (REPORTS_BETA_OPEN -> false).
- Day-vs-Day: locked.
OPEN: are 3/mo estimator + 10/5 companion right, or do they feel stingy now that we're "support" not "extract"?
Lean is to keep them (95% free is already the generosity) but revisit once real usage is known.

## SUPPORTER BADGE / RECOGNITION (liked, specifics TBD)
- A small, tasteful visible "thank you" for supporters (and optionally tip-givers). NOT a status flex over
  free users. Faith audiences especially respond to being THANKED, not just charged.
- Options to decide: a profile/header badge, a one-time thank-you screen, name in an in-app "Supporters" /
  credits list, a subtle app-icon or theme accent, tiered by tip amount, etc. Keep it warm, not braggy.

## THE "SUPPORT THE MISSION" SCREEN (the paywall, reframed)
- Replaces the generic "Unlock Pro" concept. Warm, gratitude-forward, universal (non-faith) mission line, then
  "here's what your support does," then perks as a thank-you list, then the price + Tip Jar option.
- Reached from: the soft upsell touchpoints (below) + a permanent entry in Settings.
- Copy is OPEN and must be drafted + reviewed. The approved DIRECTION (not wording) is the "one person / no
  ads / data not sold / nothing real locked away / chip in to keep it going" vibe.

## UPSELL TOUCHPOINTS (low stakes -- only ~2 real ones)
Because 95% is free, there are very few walls. Keep every one honest + non-naggy, no core-flow interruption:
- AI Estimator limit reached: "You've used this month's free AI estimates. Support the mission to keep going
  (and help cover the cost)." (copy TBD)
- Locked report / Day-vs-Day: a gentle "this is a Supporter perk" with a link to the screen.
- Permanent, non-intrusive entry in Settings.
(Justin not fully sold on softening wording -- low stakes, finalize with the screen copy.)

## PAYMENT / iOS CONSTRAINTS (must-know for the build)
- Must go through Apple IAP. RevenueCat over StoreKit is the likely path (handles receipts, restore, tiers).
- Apple takes 30% (subs drop to 15% after 12 months of a retained subscriber). Consumable tips = 30%.
- CANNOT link out to Patreon/Ko-fi/PayPal for "support the developer / app experience" -- Apple disallows
  external purchase links for digital goods tied to the app. Tips must be consumable IAPs in-app.
- IN-APP tip jar (consumable IAP) IS allowed -- the "Apple is weird about it" concern is EXTERNAL links only,
  not in-app tips. CAVEAT: Apple has historically been twitchy about tips that give LITERALLY NOTHING, and can
  make you justify them. Bulletproofing = have the tip grant a tiny acknowledgment (the Supporter badge /
  thank-you / thank-you-list bump), so it reads as "support + a small thank-you," not "pay for nothing." This
  is why the tip jar and the badge reinforce each other.
- Need: subscription product(s) + consumable tip products, restore-purchases, receipt validation, graceful
  offline/lapsed handling, and the Anthropic console spend cap as the backstop.

---

## BUILD CHECKLIST (before public launch -- required + functional)
1. Payment infra: RevenueCat (or StoreKit) integration; define products (1 sub + N consumable tips).
2. Real `isPro` source: replace `__DEV__ || devProUnlocked` with the real entitlement; REMOVE the dev toggle
   + override (REVERT #2). Keep a dev-only entitlement path for testing behind a flag.
3. Wire existing gates to the real entitlement: comparison-report Day-vs-Day, ai-meal-estimator, reports
   (`REPORTS_BETA_OPEN -> false`, REVERT #5).
4. Restore real free caps: AI Estimator FREE_LIMIT + PRO_LIMIT (REVERT #3), Otto/Halo FREE_DAILY_CAP (REVERT
   #4) to the locked numbers above.
5. Build the "Support the Mission" screen (copy final) + Settings entry.
6. Build the Tip Jar (consumable purchase flow) + thank-you.
7. Supporter badge / recognition.
8. Restore purchases + lapsed-subscription handling + entitlement caching (works offline).
9. Anthropic console hard monthly spend cap (launch blocker).
10. Explainers if any user-facing behavior/wording changes (tooltip/tutorials/Otto KB per standing rule).
11. QA across themes + Mindful + faith tiers; verify free vs supporter paths end-to-end on a real device.

## OPEN DECISIONS (need Justin)
- NAME of the paid tier: Supporter / Member / Partner / Patron / other. (Justin likes the rename; language TBD.)
- PRICE of the sub: ~$5-10/mo (annual option? intro price?).
- Tip Jar amounts + labels; whether tips affect the badge.
- Whether to ship the optional recurring "Patron" tier at launch or defer.
- Final free caps (keep 3/mo + 10/5, or adjust).
- Badge/recognition form.
- All COPY: mission line, perks list, upsell messages, thank-you.
- StoreKit direct vs RevenueCat.

## CROSS-REFERENCES
- project_j_roadmap.md REVERT BEFORE LAUNCH #2-#5 (the beta hacks this build resolves) + LAUNCH BLOCKERS
  (Anthropic spend cap).
- Memories: feedback_monetization (freemium OK, faith never paywalled), testflight_revert_before_launch.
- Code: app/settings.tsx (devProUnlocked), app/comparison-report.tsx, app/ai-meal-estimator.tsx +
  services/aiMealEstimator.ts, app/reports.tsx (REPORTS_BETA_OPEN), functions/src/appCompanion.ts +
  functions/src/faithCompanion.ts (FREE_DAILY_CAP).
