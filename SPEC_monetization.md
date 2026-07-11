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

## LOCKED DECISIONS (this thread -- 2026-07-11)
1. NAME = "Supporter" (LOCKED 2026-07-11). The single recurring paid tier is "Supporter." "Support the
   Mission" stays the paywall/screen name. One tier name, one entitlement, one product family.
   - "Patron" is NOT approved for anything. It is only PARKED as a possible name IF a higher recurring tier is
     ever built later. Do NOT use it for the base tier and do NOT treat it as decided.
   - PARKED -- faith-flavored badge skin (Rooted only): optionally render a Rooted Supporter's badge/
     recognition with a faith flavor (e.g. "Believer" wording and/or the Halo gold-cross treatment). Display
     SKIN ONLY on the same Supporter entitlement, shown only to Rooted users, never seen by Exploring/
     NotRightNow. NOT a separate tier, NOT a separate IAP product, NOT a separate price. Ties into the Badge
     decision below. The universal mission line is unaffected -- this is post-purchase recognition, not the pitch.
2. PRICE = $6.99/mo + $69.99/yr (LOCKED 2026-07-11). Annual is ~2 months free (~$69.99 vs $83.88). NO free
   trial at launch (keeps the build + entitlement logic simple; an intro/first-month discount can be added
   later if conversion needs a nudge). Rationale: covers a typical Supporter's AI cost ~1.5-2x over and the
   average Supporter far more; the free CAPS + the account spend cap (NOT the price) are what bound worst-case
   cost. Existing subscribers keep their rate if the price ever rises.
3. FREE + SUPPORTER CAPS (LOCKED 2026-07-11):
   - Otto (Haiku, general): free 10/day, Supporter 25/day. 50/day was rejected -- 50 x 30 ~= 1,500 msgs ~=
     $12/mo, ~2.5x the ~$4.89 net; 25/day keeps a single-feature whale near break-even and no normal user hits it.
   - Halo (Haiku, FAITH): 25/day for EVERYONE, free and Supporter identical. NOT a Supporter perk. Deliberately
     the MOST generous cap in the app (free Otto 10 vs free Halo 25 encodes "faith is what we're most generous
     with"). 8 was too low -- deep faith conversations run 15-30 turns and walling mid-conversation is the worst
     moment to wall. Biggest single free-tier cost lever (~$6/mo if maxed daily, realistically $1-2); a deliberate,
     on-brand place to spend generosity since faith is never upcharged (Chick-fil-A model).
   - AI Meal Estimator (Sonnet, the pricey call): free 5/month, Supporter 100/month. Free 5 = a real taste (full
     free food logging via search/barcode/manual already exists; the AI photo estimate is the convenience layer).
     Supporter 100 covers "every meal, 3x/day, 30 days" (~90) + headroom; ~$2-3/mo cost, more than covered by the
     sub (a maxed estimator user is still net-positive to us).
   - Custom Reports: free locked, Supporter full (no per-call AI cost -- deterministic renderers; pure power perk).
     Day-vs-Day: free locked, Supporter on.
   - Smart Coach (Sonnet, auto-fires, NOT gated): FREE FOR ALL. Biggest free-tier Sonnet exposure; watch on the
     monitoring dashboard. If cost runs hot post-launch, lever = only the home tip auto-generates AI (sleep/
     recovery/day-summary generate on open).
   - PHILOSOPHY: cheap Haiku features stay generous; the expensive Sonnet estimator is tighter-free / generous-paid.
     Supporter caps are HIGH but BOUNDED (never literally unlimited) so no single feature can run away; the rare
     max-everything whale (~$10-12/mo) is subsidized by the many light Supporters + the account-cap backstop.
     Always describe perks as "greatly expanded," never "unlimited," so a bounded cap is never a broken promise.
4. TIP JAR + SUPPORT-SCREEN PRESENTATION (LOCKED 2026-07-11; labels + tips-affect-badge still open):
   - CONCEPT C (hybrid): a short humble first-person "why" up top, then a small coffee-vibe tip ladder, then ONE
     visually set-apart "back the mission" tier. Warm, low-pressure, PULL not push (lives in Settings / the
     Support screen; never a popup, never interrupts a flow, never nags).
   - TIERS = consumable IAPs (Apple allows NO open-ended/type-your-own amount, so fixed tiers only): $2.99 /
     $4.99 / $9.99 (small rungs) + a set-apart $24.99 tier. 4 tiers total. $29.99+ rejected -- clashes with the
     humble jar / looks grabby; save real headroom for a possible future recurring Patron tier. TIER LABELS
     (LOCKED 2026-07-11): $2.99 "Pitch in" / $4.99 "Add some fuel" / $9.99 "Power it forward" / $24.99 "Back the
     mission" (fuel/momentum vibe, casual entry -> grand finish; a label-free bare-amounts option was considered
     then set aside). Tip section header = "Or chip in one time." No features attached, pure gratitude.
   - VOICE = first-person singular "I / me" for the maker; the app is "it / this app"; the word "we" NEVER
     appears on this screen (it breaks the solo-dev spell / sounds like a company). App CHROME elsewhere stays
     neutral / second-person; the Support screen is the ONE place the maker speaks as themselves.
   - HUMILITY RULES: state "one person" as context (explains the AI costs), never as a labor flex; give first
     (the core is free), invite second; release them out loud (fine to never give); thank them for being here,
     not just for paying; keep a little lightness; never quantify effort ("countless hours"). Contrast MFP-style
     paywalls but NEVER name a competitor (allude, "a lot of apps" -- lands harder, avoids petty/legal risk).
   - ACCURACY: say "the core / the essentials are free," NOT "the app is free" (Reports, Day-vs-Day, and the
     higher AI caps are Supporter-only, so "all free" would overclaim). Only list GENUINELY-free features in the
     contrast (barcode scanner, full macro tracking, sleep & recovery scores) -- NOT the estimator/Reports/Day-vs-Day.
   - "WHY" COPY (APPROVED 2026-07-11 -- VOICELESS to match the app: NO first person. Justin: one screen suddenly
     using "I" stuck out against a first-person-free app, so we dropped it):
     "A lot of apps hide the basics behind a paywall: the barcode scanner, full macro tracking, even your sleep
     and recovery scores. Here, they stay free. The one piece with a real cost to run is the AI, the smarts behind
     Otto and Halo, your coaching, and the meal estimator. So if the app's been good to you, a little support keeps
     it alive and moving forward. Either way, thank you for being part of this."
     NOTE: it names Halo when DESCRIBING what the AI powers (honest -- Halo is AI that costs money), but Halo is
     NOT a paid perk (faith is never upcharged). Describing-the-AI and selling-a-perk are different places.
   - SUPPORTER SECTION COPY (APPROVED 2026-07-11): heading "Become a Supporter". Perk list = Format B (bold Title
     + short description), header "As a thank-you, Supporters get:"
       * More AI Room -- big bumps to your Otto and meal-estimate limits.
       * Custom Reports -- built from the stats that matter most to you.
       * Day-by-Day -- compare any two days and see exactly what changed.
       * Custom Badge & Icon -- a token of thanks for helping keep this going.
     (Halo deliberately NOT listed as a perk -- faith is not upcharged. It IS already named in the why paragraph
     ("the smarts behind Otto and Halo"), so faith is not omitted. A separate "faith stays free for everyone"
     mission line was considered and DROPPED 2026-07-11 as forced; someday-maybe it could live as a small line at
     the bottom of the screen, not now. Price line / button copy still to confirm: "$6.99/month · $69.99/year
     (2 months free)" + a "Become a Supporter" button are the working defaults.)
   - "Do tips affect the badge?" -> folded into the Badge decision (#5); Apple wants a tip to grant a small
     acknowledgment (the badge / thank-you), which doubles as the tip-jar "not paying for literally nothing"
     bulletproofing.
5. BADGE / RECOGNITION (LOCKED 2026-07-11; exact badge pixels still to design at build):
   - FORM = a warm one-time THANK-YOU MOMENT at purchase/tip (short personal note from the maker) + a quiet
     PERSISTENT badge. Both Supporters AND tip-givers get it (also Apple's "a tip must grant something"
     bulletproofing). Self-facing by nature -- the app has no social layer, so a badge can never be a flex.
   - BADGE = a small GOLD SPROUT glyph on the avatar corner + a gold ring around the avatar. Small glyph, NOT a
     text banner (whisper, don't brag); NO lettering (app name/logo not locked; a glyph is timeless). Sprout over
     heart because the app ALREADY uses the heart for favorites (pj_favorites / heart-tap / Bible favorites) -- a
     heart badge would collide; sprout also says "you help this grow" (wellness + quiet sowing resonance, echoes
     the "Sown" name DNA). Home base = Profile; the gold avatar ring is the subtle app-wide signature (rides with
     HeaderAvatar wherever it shows). Exact pixels TBD at build.
   - FAITH SKIN (the parked "Believer" idea): base badge is SECULAR (sprout); Rooted Supporters get a GOLD CROSS
     variant (Halo's mark). Same entitlement, Rooted-only, nobody else sees it. Ship if easy; not launch-critical.
   - COSMETIC "GOLD THREAD" = gold alternate APP ICON + gold avatar ring + gold badge (one cohesive "gold =
     supporter" identity). GUARDRAIL: keep to that cohesive thread; do NOT sprawl into an unlockable-skins store
     (that's the MFP "pay for cosmetics" energy we position against). Stays within the "themes/accents NEVER paid"
     rule because an APP ICON is outside the theme system. CAVEAT: alternate app icons need bundled assets +
     Info.plist config, trigger an iOS "you changed the icon" popup, and REQUIRE A REBUILD (not pure JS).
   - FLAT (LOCKED): everyone who supports gets the SAME badge -- no dollar-ranked hierarchy (that turns generosity
     into a leaderboard / ranks people by money). The thank-you MESSAGE may warmly name the gift ("thanks for the
     coffee" vs "thanks for backing the mission"), but the visible badge does NOT tier by amount.
   - THANK-YOU SYSTEM = Option 1 at launch: a RevenueCat webhook (set up anyway for entitlements) -> Cloud
     Function -> emails JUSTIN the new-supporter details -> he PERSONALLY hand-writes the thank-you from the public
     support address. Near-zero build, genuinely personal, feasible at launch volumes (Apple "Hide My Email" relay
     still forwards). UPGRADE (post-launch): an in-app "note from the maker" inbox + push (targeted by uid) so it
     doesn't depend on email and feels special in-app; switch if hand-emailing volume becomes a burden.
   - PARKED (don't lose): the in-app "Supporters" thank-you WALL (Concept C) -- needs opt-in + looks thin at
     launch; revisit once there's a real list to show.
6. PATRON TIER = DEFERRED (LOCKED 2026-07-11). Do NOT ship a second recurring tier at launch. Launch = the one
   Supporter sub + the one-time tip jar. Add a recurring "Patron" (higher price, SAME perks + shinier recognition,
   gratitude not features) ONLY if real post-launch demand appears. Never ship an arbitrary higher FEATURE tier.
7. PAYMENT INFRA = RevenueCat (LOCKED 2026-07-11), not raw StoreKit. RevenueCat wraps Apple IAP and handles
   receipt validation, restore-purchases, subscription-state tracking, offline entitlement caching, and the
   webhooks the thank-you system (#5) depends on -- the exact risky plumbing a solo dev shouldn't hand-roll.
   COST (verified on revenuecat.com/pricing 2026-07-11): $0 until $2,500/mo tracked revenue (MTR); then 1% of
   tracked revenue. MTR is PRE-Apple-cut (gross). No monthly minimum, no per-transaction fee. That 1% is the ONLY
   extra vs StoreKit, and only past $2,500/mo (~350+ Supporters at $6.99), so it's effectively $0 at launch for
   the foreseeable future. Apple's 30% (15% after 12 retained months) is unavoidable EITHER way. Still need App
   Store Connect products (1 sub + 4 tips) regardless of RC vs StoreKit. (Confirm the exact all-vs-above-$2,500
   calc on their FAQ at setup; rounds to nothing at our scale either way.)

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
   [LOCKED 2026-07-11: $2.99/$4.99/$9.99 + set-apart $24.99; Concept C hybrid screen; first-person voice. See DECISIONS #4.]
   - OPTIONAL FUTURE: a recurring "Patron" tier (higher price, SAME perks + a shinier badge/recognition),
     framed as gratitude not features, self-selected. Lead with the one-time tip first; only add Patron if
     there's demand. Do NOT ship an arbitrary higher feature tier.

## PERKS LIST (what Supporter unlocks -- exact caps in LOCKED DECISIONS #3)
- AI Meal Estimator: free 5/month; Supporter 100/month (Sonnet; most defensible paid line -- real $/call).
- Otto (appCompanion): free 10/day; Supporter 25/day (Haiku).
- Halo (faithCompanion): 25/day for EVERYONE -- NOT a Supporter perk. Listed here only to record that faith was
  deliberately EXCLUDED from the paid tier (never upcharged).
- Custom Reports (app/reports.tsx): free = no access; Supporter = full.
- Day-vs-Day comparison (app/comparison-report.tsx): free = locked; Supporter = on.
- Supporter badge / recognition: Supporter (and Tip givers) only.
- NOTE: the AI features are the most DEFENSIBLE paid line because they cost real money per call (Anthropic +
  FatSecret bills). Framing = "this costs me money to run," which is honest, not withholding.

## FREE-TIER LIMITS + SUPPORTER CAPS (LOCKED 2026-07-11 -- set these at launch; full rationale in DECISIONS #3)
Currently beta-inflated (see REVERT list). Final caps:
- AI Meal Estimator (FREE_LIMIT / PRO_LIMIT, services/aiMealEstimator.ts): free 5/month, Supporter 100/month.
- Otto (FREE_DAILY_CAP, functions/src/appCompanion.ts): free 10/day, Supporter 25/day.
- Halo (FREE_DAILY_CAP, functions/src/faithCompanion.ts): 25/day for EVERYONE (free = Supporter; faith not
  upcharged). NOTE: this RAISES Halo from the old intended 5/day -- 8 was too low for real faith conversations.
- Custom Reports: free locked (REPORTS_BETA_OPEN -> false), Supporter full.
- Day-vs-Day: free locked, Supporter on.
- Smart Coach (Sonnet via aiProxy): free for all, not gated; monitor as the top free-tier Sonnet cost.

## SUPPORTER BADGE / RECOGNITION (DECIDED 2026-07-11 -- full detail in LOCKED DECISIONS #5)
- FORM: a warm one-time thank-you moment + a quiet persistent gold SPROUT badge on the avatar (+ gold ring),
  self-facing, FLAT (no dollar-ranked tiers). Supporters AND tip-givers get it. Faith skin = gold cross for
  Rooted. Cosmetic "gold thread" = gold app icon + avatar ring + badge (tasteful, never a skins store).
- Faith audiences especially respond to being THANKED, not just charged. NOT a status flex over free users.
- THANK-YOU EMAIL (was parked; now the LAUNCH plan = Option 1): RevenueCat webhook -> alert Justin -> he
  hand-writes a personal thank-you. Apple IAP does NOT give the buyer's email, but Firebase auth email (incl. the
  Apple Hide-My-Email relay, which forwards) covers most; an in-app "note from the maker" is the post-launch upgrade.

## THE "SUPPORT THE MISSION" SCREEN (the paywall, reframed)
- Replaces the generic "Unlock Pro" concept. Warm, gratitude-forward, universal (non-faith) mission line, then
  "here's what your support does," then perks as a thank-you list, then the price + Tip Jar option.
- Reached from: the soft upsell touchpoints (below) + a permanent entry in Settings.
- STATE-AWARE (LOCKED 2026-07-11): the screen renders TWO states.
  (a) NOT a Supporter -> the full pitch (why + Become a Supporter + tip jar).
  (b) Supporter (comped OR real subscriber) -> a warm "You're a Supporter, thank you" state INSTEAD of the pitch:
      status + thank-you + the gold sprout, a "Manage subscription" link (Apple requires it), and the tip jar
      STAYS (a Supporter can still tip). No "buy" button shown when already in.
- TESTFLIGHT TESTER ACCESS (LOCKED 2026-07-11): comp testers a free RevenueCat promotional Supporter entitlement
  (per-account, keyed to Firebase uid, manual in the RC dashboard -- nobody comped by default) so testers keep
  FULL access when the real gates go live. Keep ONE uncomped test account (Justin's iPad) to run the real sandbox
  buy/restore/tip flow for free. This is the "dev-only entitlement path" from Build Checklist #2.
- Copy: the "why" paragraph is APPROVED (DECISIONS #4). Remaining strings (tier labels, upsell one-liners,
  thank-you note, buttons, Settings row) are being drafted in the copy pass.

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

## USAGE MONITORING & DIAGNOSTICS (post-launch cost visibility -- the plan, DECIDED 2026-07-11)
WHY: the account spend cap is a FIRE ALARM, not a throttle. Monitoring is what keeps it from ever ringing --
watch the trend and act (tighten per-user caps, or raise the cap deliberately) BEFORE anything hard-stops. The
per-USER daily caps ("out of messages today, resets tomorrow") are the graceful day-to-day throttle; the
ACCOUNT cap sits generously above realistic spend and should never fire in a normal month. Flying blind is the
only way the ugly mid-month hard-stop happens; this plan is the fix.

WHAT ALREADY EXISTS (verified 2026-07-11): every AI feature already writes a per-user, per-day counter to
Firestore -- Otto = `ai_usage_companion`, Halo = `ai_usage`, Smart Coach = `ai_usage_coach`, AI Estimator =
`ai_usage_estimator` (all via atomic check-and-increment). TWO gaps: (1) each doc holds only TODAY's count per
user (a new day overwrites it) so no history is retained; (2) they are COUNTS, not cost -- the Cloud Functions
receive `response.usage` (real input/output/cache tokens) from Anthropic and currently discard it.

MODELS/COST DRIVERS (verified 2026-07-11, for reading the dashboards): Estimator + Smart Coach = Sonnet 4.6
($3/$15 per M tokens) via aiProxy; Otto + Halo = Haiku 4.5 ($1/$5 per M) via appCompanion/faithCompanion. So on
the Anthropic console the Sonnet line ~= estimator + coach and the Haiku line ~= Otto + Halo. Rough per-call:
estimator ~$0.02 (photo+prompt), coach tip ~$0.02 (big uncached rulebook, 300-tok out), Otto/Halo ~$0.007-0.01
(cached stable system block, 800-tok out). A free user maxing EVERY cap every day ~= $7/mo ceiling; realistic
average free user is pennies.

THE PLAN (tiered):
- TIER 1 -- LAUNCH-REQUIRED, zero build: Anthropic Console is the money ground-truth (spend + tokens by model by
  day). Set the hard monthly cap AND usage alerts (~50% / ~80%) so you are emailed BEFORE anything stops. Check
  daily the first week, then weekly.
- TIER 2 -- RECOMMENDED BUILD (do with this monetization work): in aiProxy + appCompanion + faithCompanion,
  capture the `response.usage` already returned and write a compact per-call event / daily rollup keyed by
  day x feature (calls, input/output tokens, estimated $, unique users) into an `ai_daily_summary/{date}` doc via
  a once-daily scheduled function; optional one-line email digest. This is the per-feature/per-user cost
  attribution the Anthropic console CANNOT give (one key = lumped tokens) and is required to tune the free caps
  on real data instead of guessing.
- TIER 3 -- LATER, optional: a dev-only in-app admin screen that reads the `ai_daily_summary` docs so the numbers
  are viewable on device. Nice-to-have, not launch.

DECISION (2026-07-11): ship Tier 1 for launch; build Tier 2 as part of this monetization work; defer Tier 3.

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
9. Anthropic console hard monthly spend cap + usage alerts at ~50%/80% (launch blocker). See Usage Monitoring.
10. Usage monitoring: Tier 1 (Anthropic console + alerts) LAUNCH-REQUIRED; Tier 2 (per-feature cost rollup from
    response.usage -> ai_daily_summary) built with this work so caps tune on real data. Full plan: Usage
    Monitoring & Diagnostics section above.
11. Explainers if any user-facing behavior/wording changes (tooltip/tutorials/Otto KB per standing rule).
12. QA across themes + Mindful + faith tiers; verify free vs supporter paths end-to-end on a real device.

## OPEN DECISIONS (need Justin)
- [LOCKED 2026-07-11] NAME of the paid tier = "Supporter." See LOCKED DECISIONS above (+ parked faith badge skin).
- [LOCKED 2026-07-11] PRICE = $6.99/mo + $69.99/yr, no launch trial. See LOCKED DECISIONS above.
- [LOCKED 2026-07-11] Tip Jar = $2.99/$4.99/$9.99 + $24.99, Concept C, VOICELESS screen voice; tier labels locked
  (Pitch in / Add some fuel / Power it forward / Back the mission). Tips grant the same recognition as a sub
  (flat, DECISIONS #5). See DECISIONS #4.
- [LOCKED 2026-07-11] Patron tier = DEFERRED (launch is sub + tip jar only). See DECISIONS #6.
- [LOCKED 2026-07-11] Free + Supporter caps set (Otto 10/25, Halo 25/25, Estimator 5/100). See DECISIONS #3.
- [LOCKED 2026-07-11] Badge = gold sprout on avatar + gold ring; flat; gold-thread cosmetics; thank-you Option 1;
  faith cross skin for Rooted. See DECISIONS #5. (Exact badge pixels still to design at build.)
- All COPY: mission line, perks list, upsell messages, thank-you.
- [LOCKED 2026-07-11] Payment infra = RevenueCat (free to ~$2,500/mo MTR, then 1%). See DECISIONS #7.

## CROSS-REFERENCES
- project_j_roadmap.md REVERT BEFORE LAUNCH #2-#5 (the beta hacks this build resolves) + LAUNCH BLOCKERS
  (Anthropic spend cap).
- Memories: feedback_monetization (freemium OK, faith never paywalled), testflight_revert_before_launch.
- Code: app/settings.tsx (devProUnlocked), app/comparison-report.tsx, app/ai-meal-estimator.tsx +
  services/aiMealEstimator.ts, app/reports.tsx (REPORTS_BETA_OPEN), functions/src/appCompanion.ts +
  functions/src/faithCompanion.ts (FREE_DAILY_CAP).
