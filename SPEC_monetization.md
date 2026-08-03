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

## SESSION HANDOFF (2026-07-12) -- READ THIS FIRST TO PICK UP SEAMLESSLY

>>> ✅ TESTER ENTITLEMENTS DONE 2026-07-13: all 11 testers granted `supporter` (yearly) via the RevenueCat REST
>>> API. The pinned sequence below is now HISTORY -- keep it for the reasoning, but the blocker is cleared.
>>> WHAT CHANGED: we assumed testers had to run a RevenueCat build and open the app before they could be granted
>>> (RC only knows a customer once the SDK has run). FALSE. `GET /v1/subscribers/{uid}` CREATES the customer, and
>>> you can then POST a promotional entitlement to someone who has never opened the app -- it sits waiting for
>>> them. No chasing, no tracking who updated. Method + full uid list: LAUNCH_CHECKLIST.md Phase 0.
>>> ⚠️ TWO TRAPS FOUND DOING IT (both fixed, both would have bitten at launch):
>>>   1. A PROMOTIONAL grant arrives as NON_RENEWING_PURCHASE -- the same webhook event as a TIP. It emailed
>>>      Justin a fake "$0 tip, time to write the thank-you" (would have been 11 emails). Guarded now.
>>>   2. That same event never wrote a membership record, so the SERVER would have given every granted tester
>>>      FREE-tier AI caps while the app told them they were Supporters. Fixed properly: Firestore is now a
>>>      CACHE and RevenueCat is the TRUTH (lazy API lookup on a miss). See LAUNCH_CHECKLIST 1.2.
>>>   3. The hand-written tester list was missing FOUR people. The real list came from `firebase auth:export`.
>>>      Enumerate, don't recall.
>>>
>>> 📌 PINNED (HISTORICAL -- the sequence we thought we needed; superseded above, kept for the reasoning)
>>> THE TRAP: TestFlight testers are NOT Pro and never were. `isSupporter = entitled || (__DEV__ && devOverride)`
>>> (MembershipContext.tsx:185) and __DEV__ is FALSE in a TestFlight build -- so the Settings dev toggle grants
>>> Justin Pro ONLY in his local dev build. Testers' access comes from the per-feature BETA HACKS (raised
>>> Otto/Halo/Estimator caps + REPORTS_BETA_OPEN), NOT from any entitlement. That's why Comparison + the EvR
>>> cards genuinely lock for them today while Custom Reports does not.
>>> WHY WE CAN'T JUST GRANT THEM SUPPORTER TODAY: RevenueCat only knows a user once they've RUN a build
>>> containing the SDK. Every tester is still on the pre-RevenueCat TestFlight build, so they do not exist as
>>> RC customers yet (checked 2026-07-12: the RC dashboard has exactly ONE customer -- Justin's dev build).
>>> Nothing to grant.
>>> THE ORDER (each step gates the next):
>>>   1. Ship a TestFlight build that INCLUDES RevenueCat (the native build already exists; not yet distributed).
>>>   2. Each tester opens the app once -> Purchases.logIn(firebase uid) runs -> they appear in RC as customers.
>>>   3. In the RC dashboard, GRANT each tester the `supporter` entitlement (longest/lifetime duration).
>>>   4. ONLY THEN retire the beta hacks (REPORTS_BETA_OPEN=false + real Otto/Halo/Estimator caps) -- nobody is
>>>      depending on them anymore and testers see the REAL Supporter experience.
>>> TESTER UIDs (= their RevenueCat customer IDs; pulled from Firebase Auth 2026-07-12):
>>>   meganholley01@gmail.com                 HpvSF7CwAxPHJ3MK2Zy2HpReiQa2
>>>   tharmke3@gmail.com                      jZDNOG0B05Z2Y4mZrDgcubMgRJX2
>>>   cnajarian27@gmail.com                   4aycyZq2zIhhRLMsx5fFKv88Qk82
>>>   erinenpointe@gmail.com                  MaLenULUgwR1pSiH3oFpQzzYuu63
>>>   mcctwkmbw5@privaterelay.appleid.com     NVltSwNcCshudCqAonVO72QHqwd2
>>>   zdmjw78ct2@privaterelay.appleid.com     Ver7gb3Ol9Ux1vOB1E1puFwAGti1
>>>   gfr5dknvsh@privaterelay.appleid.com     6PchTJOXxNRpGjJpKTSAOAVQ43J3
>>> ⚠️ DO **NOT** GRANT JUSTIN (jtharmke@gmail.com / zLZOx2aqiKXcl3tlg7LNmkwbGxH3). His dev build logs in with
>>> the same uid, so a real granted entitlement would make him a permanent Supporter EVERYWHERE and he could
>>> never see the free/locked state again (the dev override can only ADD Supporter, never remove a real
>>> entitlement). He stays un-granted as the one account that can test BOTH sides.
>>>
>>> ✅ SUPPORTER STATE + THE GOLD SYSTEM DONE 2026-07-13 (session 4). Device-verified across all 5 themes.
>>> WHAT SHIPPED:
>>>   - MEMBERSHIP DATA LAYER: MembershipContext now exposes `details` = { plan, memberSince, periodEnd,
>>>     willRenew }, read off the RevenueCat entitlement. NULL whenever there's no real entitlement (free
>>>     user, or Justin's __DEV__ toggle) so surfaces render NOTHING rather than a placeholder date. One
>>>     applyCustomerInfo() is the single place customer info lands, so entitlement + details can't drift.
>>>   - HONESTY RULE, live: if a user CANCELS, RevenueCat sets willRenew=false and every surface flips
>>>     "Renews on" -> "Ends on". Saying "Renews" to someone who cancelled would be a lie. (Seen working:
>>>     Justin's cancelled sandbox sub correctly reads "Ends Jul 13, 2026".)
>>>   - SUPPORT SCREEN Supporter state: the pitch (perks + price boxes + CTA) is REPLACED by a membership
>>>     card -- plan / member since / renews-on|ends-on -- plus a "Switch to Annual" ROW for monthly members
>>>     that states the REAL saving (monthly x 12 - annual, computed from live store prices; hidden entirely
>>>     if either price is missing). Mission paragraph + tip jar + restore + legal all stay. NO thank-you
>>>     subline (decided: the mission card above already says it; a third thank-you inside the receipt is sappy).
>>>   - LIVE PRICES everywhere (priceString from the offering). Hardcoded strings would keep showing an old
>>>     price while Apple charged the new one.
>>>   - PLAN CHANGE: monthly -> annual is Apple's own flow via the same purchasePackage call (same subscription
>>>     group). ⚠️ App Store Connect ranking was CORRECTED this session: annual is now Level 1 (higher service
>>>     level), monthly Level 2, so switching is an UPGRADE = takes effect immediately + Apple credits the
>>>     unused part of the current month. Before the swap it was a downgrade (deferred to next renewal).
>>>     NOT yet device-tested (Justin was mid-lapse) -- test a monthly->annual switch in sandbox.
>>>   - PROFILE + SETTINGS membership rows: replaced by ONE shared components/MembershipCard so they can't
>>>     drift. Supporter = foil hallmark + Bebas title + a MONTHLY/ANNUAL pill + the real date. Free = the same
>>>     object in the user's accent. Both TINTED (champagne / accent) -- a plain card fill made the free card
>>>     the same color as its container on Settings (a settings section IS a card) and it vanished on
>>>     Slate/Warm/Blush. Killed the old amber sprout + the "Active Supporter" placeholder line.
>>> THE GOLD SYSTEM (components/SupporterFoil.tsx = the ONE source of truth; do not re-define gold anywhere):
>>>   - GOLD IS A MATERIAL, NOT A COLOR. It only reads as gold when a light-to-dark gradient fakes a specular
>>>     highlight. There is NO flat hex that reads as gold -- painted flat on a light card it is, literally,
>>>     mustard (we shipped that, it was). So gold appears ONLY as gradient surfaces: FoilChip (the hallmark)
>>>     and FoilEdge (the struck edge on a card), plus GOLD_TINT (a champagne wash = a tint of the card, never
>>>     a gold fill). Never flat gold text, never a flat gold fill.
>>>   - THE RULE: **gold means MEMBERSHIP. Never a lock, never a paywall, never a price.** The moment gold also
>>>     marks restriction, the badge stops being a thank-you and becomes the color of the thing blocking you.
>>>     Locked states stay neutral + accent. (We built a full-gold $24.99 tip tile, then cut it: it made the most
>>>     expensive ask the loudest object on a page whose whole philosophy is "an option, not a push.")
>>>   - It was previously wearing `theme.accentAmber` -- which is the app's WARNING color. The membership
>>>     surfaces were literally painted in caution paint.
>>> NEW SHARED COMPONENTS (reuse these; don't re-implement):
>>>   - components/SupporterFoil.tsx -- gold constants + FoilChip + FoilEdge.
>>>   - components/MembershipCard.tsx -- the Profile + Settings membership card, both states.
>>>   - components/PrimaryCTA.tsx -- the app's primary solid-fill button standard. See the roadmap item for
>>>     the app-wide rollout task.
>>> STILL OPEN on this track: the Otto free-user nudge wiring; the gold app icon (Justin is making it) and the
>>> "Custom Badge & Icon" perk illustration that depends on it; a monthly->annual sandbox switch test; and the
>>> LAUNCH-ONLY reverts (which are gated behind the PINNED tester-entitlement sequence above).
>>>
>>> ✅ WEBHOOK DONE + VERIFIED 2026-07-12 (session 3). functions/src/revenueCatWebhook.ts (deployed).
>>> URL: https://us-central1-projectj-5d024.cloudfunctions.net/revenueCatWebhook
>>> Emails Justin (dev.harmke@gmail.com, via the same nodemailer/GMAIL_APP_PASSWORD setup the prayer-request
>>> function uses) on exactly TWO events: INITIAL_PURCHASE (new Supporter) + NON_RENEWING_PURCHASE (tip). The
>>> email NAMES the buyer -- app_user_id IS the Firebase uid (client calls Purchases.logIn(uid)), so the function
>>> looks them up in Firebase Auth and includes name + email, which is the whole point (hand-written thank-you).
>>> Subject is flagged [SANDBOX] vs real. Every other event type (RENEWAL/CANCELLATION/EXPIRATION/...) gets a
>>> silent 200 -- deliberate: a renewal email per subscriber per month would train Justin to ignore these.
>>> SECURITY: the URL is public, so the function requires an Authorization header matching the
>>> REVENUECAT_WEBHOOK_TOKEN secret (set via `firebase functions:secrets:set`, same value pasted into
>>> RevenueCat > Integrations > Webhooks). A bad token = 401 + no email (VERIFIED). Email is best-effort and the
>>> function STILL returns 200 -- a non-2xx makes RevenueCat retry, and a Gmail hiccup must not cause a retry storm.
>>> RC dashboard config: Both Production and Sandbox / All apps / All events (we filter server-side); paywall
>>> events OFF (we use our own Support screen, not RC's paywall UI).
>>> VERIFIED: tip -> email (twice, real sandbox purchases) ✅ | INITIAL_PURCHASE -> email ✅ | bad token -> 401,
>>> no email ✅.
>>> ⚠️ GOTCHA THAT WILL BITE THE NEXT PERSON: re-buying the SAME subscription after a sandbox lapse does NOT send
>>> INITIAL_PURCHASE -- RevenueCat sends RENEWAL (you're an existing subscriber resuming), which we ignore by
>>> design, so NO email arrives and nothing is broken. INITIAL_PURCHASE fires only on a customer's FIRST purchase
>>> of that product. It was verified here by POSTing a real INITIAL_PURCHASE payload at the live function (RC's
>>> delivery pipe was already proven by the tips). A full first-purchase-through-RevenueCat run needs a FRESH
>>> sandbox tester account -- worth doing once before launch, not a blocker.
>>> ⚠️ WATCH (not chased, per the 2-attempt rule): a one-off client console error right after a sandbox purchase --
>>> "[RevenueCat] Error fetching offerings ... API request failed with status code 404" (getOfferings). Did NOT
>>> reproduce on a cold launch; purchases, entitlement, and the webhook all worked. Looks like the offerings fetch
>>> firing while the RC session was still settling post-purchase. If it recurs on a CLEAN run, dig in then.
>>>
>>> DONE 2026-07-12 (session 3): ON-DEVICE GAUNTLET COMPLETE -- tip purchase ✅, Restore ✅, LOCKED state ✅
>>> (sub lapsed -> app re-locked; a tip bought while locked did NOT grant entitlement, confirming tips are
>>> correctly outside the `supporter` entitlement). Plus, shipped: EvR locked-card redesign (WHOLE card frosted
>>> incl. the wash -- a partial blur always showed a hard square seam; topic chip from the card id so the subject
>>> shows but never the verdict; quiet "Unlock ->" per card, no repeated pitch); purchase PENDING STATES (spinner
>>> in the tapped control + others dimmed + double-tap lockout on subscribe/tip/restore); Support CTA made premium
>>> (sheen + accent glow + sprout); Stats card buttons (Comparison / Open Analysis / Log Measurements / New
>>> Challenge) moved OFF the solid-blue slab onto the house tinted-button recipe (solid fill is now reserved for
>>> the ONE primary CTA on the Support screen; the graph-creator ADD TO STATS + FAB pills deliberately left solid);
>>> and the "SUPPORTER" gate CHIP was REMOVED app-wide in favor of a lock icon alone -- styled like a badge, that
>>> word read as a status you HAVE rather than a requirement, and it repeatedly made Justin think the app was bugged.
>>>
>>> LATEST STATUS (end of 2026-07-12, session 2) -- READ THIS FIRST:
>>> RevenueCat is BUILT + WORKING. A native dev build was made (react-native-purchases + expo-blur) and a REAL
>>> SANDBOX SUBSCRIPTION was purchased end-to-end on device: sheet appeared, purchase completed, entitlement
>>> granted, isSupporter flipped true, gates UNLOCKED, CTA -> soft "You're a Supporter" thank-you card. All
>>> committed. Sandbox account is jtharmke+SANDBOX@gmail.com (a PLUS alias, NOT hyphen -- the hyphen one failed).
>>> WHAT'S STILL TO VERIFY ON DEVICE (Justin, quick, no rebuild -- pure test): (1) a TIP purchase (tap a tip tile
>>> -> sandbox sheet -> confirm), (2) RESTORE PURCHASES, (3) the LOCKED state -- we only visually confirmed
>>> UNLOCKED; when the sandbox sub lapses (~mins) OR via the dev toggle OFF (only works once no real entitlement
>>> is active), navigate Comparison/EvR and confirm they LOCK, and that the app re-locks when the sub lapses.
>>> WHAT'S NEXT (code/backend, NO client rebuild needed): (A) the WEBHOOK -- a Cloud Function receiving RevenueCat
>>> webhook events (INITIAL_PURCHASE + tips) -> email Justin the new-supporter/tipper info for the hand-written
>>> thank-you; then set the webhook URL in the RC dashboard. (B) POLISH: switch the Support screen price display to
>>> LIVE priceString from the offering (currently hardcoded $6.99/$69.99/tips -- matches, but should be live); the
>>> FULLER Supporter-state screen (hide the price boxes/perks for a subscriber, show plan + member-since + renews-on
>>> from RC customerInfo -- needs the real dates); a missing haptic on the subscribe tap (minor). (C) LAUNCH-ONLY
>>> (do NOT do now, would break current testers): revert beta caps (Otto 100->10/25, Halo 50->25/25, Estimator
>>> 100->5/100) + REPORTS_BETA_OPEN=false + REMOVE the dev toggle (REVERT #2) + the deferred launch-hardening
>>> (App Store Connect API/AuthKey for server notifications+refunds, Apple Small Business Program 30->15%, product
>>> review screenshots, gold alternate app icon, Otto free-user nudge wiring). Full detail below.
>>>
>>> REVENUECAT PREREQS: ALL 5 DONE 2026-07-12 (non-code, in App Store Connect / RevenueCat / Anthropic console).
>>> Config for the code phase (use these EXACT identifiers):
>>>   - Apple Paid Apps Agreement: ACTIVE (W-9 + bank done; DSA/EU trader DEFERRED = app not distributed in EU,
>>>     intentional to keep Justin's home address private; revisit EU later w/ PO box or LLC).
>>>   - Bundle ID: com.jharmke.projectj (locked).
>>>   - App Store Connect PRODUCTS (6): subs `supporter_monthly` ($6.99/mo) + `supporter_annual` ($69.99/yr) in a
>>>     subscription group "Supporter"; consumable tips `tip_pitchin` ($2.99) `tip_addfuel` ($4.99)
>>>     `tip_powerforward` ($9.99) `tip_backmission` ($24.99). Subs show "Missing Metadata", tips "Draft" -- NORMAL
>>>     (not submitted for review; fully usable in sandbox). Product IDs are PERMANENT (tip_1 was burned+deleted).
>>>   - RevenueCat: project "Project J", platform React Native, iOS app on bundle ID above, In-App Purchase KEY
>>>     (P8) uploaded. ENTITLEMENT identifier = `supporter` (2 subs attached, NO tips). OFFERING = `default`
>>>     (packages `$rc_monthly`->supporter_monthly, `$rc_annual`->supporter_annual). Tips are NOT in the offering /
>>>     NOT in the entitlement -- fetch them by product ID in code for the tip jar; badge-for-tippers is app-side
>>>     purchase-history logic, NOT the entitlement (a $2.99 tip must never grant ongoing Supporter perks).
>>>   - Sandbox tester created (email uses a hyphen not a + alias, so not deliverable -- fine, sandbox rarely needs
>>>     verification; remake with a + alias if Apple ever asks).
>>>   - Anthropic console: $50/mo hard cap + email alerts at $25 & $40. NOTE: $50 is a pre-launch backstop; RAISE it
>>>     at real launch to sit above expected real-user spend (launch-blocker recalc).
>>> STILL TO GET for code: RevenueCat PUBLIC API KEY (RevenueCat > Project settings > API keys > iOS public key).
>>> DEFERRED to launch-hardening (tracked, not missed): App Store Connect API key (AuthKey -- enables price sync +
>>> refund handling + Apple->RevenueCat server notifications); product review screenshots/metadata for App Review;
>>> ⭐ APPLE SMALL BUSINESS PROGRAM enrollment (30%->15% cut, Justin qualifies, real money -- do before launch).
>>> 5 QUICK VERIFICATIONS Justin to eyeball (flagged 2026-07-12): all 6 prices set; annual duration = 1 YEAR;
>>> availability = all/US; sandbox region = US; `default` offering marked CURRENT.
>>>
>>> STATUS AS OF END OF 2026-07-12 (read this first): **APP-SIDE MONETIZATION IS COMPLETE + REVENUECAT PREREQS DONE.**
>>> Next is the CODE phase (SDK install + real entitlement wiring; needs the native rebuild). See "NEXT UP" item 1.
>>> Finished today, on top of the list below: #5 EvR frosted-glass Supporter lock (ranked feed 1-free/rest-locked
>>> + Patterns fully locked, real expo-blur -> needs a native build); the PERKS QUESTION resolved (support model,
>>> Path A, no new gates -- see OPEN ITEMS #7); ALL SIX Support-screen polish items; MONTHLY summaries decided FREE
>>> (killed the dormant TIPS_GATED lock); and the EXPLAINER SYNC (Otto KB + tooltips, deployed + Otto-verified).
>>> NOTE: several remaining items (Supporter-state screen, badge, membership summary w/ real dates) COULD be
>>> started against the dev toggle but are DELIBERATELY HELD until RevenueCat -- without the real entitlement they
>>> render fake/empty dates, which reads broken and breaks the honest-numbers rule. Do them WITH the RC work.

All work below is COMMITTED. `isPro` is still `__DEV__ || devProUnlocked` everywhere (real entitlement =
RevenueCat, NOT built yet). None of the new locked states show on Justin's dev device (dev forces isPro true) --
they only appear for real free users in a release build.

DONE THIS SESSION (in order, committed):
1. COACH INSIGHT = FREE everywhere. Removed the 3 Coach Insight "PRO" locked branches (weekly-summary,
   monthly-summary, diagnostic-report-view). Coaching is free for all, permanently.
2. PRO -> SUPPORTER user-facing rename COMPLETE. Gate chips (Day-vs-Day, Patterns, Monthly-Summaries-in-Stats)
   now read "SUPPORTER"; estimator modal + Day-vs-Day toast reworded. Left alone on purpose: settings.tsx
   dev-toggle label (dies at launch) + reports.tsx code comments (not user-facing).
3. ESTIMATOR (B): killed the out-of-estimates POPUP -> calm INLINE card (app/ai-meal-estimator.tsx). FREE:
   "You've used all your free estimates this month." / "Your free batch refreshes on [reset date]." / tappable
   "Become a Supporter to keep going ->". SUPPORTER (hit 100): "You've used all your estimates this month." /
   "They refresh on [reset date]." / no link. No lock icon. Dead popup code removed.
4. OTTO/HALO cap messages name the assistant (killed "It" -> "Otto resets tomorrow" / "Halo resets tomorrow" on
   both the 0-left and 1-left lines). Otto FREE-USER nudge copy LOCKED but PARKED (wiring needs the real
   entitlement -- Otto has no free-vs-Supporter awareness yet): "Supporters get more time with Otto each day.
   Become a Supporter ->". Halo NEVER gets a nudge (faith not upcharged). Full detail in CAP-REACHED COPY section.
5. COMPARISON now WHOLE-tool Supporter-locked (was only the Day-vs-Day mode). Screen-level guard in
   comparison-report.tsx (covers the Stats card button AND the FAB shortcut) + Stats "Comparison" card gets a
   SUPPORTER chip and its button -> "Become a Supporter" routing to /support. Support-page perk renamed
   "Day-by-Day" -> "Comparison" with new copy ("Pick your time frames, line them up side by side, and see exactly
   how you compared.") + swap-horizontal icon. Locked-screen copy: "Comparison is a Supporter feature" + that same
   line + "Become a Supporter ->".
6. REPORTS (C): screen-level locked state in reports.tsx, DORMANT behind REPORTS_BETA_OPEN (activates when the
   flag flips false with RevenueCat, REVERT #5). Stats "Custom Reports" card gets a SUPPORTER chip + Support route
   (also dormant during beta). Copy: "Custom Reports is a Supporter feature" / "Build your own report from any
   period, with the stats that matter most to you." / "Become a Supporter ->". REPORTS_BETA_OPEN is now EXPORTED
   from reports.tsx and imported into stats.tsx for the card gate.
7. [#5 DONE 2026-07-12] EvR card gating in app/diagnostic-report-view.tsx. Added isPro (__DEV__ ||
   pj_settings.devProUnlocked, same shape as comparison-report.tsx). RANKED diagnostic feed: card 0 free, cards
   1+ locked for free users. "PATTERNS IN YOUR DATA": fully locked for free users (dropped the old TIPS_GATED &&
   idx>0 path; removed the now-unused TIPS_GATED import). Coach Insight headline stays free (untouched). New shared
   LockedInsightCard: crisp header label + real title on top, REAL body content frosted behind a REAL expo-blur
   BlurView (tint = 'dark' only on the Dark theme, else 'light'), lock + SUPPORTER chip, centered "Become a
   Supporter to unlock ->", whole card taps to /support. NO gray-skeleton shell. Tutorial mode always shows all
   cards (evr_card_0 spotlight unaffected). CHOSE REAL FROSTED GLASS over a pure-JS faux-blur (Justin's call) ->
   added expo-blur (native) so this needs a NEW DEV BUILD; rides along with the RevenueCat build coming next.
   Locked states are invisible on Justin's dev device (isPro forced true) -- only render for real free users once
   RevenueCat lands. tsc-clean (no new errors in the file). Frosted glass is EvR-specific: the other Supporter
   gates (comparison/reports) are full-screen door gates with no inline content to frost.

NEXT UP (EXACT ORDER -- start at the top):
1. [REVENUECAT BLOCK -- NEEDS JUSTIN'S NON-CODE PREREQS FIRST. Justin wants to do these TOGETHER, ONE STEP AT A
   TIME, walked through. FULL corrected list (the old one was incomplete):
     (a) APPLE PAID APPS AGREEMENT -- sign "Agreements, Tax, and Banking" in App Store Connect (banking + tax).
         HARD BLOCKER: no IAP works at all, not even in sandbox, until this is active. This was MISSING from the
         original prereq list.
     (b) APP STORE CONNECT PRODUCTS -- note "1 sub" is really TWO SKUs in one subscription group: Supporter
         Monthly $6.99 + Supporter Annual $69.99, PLUS 4 consumable tips ($2.99/$4.99/$9.99/$24.99) = 6 products.
     (c) SANDBOX TESTER account (Users and Access > Sandbox) for the buy/restore/tip test.
     (d) REVENUECAT ACCOUNT + dashboard config: connect to App Store Connect (IAP key + app-specific shared
         secret), create the ENTITLEMENT (e.g. "supporter"), create an OFFERING, attach all 6 products.
     (e) ANTHROPIC hard monthly spend cap + usage alerts (~50%/80%) in the console (launch blocker).
     ALSO CONFIRM: the App Store Connect app record has IAP capability enabled (app record exists via TestFlight,
     but IAP is a separate checkbox -- verify when starting).]
   #6 RevenueCat SDK -> real entitlement.
   >> DONE 2026-07-12 (committed, tsc-clean, INERT until the native rebuild):
      - react-native-purchases installed (autolinks, no config-plugin entry needed). Needs a native EAS build.
      - config.ts: REVENUECAT_IOS_KEY (appl_ERlhWDvhjeFzEczUcOgBiOyAGER, public) + SUPPORTER_ENTITLEMENT_ID='supporter'.
      - MembershipContext.tsx (NEW): configures RC once, Purchases.logIn(firebase uid) for cross-device restore,
        reactively tracks the 'supporter' entitlement, exposes useMembership()->{isSupporter, loading, refresh}.
        Keeps a __DEV__-ONLY override that reads pj_settings.devProUnlocked so the Settings dev toggle still lets
        Justin test free-vs-Supporter without a purchase. HEAVILY GUARDED: cannot crash the current build (no
        native module yet) -- isSupporter just falls back to the dev override/false. Wired into app/_layout.tsx
        inside AuthProvider.
      - GATES MIGRATED to useMembership().isSupporter (aliased to isPro): comparison-report, stats (Comparison+
        Reports), diagnostic-report-view (EvR frosted cards), reports, ai-meal-estimator (quota tier, remaining
        recomputes via an isPro-keyed effect). Membership STATUS rows on profile + settings also read isSupporter.
        The Settings dev toggle STAYS (it's the __DEV__ override; REMOVE at final launch = REVERT #2).
   >> STILL TODO in #6: nothing code-side until the native build verifies it. Then wire the Otto free-user nudge.
   #7 [DEFERRED TO THE LAUNCH BUILD, do NOT do now] revert beta caps (Otto 100->10/25, Halo 50->25/25, Estimator
   100->5/100) + set REPORTS_BETA_OPEN=false. REASON: flipping these before the purchase flow is live would drop
   current TestFlight testers to the low real caps / lock Reports with NO way to upgrade -- breaks the beta. These
   land in the actual launch build alongside the working purchase flow.
2. #8 purchase flow + RevenueCat webhook -> Cloud Function -> email Justin the new-supporter/tipper details.
   >> CLIENT PURCHASE FLOW DONE 2026-07-12 (pure JS on the installed SDK, NO extra native build):
      MembershipContext exposes offering/tipProducts + purchasePackage/purchaseTip/restore (all guarded).
      Support screen wired: Become-a-Supporter buys the selected monthly/annual package (offering.monthly/.annual);
      the 4 tip tiles buy their consumables (config TIP_PRODUCT_IDS); Restore restores; CTA shows "You're a
      Supporter" when entitled. Toasts on success/error, silent on user-cancel. Prices still displayed hardcoded
      ($6.99/$69.99/tips) -- matches the store; switching to live priceString is a polish follow-up.
   >> STILL TODO: the WEBHOOK (backend, no client build) -- a Cloud Function that receives RevenueCat webhook
      events (INITIAL_PURCHASE / NON_RENEWING_PURCHASE for tips) and emails Justin the new-supporter/tipper info
      for the hand-written thank-you; then set the webhook URL in the RevenueCat dashboard. Do this AFTER the
      native build verifies sandbox purchases actually fire (the webhook triggers on those events).
3. #9 Support screen "You're a Supporter" state (can start against devProUnlocked now; finalize plan/dates w/ RC).
4. #10 Supporter badge (gold sprout + avatar ring via HeaderAvatar; gold alternate app icon needs a rebuild).
5. [#11 EXPLAINER SYNC DONE 2026-07-12, device-verified via Otto] Otto KB (assistantAppKnowledge.ts) +
   tooltipRegistry.ts updated for all current gating wording + REDEPLOYED (appCompanion). Fixes: whole Comparison
   tool is Supporter (was "day-vs-day only"); EvR deeper cards + Patterns Supporter, Coach Insight free;
   Day/Weekly/Monthly summaries + coaching explicitly FREE; estimator tooltip 3/Pro30 -> 5/Supporter100; comparison
   tooltip drops stale free/Pro tags. tutorials.ts had no pricing refs (nothing to change). 8 Otto test Qs all
   passed. REMAINING under #11: a small explainer touch-up once the RevenueCat-dependent copy lands (Supporter-state
   screen, real dates). #12 Full QA (5 themes + accents, Mindful, 3 faith tiers, free vs Supporter on a real device
   incl. the sandbox buy/restore/tip test) still pending -- do with the RevenueCat build.
   >>> APP-SIDE MONETIZATION IS COMPLETE as of 2026-07-12. Everything left on the track needs RevenueCat + Justin's
   Apple/RC prereqs (the sit-down session): items 1-4 above + #12 QA.

OPEN NOTES / IDEAS -- DO NOT LOSE:
- SUPPORT-SCREEN VISUAL PUNCH LIST (separate polish task, NOT started): DELETE the hero leaf at the top of
  app/support.tsx; the "Custom Badge & Icon" PERK icon is currently a LEAF but should be the GOLD SPROUT
  (components/SproutIcon.tsx) since the badge IS a sprout, not a leaf; plus mission paragraph, tip tiles, bottom
  padding (see "NEXT SESSION -- OPEN ITEMS" below).
- 2 EvR BUGS parked in roadmap NEXT UP (handle AFTER monetization): (a) EvR Coach Insight may be rendering the RAW
  deterministic template instead of the AI voice (flagged from a 2026-07-12 report); (b) ranked diagnostic card
  body copy is "word slop," needs a clarity rewrite.
- [RESOLVED 2026-07-12] MONTHLY-SUMMARY gating -> MONTHLY IS FREE, same as Day + Weekly. Killed the dormant
  TIPS_GATED lock branch in stats.tsx renderMonthlyCard (removed the now-dead TIPS_GATED import there too); the
  monthly-summary SCREEN was never gated. Rationale: gating a free-to-run recap is the thin/petty gate Path A
  rejects, and free daily/weekly + paid monthly was inconsistent. SPEC_monthly_summary.md's "entire surface is
  Pro-gated" line is overridden by this. Day / Weekly / Monthly summaries are all FREE, permanently.
- DEAD CODE (harmless, cleanup later): the old Day-vs-Day-only gate INSIDE comparison-report.tsx is now unreachable
  (whole tool locked at entry). Left in place to keep the change small.
- KNOWN PRE-EXISTING (not ours): app/(tabs)/stats.tsx has 4 TouchableOpacity+ref tsc errors (confirmed present
  before this session's edits). All our edits are tsc-clean.

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
     Comparison (the WHOLE tool -- all period presets AND Day-vs-Day): free locked, Supporter on. (EXPANDED
     2026-07-12 from just Day-vs-Day to the entire Comparison feature; gated at the comparison-report screen +
     the Stats entry card. Built 2026-07-12.)
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
     then set aside). Tip section header (reworded 2026-07-11 to fit the card's eyebrow+heading format, matching the
     Supporter card's "Support monthly"): eyebrow "Support once" + heading "A one-time chip in" (was the earlier
     "Or chip in one time"). No features attached, pure gratitude.
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
     + short description), header "As a thank you, Supporters get:"
       * More AI Room -- big bumps to your Otto and meal-estimate limits.
       * Custom Reports -- built from the stats that matter most to you.
       * Comparison -- pick your time frames, line them up side by side, and see exactly how you compared.
         (RENAMED 2026-07-12 from "Day-by-Day"; the perk is the WHOLE Comparison tool, not just day-vs-day.)
       * Custom Badge & Icon -- a token of thanks for helping keep this going.
     (Halo deliberately NOT listed as a perk -- faith is not upcharged. It IS already named in the why paragraph
     ("the smarts behind Otto and Halo"), so faith is not omitted. A separate "faith stays free for everyone"
     mission line was considered and DROPPED 2026-07-11 as forced; someday-maybe it could live as a small line at
     the bottom of the screen, not now. Price display (LOCKED 2026-07-11): show just the two
     prices "$6.99/month" and "$69.99/year", NO discount callout (no "2 months free", no "save $X" -- too salesy
     for the humble vibe). Button "Become a Supporter". A standard Apple-required "Restore Purchases" link sits at
     the bottom of the screen.)
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

## NEXT SESSION -- OPEN ITEMS (Support screen live-review + the perks question, 2026-07-11)
The Support the Mission screen (app/support.tsx) is BUILT + on-device tested. Below is Justin's live-review
feedback. NONE of it is coded yet (only the committed screen exists). Address these next session.

VISUAL / POLISH (agreed -- just need building):
1. [DONE 2026-07-12] DELETED the hero leaf icon at the top of the screen. Title "Support the Mission" stays.
2. [DONE 2026-07-12 -- SPROUT, not the medal] SPROUT ICON. REVERSED the earlier "use Ionicons medal for the perk
   row" call: now that components/SproutIcon.tsx exists (the medal was only a stand-in because the sprout didn't),
   the "Custom Badge & Icon" perk row renders the REAL SproutIcon -- it previews the exact badge you get, which is
   more honest than a medal. Wired via a `sprout?: boolean` flag on the Perk type (other 3 rows stay Ionicons).
   Rendered at size 20 (Ionicons rows are 15, but the sprout art has more internal whitespace so it needs to be
   bigger to match visual weight in the 30x30 tile). Also recentered SproutIcon globally: viewBox x-origin 0 ->
   -1.2 (the big left leaf made it read left-of-center) -- improves the Settings + Profile rows too. COLOR = AMBER
   (t.accentAmber) is a DELIBERATE PLACEHOLDER, same as the Settings/Profile rows; the REAL GOLD is defined ONCE
   with the badge system (checklist #7 / roadmap #10) and flips all three sprouts together. Do NOT introduce a
   one-off gold here -- it would leave a half-gold/half-amber inconsistency until the badge work.
   >> SPROUT SVG BUILT 2026-07-11: components/SproutIcon.tsx -- an asymmetric "reach" sprout (variant C, Justin-
   approved from a 4-way visual preview), size + color props, scales down to ~15px. Rendered in the Membership
   settings row, Profile entry, AND the support-screen perk row, all in amber (real gold comes with the badge
   system).
3. [DONE 2026-07-12] MISSION PARAGRAPH treatment. Wrapped in a full amber-bordered soft card (borderWidth 1,
   accentAmber+'66' border, accentAmber+'10' wash -- verse-card family). Justin rejected the left-rule-only look;
   full border chosen. Added a centered amber caps header "The Promise" (missionTitle). Body bumped Regular ->
   Medium (DMSans_500Medium), CENTERED (Justin's call, over the readability caution), with 3 key phrases bolded in
   AMBER for warmth + rhythm ("they stay free", "the AI", "a little support"). Final thank-you sentence pulled out
   as a centered amber sign-off (missionClose). Warmth comes from the amber emphasis + closer, NOT a full-amber
   body (kept textSecondary for contrast/readability). Copy unchanged. NOTE: locked copy still says "a little
   support keeps IT alive" -- flagged to Justin (violates the new no-"it"-for-the-app rule) but left pending his
   reword call.
4. [DONE 2026-07-12] TIP CARD subline added under "A one-time chip in" (styles.sub, parity with the monthly card):
   "No subscription, no commitment. Every bit helps." (no "it").
5. [DONE 2026-07-12] TIP TILES redone as a 2x2 GRID (Justin's call) -- all four equal-size tiles (flexBasis 47%
   wrap), same label+amount format, tightened padding (killed the 2-line dead space). "Back the mission" $24.99 is
   now a 4th tile, kept GOLD (amber bg/border/label/amount) as an option not a push (dropped its leaf icon + the
   old full-width hero). The 3 blue tip AMOUNTS use textSecondary (match the subscription prices); only the gold
   amount stays amber (Justin's option B). All 4 tiles + the 2 subscription price boxes now share the PressScale
   press-scale animation (0.97 timing, generalized with a wrapperStyle prop so it works in the flex-wrap grid);
   tiles already had Medium haptic + coming-soon toast, so the buy-wire just swaps the handler later.
6. [DONE 2026-07-12] OTTO FAB padding: scroll paddingBottom 40 -> 100 so the App Store disclaimer clears the FAB.
   >> ALL SIX SUPPORT-SCREEN POLISH ITEMS DONE 2026-07-12. Pure JS. Remaining Support-screen work is the
   SUPPORTER-STATE (needs RevenueCat) + real purchase wiring.

STRATEGIC -- THE BIG OPEN QUESTION (resolve BEFORE finalizing the Supporter card, it changes the content):
7. [RESOLVED 2026-07-12] THE SUPPORTER PERKS FEEL NOT WORTH IT -> answered by committing to the SUPPORT model
   (the "Path A" the app was already on). DECISION: we do NOT hunt for more features to gate. Justin's own
   reasoning locked it: the only thing FAIR to charge for is the thing that COSTS money to provide (the AI --
   real dollars per Otto msg / meal photo), because gating a free-to-run basic like the barcode scanner is the
   scummy MFP move he refuses. So the tier is honestly "AI headroom + a real thank-you," with Reports/Comparison
   as small bonuses riding along, NOT the reason. Consequences accepted: (a) perks don't need to feel "worth it"
   on feature-value -- that pressure is gone; (b) the pitch is "help keep this alive," not "unlock these"; (c)
   MOST people won't pay and that's the DESIGN, supporters carry it on goodwill. REFINEMENT INSIDE PATH A (not a
   new gate): on the Support screen make the AI perk read as the clear HERO and make the recognition/thank-you
   feel genuinely good -- that's how A lands without adding anything. NOTE: nothing structural changes in code
   (the app was already Path A); this decision just CLOSES the "find a 4th perk" rabbit hole and unblocks the
   Support-screen polish. Original problem statement kept below for context.
   -- THE FEEL NOT WORTH IT (original): Custom Reports + Day-by-Day "don't move the needle." Root cause
   = the 95%-free-BY-DESIGN model leaves very little to gate, so the paid perks are inherently thin (AI room +
   Reports + Day-vs-Day). REJECTED: "early access" as a bolt-on perk (do NOT re-propose). AI is already the first
   perk. This needs a REAL answer, not a cosmetic reshuffle. Levers still on the table: (a) genuinely
   strengthen/repackage the AI value as the hero; (b) find something that can legitimately join the tier without
   breaking the generous-free philosophy; (c) accept thin perks and make the MISSION + recognition the real draw
   (the original thesis -- support, not a feature unlock). This is the crux to solve first next session.

---

## CURRENT STATE IN CODE (re-verified 2026-07-27 -- THE MONEY LAYER IS BUILT)

⚠️ **The section below this line was written 2026-07-10 and went stale.** It said there was no purchase
system at all, which sent a whole session down the wrong path on 2026-07-27 -- Claude read it, told Justin
he had no way to take money, and Justin (correctly) pushed back that he thought it was built. It is.
**Verify against the code before trusting any "current state" note in this file.**

WHAT IS ACTUALLY BUILT (2026-07-27):
- `react-native-purchases` (RevenueCat) is a real dependency and is configured at runtime.
- `MembershipContext.tsx` is the live membership layer: `Purchases.configure`, `getOfferings`,
  `getProducts`, `purchasePackage` (the subscription), `purchaseTip` (consumables), `restore`, plus a
  graceful no-op path for when the native module isn't present (before a rebuild).
- FOUR consumable tip products exist, low -> high, in `config.ts` as `TIP_PRODUCT_IDS`:
  `tip_pitchin`, `tip_addfuel`, `tip_powerforward`, `tip_backmission`.
- `app/support.tsx` is the Support screen, wired to all of the above.
- Prices are NOT in the codebase -- they live in App Store Connect per product.

WHAT ACTUALLY REMAINS is the launch checklist, not construction: products + prices configured in App Store
Connect, the `devProUnlocked` override and toggle removed, and the raised TestFlight caps reverted. See
REVERT BEFORE LAUNCH in the roadmap.

--- historical, from 2026-07-10, KEPT ONLY FOR THE REASONING; the state claims are WRONG now ---
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

2. SUPPORTER / MEMBER (**PRICE LOCKED 2026-07-28: $9.99/month, $89.99/year**): the ONLY recurring paid tier.
   Reframed as "Support the Mission." Perks (a thank-you, not the reason):
   PRICE RATIONALE (from the unit-economics pass run 2026-07-28 -- see COST MODEL section below):
   - Raised from $6.99/$69.99. At $6.99 the app needed ~8-9% of active users subscribing just to cover its own
     AI bill; $9.99 drops that to ~6%. Typical for a soft "support the mission" pitch is 1-5%, so this does not
     fix the model on its own -- it buys headroom while the free-tier caps get sorted.
   - ANNUAL IS DELIBERATELY CHEAP relative to monthly (25% off, "three months free", not the old 17%). An
     annual subscriber nets ~$70 upfront and guaranteed; a monthly subscriber nets $6.99 and churns in ~4-6
     months, so realistically collects $28-42. Annual is worth roughly DOUBLE. The discount exists to steer
     people into the plan that actually sustains the app, not to be consistent with the monthly price.
   - $89.99 also stays under the $100 psychological wall, which matters more for a purchase framed as SUPPORT
     than for a tool someone needs. Confidence on that specific point is moderate, not high -- revisit with
     real conversion data.
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
   [ADDED 2026-07-27: a fifth tip, `tip_founder` at $49.99, labelled "Founder". The GOLD FOIL MOVED to it
   from "Back the mission" -- two gold tiles mark nothing. Apple allows no open-ended/user-entered amount
   (fixed price points only), so a higher fixed tier IS the answer to "someone wants to give more".
   ✅ **DECIDED 2026-08-02, NO LONGER OPEN: tips grant nothing in-app BY DESIGN.** `purchaseTip` runs the
   purchase, shows a thank-you toast and stores nothing -- no badge bump, no record -- and that is deliberate.
   Justin gets the purchase notification emails and thanks people DIRECTLY by email. When that stops scaling
   it is a good problem and gets solved then.
   ⚠️ The email is OUTSIDE the app, so it does not change what the purchase grants. **Read Apple's actual
   tipping guideline wording before submission** rather than assuming -- tips granting nothing is normal, but
   do not take that from anyone's memory.]
   - OPTIONAL FUTURE: a recurring "Patron" tier (higher price, SAME perks + a shinier badge/recognition),
     framed as gratitude not features, self-selected. Lead with the one-time tip first; only add Patron if
     there's demand. Do NOT ship an arbitrary higher feature tier.

## COST MODEL / UNIT ECONOMICS (run 2026-07-28 -- THE UNCOMFORTABLE ONE, read before touching caps)
⚠️ ESTIMATE, NOT MEASUREMENT. Prompt sizes and API pricing are real; per-user usage frequency was assumed.
The single number that decides whether this app is viable is AVERAGE AI CALLS PER ACTIVE USER PER DAY, and it
has never been measured. TestFlight users are generating it right now -- pull it from the Anthropic console
and the Cloud Function logs before acting on anything in this section.

WHAT WAS MEASURED (real):
- Otto's knowledge base (functions/src/assistantAppKnowledge.ts) is ~72KB, roughly 18,000 tokens, sent on
  EVERY message. Halo's (faithSystemPrompt.ts) is ~14KB.
- Otto + Halo run on Haiku 4.5 ($1 in / $5 out per million tokens). AI Meal Estimator + Smart Coach run on
  Sonnet ($3 / $15).
- Prompt caching IS wired up on both companions (cache_control present in appCompanion.ts + faithCompanion.ts).
- ✅ CHECKED 2026-07-28, and the answer is "mostly fine, don't chase it":
  OTTO IS TEXTBOOK CORRECT. appCompanion.ts splits `system` into a stable block (identity + rules +
  ASSISTANT_APP_KNOWLEDGE) carrying cache_control, and a volatile block (user context + data snapshot)
  placed AFTER it, uncached. That is exactly right for a prefix-match cache, and Otto is the expensive one
  (~18k tokens/message vs Halo's ~2.6k). No change needed.
  HALO SITS ON THE THRESHOLD. Haiku 4.5 will not cache a prefix under 4,096 tokens -- silently, no error.
  Measured: BASE 2,351 tok + ROOTED 78 + FAITH_ACTIONS 216 = ~2,645 tok with NO catalog (below the line,
  does not cache); with FAITH_CONTENT_RULES + a full 6,000-char catalog it reaches ~4,519 tok (above the
  line, does cache). The cutoff lands at roughly a 4,300-char catalog, so whether Halo caches depends on
  what the CLIENT sends that request. Two consequences: (a) it is unpredictable, and (b) the catalog lives
  INSIDE the cached block, so any variation between requests splits the cache into separate entries and you
  pay writes without collecting reads.
  NOT WORTH FIXING FOR COST. Halo is ~2.6k input tokens on Haiku -- about a quarter of a cent a message.
  Perfect caching saves ~$0.0024/message. Real, but ~1/7th of Otto's per-message input cost, and Otto
  already caches. Revisit only if Halo's prompt grows or its cap goes up.
  ⚠️ THE COST MODEL BELOW ALREADY ASSUMED CACHING WORKS. This check did not make the numbers better or
  worse -- it confirmed there is no hidden savings hiding behind a caching bug.

WHAT WAS ASSUMED (light usage -- deliberately generous to the model):
~3 companion conversations/week at ~3 messages each (~36 messages/month), 2 meal estimates/month, Smart Coach
weekly. NOTE: the free caps ALLOW 1,050 companion messages/month (Otto 10/day + Halo 25/day). So the model
assumed users consuming 3-4% of what they are permitted.

THE RESULT: ~$0.40/month per active user (~$5/year). A user who MAXES the free caps costs ~$6.40/month --
more than a Supporter pays. At 5% of installs still active at day 30 and 3% of those subscribing, EVERY
install scenario from 300 to 25,000 loses money, and the losses grow with scale:
  300 installs -> -$171/yr | 1,500 -> -$342 | 4,000 -> -$707 | 8,000 -> -$1,375 | 25,000 -> -$4,168
(those were computed at the OLD $6.99; $9.99 improves them but does not flip any of them positive)

SENSITIVITY IS BRUTAL: at 5 companion messages/day -- still only ~15% of the cap, a totally ordinary number --
cost goes to ~$1.80/month/user, 4.5x the estimate, and break-even conversion passes 25%. The model above is
the GENEROUS version, not the pessimistic one.

THE ACTUAL PROBLEM: this is not a pricing problem, it is a COST-PER-FREE-USER problem. Cost scales with ALL
users; revenue scales with the ~3% who pay. Every free user costs ~$5/year and returns nothing. Halo at
25/day for EVERY free user is the single most expensive line in the app and is deliberately never paywalled
-- that is a values decision, not an economics one, but it should be made with this number visible.

TIPS ARE NOT A REVENUE STRATEGY, CONFIRMED: at 25,000 installs, with generous assumptions (5% of actives
tipping once a year, ~$6 average), tips produce ~$262/year after Apple's cut. Real, meaningful as a gesture,
noise against a $6,000 cost base, and non-recurring.

NEXT STEP IS MEASUREMENT, NOT MORE DECISIONS. Then the caps conversation (levers 1-3: Halo's free cap, the
caching fix, and free cap levels generally). Price was lever 4 and is done.

## NON-AI SUPPORTER PERKS (✅ **EVERY NUMBER LOCKED 2026-08-01** -- this table is now the source of truth)

WHY THIS EXISTS. Justin's long-standing worry -- "there isn't a huge reason to buy a Supporter plan because
there isn't much behind the paywall" -- was still true. The unit-economics pass on 2026-07-28 made it urgent
for a second reason: the whole subscription case rested on AI, and AI is the one thing that COSTS money to
deliver. Gating more AI saves cost but shrinks the product. These perks do the opposite: they cost NOTHING
per user to serve, so every one of them adds subscription value with no bill attached. That is the point.

THE ORGANISING RULE, and Justin's own instinct on it: **LIMIT, don't paywall.** Free users get a generous
amount and hit a wall once they are invested. Someone who has built 20 custom foods has a real reason to
pay; someone who was never allowed to build one never discovered why they would want to. Limits also read
as fairer -- you got to use the thing, you just used a lot of it. That is the difference between a
conversion moment and a wall people bounce off.

THE OTHER LINE, from the same conversation -- capping CREATION is normal and nobody blinks (every major
fitness app does it). Restricting access to data a user already logged is hostile and would be read as
hostile. Everything below caps creation. Nothing below touches anyone's existing data.

⚠️ **THE NUMBERS BELOW REPLACE AN EARLIER TABLE THAT WAS WRONG IN TWO PLACES AND INCOMPLETE IN THREE.** Meal
slots said 4 and stats cards said 1; both were read as bare TOTALS, which culls what every user already
starts with. Saved meals, saved routines and saved programs were missing entirely. Walked one by one with
Justin on 2026-08-01. **On downgrade, every row is either GRANDFATHERED or REVERTS -- see the column.**

| Perk | Free | Supporter | On downgrade |
|---|---|---|---|
| Custom foods | **20** | Unlimited | **Grandfathered** |
| Saved meals | **5** | Unlimited | **Grandfathered** |
| Custom recipes | **5** | Unlimited | **Grandfathered** |
| Saved routines (sets of exercises) | **5** (presets excluded) | Unlimited | **Grandfathered** |
| Saved programs (7-day schedules) | **3** (presets excluded) | Unlimited | **Grandfathered** |
| Custom exercise library entries | **15** | Unlimited | **Grandfathered** |
| Meal slots | **5** (4 defaults + 1 of your own) | 8 | **REVERTS**, extras dormant |
| Stats graph cards | **7 defaults + 1 of your own** | Unlimited | **REVERTS**, extras dormant |
| Custom macro goals | Presets only (High Protein / Balanced / Low Carb / Performance) | Custom split | n/a |
| Custom nutrition goals | Presets only | Custom | n/a |
| Data export | None | Yes | n/a |

**THE TEST FOR WHICH CATEGORY A THING IS IN:** *did you make it?* -> grandfathered (foods, saved meals,
recipes, routines, programs, exercises). *Is it the shape of a screen?* -> reverts (meal slots, stats cards).
Five grandfather, two revert, and **nothing is ever deleted in either case**.

⚠️ **WHY LAYOUT CANNOT BE GRANDFATHERED TOO.** If it were, the layout caps would never apply to anyone who
had ever subscribed -- including everyone who takes the 7-day taste -- so they would only ever affect users
who never tried it. That is backwards. Content has no such problem: 40 custom foods sitting in a list cost
nothing to leave there, and taking away things someone MADE reads as hostile in a way a screen returning to
its free shape does not.

**PER-ROW NOTES FROM THE 2026-08-01 WALK-THROUGH:**
- **Custom foods 20 -- and 20 is SAFE, for a reason worth keeping.** A logged entry stores its own nutrition
  inline (name, cal, protein, carbs, fat, per-100g), so **deleting a custom food cannot damage anything
  already logged**. At the cap you delete one you no longer use and carry on; history is untouched. The cap
  therefore never hard-blocks logging, which is what would make people leave rather than pay.
  ⚠️ Do NOT raise this to "be generous". A cap nobody reaches converts nobody -- hitting it after a couple of
  months of real use IS the design working. Justin, 2026-08-01: "I WANT free users to hit these limits."
  Equally do not drop it much lower: the wall must land AFTER someone is invested, or they leave before they
  ever got value.
- **Saved meals 5.** The cheapest thing on the list to create (one tap from a logged meal), so it is the cap
  most users will meet FIRST, possibly in week one. Either the earliest conversion trigger or the earliest
  wall -- worth watching on real users, not worth changing now.
- **Saved meals vs recipes are genuinely different things**, checked in code: a saved meal is a snapshot of a
  meal already logged (clones exact items, no maths); a recipe is built from ingredients with yields and
  per-serving division. Two caps of 5, not one cap of 10 wearing two hats.
- **Routines 5, programs 3 -- and they are NOT the same thing.** A **routine** is a saved set of EXERCISES;
  loading it puts lifts on a day. A **program** is a saved 7-DAY SCHEDULE -- weekday type, focus label,
  muscle line, colour, tags -- and **carries no exercises at all** (every preset's days have empty exercise
  lists). Programs get 3 because most people have one, maybe two for a cut/bulk swap; five would be a cap
  nobody meets.
  ⚠️ **The built-in presets are seeded into the SAME list as the user's own** (`pj_my_programs`, marked
  `createdAt: 0`). The cap must count only user-created ones or everybody starts at the cap on day one.
- **Not cappable, do not try:** the **weekly template** (you only ever have one; loading a program replaces
  it) and per-date programs (one per calendar day).
- **Exercise library 15** is 15 CUSTOM entries on top of the 79 built-ins, going to ~143 after plan item J.
- ⚠️ **BUILD NOTE: cap CREATION only, never LOADING.** A free user holding 10 grandfathered routines can
  still load all 10. Gating the load action would break the "cap creation, never access" rule, and it is an
  easy mistake to make while implementing.

NUMBERS LOCKED 2026-07-28 (revisit once there is real data on what people actually create). The rule they
were set by: **the limit should bite the COMMITTED user, never the casual one.** A casual user hitting a
wall is someone annoyed who was never going to pay; a committed user hitting one is invested and it is a
real conversion moment. Aim for roughly the top 10-20% of users reaching each.

WHY EACH NUMBER:
- CUSTOM FOODS 20. The only limit on this list where hitting the wall degrades the CORE JOB of the app
  rather than removing a nicety: anyone who cooks at home or shops regionally hits missing database entries
  constantly, and without custom foods they cannot log accurately at all. Justin opened at 10-15, Claude
  argued 30 then 20; 20 agreed. **Do not take this below 15** -- 10 could be gone inside a fortnight for a
  real home cook, and at that point the app stops doing the thing it exists to do.
- CUSTOM RECIPES 5. Failing here is an inconvenience, not a blocker: ingredients can always be logged
  individually. Far more effort per item so far fewer get made.
- CUSTOM EXERCISES 15. Justin's call over Claude's 10, and his reasoning was better: a frequent lifter with
  a few specific machines burns 10 quickly.
- CUSTOM STATS GRAPHS 1. The app already ships SEVEN default graph cards (Weight, Calories, Macros, Steps,
  Active Calories, Sleep, Workout Frequency) plus six system cards, so free users are already well covered.
  Anything beyond those is a niche metric by definition. One free lets someone build it, see the value, and
  want a second. Zero would be a hard paywall and would lose that moment.
- MEAL SLOTS 4 (a full paywall on extras, Justin's instinct, agreed). Four covers virtually everyone and all
  four are renameable, so free users still get customisation -- just not more slots. The least core item on
  the list.

⚠️ **EVERY LIMIT IS CONCURRENT, NOT LIFETIME.** It counts how many you HAVE right now, not how many you
have ever created. Delete one and the slot frees up.
  WHY, because "they could just delete and rebuild" looks like abuse and is not: the value of the paid tier
  is seeing MANY AT ONCE. Someone swapping their single graph between Recovery and Fiber still only ever
  sees one; a Supporter sees five simultaneously. Swapping is also high-friction (rebuild the whole config
  each time) and nobody sustains that to dodge $9.99.
  THE LIFETIME MODEL HAS A GENUINELY BAD FAILURE: build a graph, mistype the label, delete it to start over,
  and you can never build another. That earns an angry one-star review and the user would be right. Same
  logic kills it for custom foods -- deleting a food you entered wrong must not permanently cost a slot.
  It is also the only model consistent with the downgrade rule below ("removes the ability to create, never
  the thing itself"); a lifetime count has no coherent answer to what "over the limit" means.

TWO CARVE-OUTS THAT ARE NOT ARBITRARY:
- CUSTOM CALORIE GOAL STAYS FREE. Only the MACRO SPLIT is gated. If someone's calculated target is wrong
  and they cannot correct it, the app reads as broken rather than gated.
- The macro/nutrition gate is barely a paywall in practice: four presets cover what most people need, so a
  free user is not locked out of eating properly, only out of precision.

### WHAT THE USER SEES AT A CAP (✅ **PIECE 2 OF ITEM C, LOCKED 2026-08-01**)

Piece 1 locked the numbers. This is the moment of impact: a free user with 20 custom foods opens the plus
menu and wants a 21st. Wording is the only part still open.

**THE RULE, COMPLETE** (revised 2026-08-01 -- the earlier modal-once-then-toast version is kept as a
fallback at the end of this section, NOT deleted):
- **Under the cap:** nothing. No dim, no lock, no modal. The app behaves exactly as it does today.
- **At the cap:** the ENTRY POINT is **dim with a lock icon**, and is **still pressable**.
- ⚠️ **THE LOCKED BUTTON TREATMENT (FINAL, settled on device 2026-08-02 after THREE passes).** Keep the
  button's SIZE and SHAPE, and change only the colour: **light `theme.bgInset` fill, a thin GOLD BORDER,
  `theme.textMuted` label, flat gold lock**, no shine.
  **THE THREE PASSES, because the failures are the useful part:**
  1. Light fill + pale `borderCard` border -> **vanished.** It read as a hollow white chip, a different
     SPECIES of button from its solid siblings, not the same button turned off.
  2. Solid mid-tone `textMuted` fill + white label -> **held the edge but overshot.** It became the heaviest
     object on a light airy screen, "these big dark things" (Justin).
  3. **Light fill + GOLD border.** ⚠️ **The fill was never the problem -- the BORDER was.** Once the gold
     holds the edge, the fill no longer has to carry the weight, so it can go light again and the button
     stops being a slab. Gold also ties it to the badge on icon-only doors and the ring on the wall modal's
     lock: three places, one gold language.
  ⚠️ A light fill cannot carry a white label, so the text goes muted. That is correct anyway -- the button is
  meant to read as unavailable.
  ⚠️⚠️ **ONE LOCKED LOOK EVERYWHERE, REGARDLESS OF WHAT THE BUTTON LOOKED LIKE UNLOCKED.** Claude's first
  instinct was "drain whatever this button was", which gave a solid grey for the solid FAB pills and a pale
  tint for the tinted scan bars -- two different locked greys on one screen. Justin: *"shouldnt all these
  dim/locked states be the same damn color?"* **A lock is its own language.** Same fill, same label colour,
  same gold lock, whether the unlocked button was solid, tinted or outlined. Anything accent-coloured on the
  unlocked version (a bright top border, a shine) goes too.
  ⚠️ **Do not turn it into a hollow/outlined chip.**
  ⚠️⚠️ **ICON-ONLY DOORS: BADGE THE ICON, NEVER REPLACE IT** (settled 2026-08-02 on Save as Copy). Some doors
  are a bare icon with no surface to drain -- Save as Copy is a 22px copy glyph in the header, already the
  dimmest grey in the theme. Swapping it for a padlock was the obvious move and is WRONG: **Justin asked what
  happens to somebody who has never used clone.** They tap a bare gold padlock, get told their custom foods
  are full, and cannot connect the two, because nothing ever told them what that button did. The alternative
  was special-casing the modal copy for one door. So: keep the original icon, add a small gold lock badged on
  its corner. The icon says WHAT, the badge says LOCKED, and the shared modal copy still works.
  The badge is a ~14px disc in card colour with a **thin gold ring** and a 10px lock inside. ⚠️ The ring is
  not decoration -- without it the disc reads as an accidental white blob rather than a deliberate badge,
  the same reason the wall modal rings its lock circle. Two wrong versions were built first: a near-white `bgInset` fill (vanished against light cards, and
  changed the button from solid to hollow, so it read as a DIFFERENT button rather than the same one turned
  off) and a pale `bgProgressTrack` fill (the white halo ring dissolved into the cards -- a white ring only
  reads as an edge when what is behind it is strong). A MID-TONE fill is what makes one value work on every
  theme: it is darker than the page on Light/Warm and lighter than it on Dark, with no per-theme rule.
- ⚠️ **THE LOCK IS THE FLAT GOLD LOCK THE APP ALREADY USES** (`GOLD_BASE` from `components/SupporterFoil`,
  `lock-closed` Ionicon) -- the same one on the locked Reports and Comparison screens. **NEVER FOIL.** The
  app's own rule, written beside the Reports lock: foil means "you have this" (the Supporter mark), a lock
  means "you could have this" -- same colour family, opposite meanings -- and foil needs size to read as
  metal, so it turns to mush at icon sizes, which is exactly the size used here. Not grey, not accent.
  Confirmed by Justin 2026-08-01: "same shit as the reports/comparison feature gold lock. no foil."
  The payoff is free: a locked Create Food and a locked Reports card then say the same thing in the same
  voice instead of looking like two features built by two different people.
- **Every tap:** the **modal**, with a Support the Mission jump. **Every time.** No toast, no seen-state,
  no first-time logic, nothing to store.
- Nothing ever fires on its own. It only ever happens because the user reached for something, which is what
  keeps it from reading as nagging.

**WHY DIM THE ENTRY POINT AND NOT THE SAVE BUTTON (Justin, 2026-08-01):** "dont make users do all the work
just to not be able to save it." Create Routine, Create Program and the recipe builder all put their save at
the END of a builder. A cap checked only at save time means someone picks eight exercises, names the routine,
taps create, and gets rejected after all of it. Dimming the way IN means they never enter a builder they
cannot finish. This is the single strongest argument in the whole piece and it is Justin's.

**WHY THE DIM-BUTTON BUILD STANDARD DOES NOT APPLY AS WRITTEN.** That standard is about VALIDITY: the button
is dim because nothing valid has been entered and the fix is in the user's hands. A cap is the opposite. The
input is perfectly valid and the answer is still no. A plain dim state there shows the "you did something
wrong" face for something the user cannot fix, and they will hunt for the field they missed. **The lock icon
is what resolves it** -- dim alone reads as "not yet, do something else first"; dim plus a lock reads as
"not available to you," which is true and takes one glance.

**WHY A MODAL AND NOT A TOAST.** Checked in code 2026-08-01: toasts live **2200ms**, hardcoded in
`components/Toast.tsx`, identical for every toast in the app, with **no duration parameter and no tap action
of any kind** (the only pressable thing is the close X). 2.2 seconds at the bottom of the screen is not
enough time to read a sentence, realise you have hit a limit, decide you care, and reach for a link. This is
the highest-intent moment in the entire non-AI product -- someone actively reaching for the paid thing -- and
a toast throws it away. ⚠️ **DO NOT TOUCH `Toast.tsx` FOR THIS FEATURE.**

**WHY EVERY TIME AND NOT JUST THE FIRST TIME.** Nagging is UNPROMPTED. This is only ever prompted, and
prompted by tapping a button that is visibly dim with a padlock on it. Nobody taps a locked door by accident
twice, so tapping again is somebody saying "I still want this" -- a STRONGER buying signal than the first
tap, not a reason to give them less. It is also how every app worth copying handles a locked feature: tap the
locked thing, get the sheet, every time, and the escape is trivial (don't tap the locked button).
The chain that killed the split: the toast was there to avoid nagging; Justin was right that a toast reading
only "My Foods is full" is not clear enough and needs the Supporter mention; the standing rule says the
Supporter plan is never named without a Support the Mission jump; a toast has no button, so it would have to
become tappable; at which point the toast is doing the modal's job and the split buys nothing while costing
two extra pieces of copy per cap plus a stored seen-state.
**THE HONEST COST, ON RECORD:** somebody who taps out of habit gets a card instead of a whisper. That is the
only downside found, and the card is a small centered thing that dismisses with a tap outside.
Justin, 2026-08-01: "modal every time. we can try it." **If it turns out to be too much on device, the
fallback is written up at the end of this section -- do not re-derive it.**

**⚠️ NEVER DIM ON UNCERTAINTY.** Membership loads asynchronously. If a screen draws before the answer
arrives and assumes "not a Supporter," a paying customer watches the button sit there dim with a padlock on
it. Even for half a second that is the worst bug this feature can have. **Unknown membership = NOT dim.**
Same trap already recorded on Otto, where `isSupporter()` returned false on lookup FAILURE rather than on a
real answer, and needed a third "unknown" state.

**⚠️ THE CAP IS ON CREATING, FULL STOP.** Editing, deleting and opening something the user already has are
NEVER blocked. A free user with 20 custom foods can still fix a typo in any of them, delete one, and log any
of them. They just cannot make a 21st. This is easy to get wrong because create and edit often land on the
same storage write: `pj_my_foods` is written from five places and only some of them are creations. Gate the
CREATE ACTION, never the storage write. (Same rule as the already-recorded "cap creation, never LOADING" note
on routines.)

**⚠️ THE TUTORIAL MUST NEVER HIT THIS WALL.** The "Creating Your Own Food" tutorial drives the creator open
itself via the registered `openCreatorForTutorial` action (`app/add-food.tsx`). A free user sitting at 20
foods who runs that tutorial would dead-end on a locked button. The tutorial's path in is separate from every
user-facing door, so there is a clean place to make the distinction, but it must be deliberate or it breaks
silently. Matches the standing tutorial rule: never let a tutorial hit a wall it cannot get past.

**THE DOORS. EVERY CAPPED FEATURE NEEDS ITS ENTRY POINTS COUNTED BEFORE BUILD, NOT ASSUMED.** This is a build
checklist, not a decision. Custom foods alone have SIX user-facing doors, traced in code 2026-08-01:
1. Log tab -> + FAB -> Create Food (routes to add-food with `openCreate: '1'`, which pops the creator on
   arrival)
2. Add Food screen -> + FAB -> Create Food
3. Barcode scanned, nothing found -> Create Food for this Barcode
4. Barcode results -> Create Food for this Barcode (a genuinely separate second button, not the same one)
5. Food detail -> Save as Copy (the clone-food path, ends in the "Saved to My Foods" toast)
6. Recipe builder -> create a food inline while building a recipe (`recipe-builder.tsx` renders the same
   `CustomFoodCreator`)
Plus the tutorial path above (do not cap), and Otto as door 8 once plan item A's exercise/food creation
lands.
⚠️ On BOTH FAB menus the icon and its label are **two separate touchables**, so each of those rows is two
places to change, not one.
⚠️ **New Recipe sits on the same FAB as Create Food but is a DIFFERENT cap with a different number**, so the
two entries must be able to go dim independently.
⚠️ A `saveNewFood` function exists in `app/add-food.tsx` and looks like a seventh door. **It is dead code** --
nothing calls it and nothing renders it. Do not wire a cap to it.

**MINDFUL: NO VARIANT** (agreed 2026-08-01). Mindful only forbids deficit math, weight-loss framing and
prescribed numbers, and none of this copy contains any of those. Decision, not an omission.

---

#### THE COPY (in progress 2026-08-01)

⚠️ **THE COPY CAN NEVER BE A COUNTER.** "You have used 20 of 20" is a lie for a lapsed Supporter sitting on
40 grandfathered foods, and for a downgraded user with 8 meal slots. It is about ENTITLEMENT, not arithmetic.

**⚠️ USE THE APP'S OWN NAME FOR THE THING.** The user has never seen the words "custom foods" anywhere on
screen. They are **My Foods**. Same discipline on every other cap: write what the screen calls it.

**⚠️ ONE CHECK DRIVES BOTH VARIANTS: are you AT the cap, or OVER it?** Over the cap can only happen to an
ex-Supporter (taste ended, or cancelled) because a never-subscribed user was never allowed past the number.
So that single condition covers the wording change AND whether the delete line appears. Two variants, one
check, no membership-history lookup needed.

**⚠️ "DELETE ONE TO MAKE ROOM" IS ONLY TRUE AT THE CAP.** Justin caught this 2026-08-01: somebody at 30
deletes one, lands on 29, is still blocked, and loops deleting their own food wondering why nothing changed.
The over-cap copy carries NO delete instruction. Telling somebody to delete eleven foods to earn one back is
worse than saying nothing. If they do drift down under the cap organically the button quietly un-dims, which
is the right way for that to happen.

**WHY THE DELETE LINE STAYS AT ALL (Justin, 2026-08-01: "its still a handicap, not really a workaround").**
It is true by design -- every cap is CONCURRENT, not lifetime, specifically so someone can delete and
rebuild. Saying so makes the wall read as fair rather than extortionate, and it fits "limit, don't paywall".
Someone who deletes a food they had stopped using was never converting on that tap anyway; someone genuinely
full of foods they all use reads that line, realises none are droppable, and THAT is the moment the Supporter
plan means something. The line makes the wall more persuasive, not less.

##### ✅ APPROVED -- MODAL, AT THE CAP (custom foods)
> **You've Built 20 Foods**
>
> The free plan holds 20 foods of your own. My Foods is full, and every one of them is still yours to log,
> edit and keep.
>
> Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.
>
> **[ Support the Mission ]**  **[ Not Now ]**

Shape, and it is the shape every other cap copies: title states the fact without scolding; the FIRST body
line does the reassuring, because the first fear at any wall is "have I lost something"; then one line with
two honest ways forward.

##### ✅ APPROVED -- MODAL, OVER THE CAP (custom foods)
> **All 30 Of Your Foods Are Still Here**
>
> Nothing you built has gone anywhere. Every food is yours to log, edit and keep.
>
> Free accounts hold 20, so there's no room to add another right now. The Supporter plan opens My Foods
> back up.
>
> **[ Support the Mission ]**  **[ Not Now ]**

⚠️ **The count in the title is LIVE** and reads their real number (30, 24, whatever they have). Deliberate:
the first thought of somebody who just lost a membership is "what did I lose," and their own number in the
headline answers that before they finish reading.

##### ✅ APPROVED -- SAVED MEALS (cap 5)
⚠️ On screen these are the **Meal Catalog** (the second tab in the Find a Meal modal). Never "saved meals"
as a UI label.
**At the cap:**
> **You've Saved 5 Meals**
>
> The free plan holds 5 saved meals. Your Meal Catalog is full, and every one is still yours to log and keep.
>
> Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.

**Over the cap:**
> **All 12 Of Your Saved Meals Are Still Here**
>
> Nothing you saved has gone anywhere. Every meal is yours to log and keep.
>
> Free accounts hold 5, so there's no room to save another right now. The Supporter plan opens your Meal
> Catalog back up.

⚠️ **"log and keep", NOT "log, edit and keep"** -- deliberate. There is currently NO edit or rename in the
Meal Catalog, only log and delete (confirmed with Justin 2026-08-01, now a QUICK WIN in the roadmap). If
editing ever ships, both strings above gain the word.

##### ✅ APPROVED -- RECIPES (cap 5)
⚠️ Recipes have **no container name** on screen (they are just a Recipes tab in Add Food), so this copy is
worded to not need one. Do not invent "My Recipes".
**At the cap:**
> **You've Built 5 Recipes**
>
> The free plan holds 5 recipes of your own. Every one you've built is still yours to log, edit and keep.
>
> Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.

**Over the cap:**
> **All 9 Of Your Recipes Are Still Here**
>
> Nothing you built has gone anywhere. Every recipe is yours to log, edit and keep.
>
> Free accounts hold 5, so there's no room to build another right now. The Supporter plan lets you keep
> building.

##### ✅ APPROVED -- ROUTINES (cap 5) AND PROGRAMS (cap 3)
⚠️ **The two are structured DIFFERENTLY on screen and the copy reflects that.** Routines have their own
labelled **MY ROUTINES** section in `workout-library.tsx` with **PRESETS** as a separate section below, so
the copy can name My Routines and the numbers match what the user sees. **Programs have no such split** --
the built-ins are seeded into the same list as the user's own (`pj_my_programs`, `createdAt: 0`), so someone
with 3 of their own is looking at a list of 8. Without the "built-in programs don't count" line, "You've
Built 3 Programs" reads as a bug.

**ROUTINES, at the cap:**
> **You've Built 5 Routines**
>
> The free plan holds 5 routines of your own. Presets don't count toward that, and every routine under My
> Routines is still yours to load, edit and keep.
>
> Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.

**ROUTINES, over the cap:**
> **All 11 Of Your Routines Are Still Here**
>
> Nothing you built has gone anywhere. Every routine under My Routines is yours to load, edit and keep.
>
> Free accounts hold 5, so there's no room to build another right now. The Supporter plan opens My Routines
> back up.

**PROGRAMS, at the cap:**
> **You've Built 3 Programs**
>
> The free plan holds 3 programs of your own. Built-in programs don't count toward that, and every one you've
> built is still yours to load, edit and keep.
>
> Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.

**PROGRAMS, over the cap:**
> **All 7 Of Your Programs Are Still Here**
>
> Nothing you built has gone anywhere. Every program is yours to load, edit and keep.
>
> Free accounts hold 3 of your own, so there's no room to build another right now. The Supporter plan lets
> you keep building.

⚠️ Both say "yours to **LOAD**" on purpose. The standing build note is *cap creation, never loading*, and
having the user-facing copy promise loading out loud makes that far harder to break by accident later.

##### ✅ APPROVED -- EXERCISE LIBRARY (cap 15 of your own, on top of the built-ins)
⚠️ On screen the whole thing is the **Exercise Library** (the screen title in `workout-library.tsx`). The
verb is **added**, not built, because the app's own toast on creation says "Exercise added".
⚠️ Editing a custom exercise **does** already exist (`workout.tsx` fires an "Exercise updated" toast), so
this copy can promise editing where the saved-meals copy cannot.
**At the cap:**
> **You've Added 15 Exercises**
>
> The free plan holds 15 exercises of your own. Built-in exercises don't count toward that, and every one
> you've added is still yours to use, edit and keep.
>
> Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.

**Over the cap:**
> **All 22 Of Your Exercises Are Still Here**
>
> Nothing you added has gone anywhere. Every exercise is yours to use, edit and keep.
>
> Free accounts hold 15 of your own, so there's no room to add another right now. The Supporter plan opens
> your Exercise Library back up.

##### ✅ APPROVED -- MEAL SLOTS (5) AND STATS GRAPHS (7 defaults + 1)
⚠️ **MEAL SLOTS ARE NOT UNLIMITED ON THE SUPPORTER PLAN, THEY ARE 8.** This copy therefore promises 8 and
must NOT say "removes the limit entirely" like every other cap. Stats graphs genuinely are unlimited.
⚠️ **Matches copy the app ALREADY SHIPS.** The home-screen step-down notice (`app/(tabs)/index.tsx`) says
"Your meal slots and stats cards go back to the free layout. The extras are saved and waiting if you come
back." These modals reuse that promise rather than inventing new words for it.
⚠️ **NAMING MISMATCH, flagged and decided:** that shipped line says "stats cards", but the button the user
actually taps says **Add Graph**. Going with **graph**, since that is the word attached to the action. The
shipped home-screen line is now the odd one out; worth aligning if it is ever touched.
⚠️ At a cap of ONE, "delete one you've stopped using" reads strangely, so the stats copy says **swap**
instead. Same honest offer, right word for a cap of one.

**MEAL SLOTS, at the cap:**
> **That's All 5 Meal Slots**
>
> The free plan holds 5, which is the four your log starts with plus one of your own. Every slot is still
> yours to rename and use however you like.
>
> Make room by deleting one, or the Supporter plan takes you to 8.

**MEAL SLOTS, over the cap:**
> **Your Extra Meal Slots Are Waiting**
>
> Nothing you set up has gone anywhere. Your extra slots are saved, and everything you logged to them is
> still on your log.
>
> Free accounts hold 5, so your log is back to the free layout for now. The Supporter plan brings your extra
> slots back.

**STATS GRAPHS, at the cap:**
> **You've Built Your Graph**
>
> The free plan holds one graph of your own on top of the seven your Stats tab comes with. Every graph is
> still yours to use and keep.
>
> Swap yours for a different one any time, or the Supporter plan lets you build as many as you like.

**STATS GRAPHS, over the cap:**
> **Your Extra Graphs Are Waiting**
>
> Nothing you built has gone anywhere. Your extra graphs are saved exactly as you set them up.
>
> Free accounts show one of your own, so your Stats tab is back to the free layout for now. The Supporter
> plan brings the rest back.

⚠️ **THE TWO OVER-CAP ONES ARE PROVISIONAL ON PIECE 4.** They describe extras as "saved" and "waiting",
which is true under every dormancy model considered so far, but if a dormant slot turns out to be
visible-but-greyed rather than hidden, both need a small rewrite. Their AT-cap versions are final -- those
fire on a normal tap of a dim door like every other cap.

##### ✅ CUSTOM MACRO + NUTRITION GOALS -- THE RULES, LOCKED 2026-08-01 (copy still to write)

> ✅ **BUILD STATE: COMPLETE + DEVICE-VERIFIED 2026-08-03.** Both sides ship: the preset marker, the stored
> custom split and custom nutrition targets, the Custom card, the inline macro editor, and the gate itself.
>
> **FOUR DOORS, ALL GATED** -- macros: the controls in Settings > Goals AND the modal editor. Nutrition: the
> Custom tile AND tapping any field. Gate one of a pair and the limit does not exist.
>
> **THINGS DECIDED DURING THE BUILD that are not in the text below:**
> - **The presets are now in Settings > Goals as well**, scaled down. Justin spotted the inconsistency: the
>   wall says "the four presets stay yours for free", and firing that on a screen with no presets on it tells
>   somebody about an escape hatch and leaves them at a locked door. They sit ABOVE the editor, so the screen
>   explains itself before the wall fires.
> - **Tapping a preset FILLS THE DRAFT and waits for Save** (both screens). It used to apply instantly. That
>   was right when tapping a preset was the whole interaction, but once the modal had an editor and a Save
>   button, one control committing instantly beside one that waits is incoherent -- and a stray tap on a big
>   card changed what you eat that day. No confirm dialog: requiring Save IS the confirmation.
> - **A preset save must never overwrite the stored custom copy.** Applying a preset changes the very fields
>   the hand-edit detector watches, so without an explicit "was this a preset?" test the Custom card would
>   come back holding Balanced's numbers, claiming a preset as the thing the user built.
> - **Save is OUTSIDE the locked area.** Presets are free and now need committing, so a Save trapped under
>   the lock overlay would leave a free user able to pick a preset and unable to save it.
> - **"Custom is selected" and "you may type" are two different things.** A grandfathered free user IS on
>   custom, so keying the nutrition text inputs off that alone handed editing back to exactly the people the
>   gate exists for.
> - **The lock goes on the CARD, not the icon.** "Badge the icon" is the rule for ICON-ONLY buttons where the
>   icon is the whole control. A tile with a title and subtitle gets a gold border plus a corner padlock;
>   badged onto the glyph it read as a wart on the icon. When a card is both selected and locked, selection
>   keeps the fill and the lock takes the border and badge.
> - **A padlock now means exactly one thing in this app: needs the Supporter plan.** The old grey outline
>   padlock on the nutrition modal's "Tap Custom or any field to edit" line meant "read-only until you pick
>   Custom" -- a collision the gate created. Icon dropped, sentence kept.
> - **THE BACKFILL WAS REVERSED.** Justin chose option B (no backfill) on 2026-08-02 when editing was still
>   free and anyone could retype their numbers. Gating removes that escape, so a one-time copy is now taken
>   for anyone already on custom macros or custom nutrition targets without one.
>
> **THREE THINGS IN THE TEXT BELOW ARE NOW WRONG. Corrected here, in place:**
> 1. ❌ *"The modal is ALWAYS percentages."* **The Ratio/Fixed toggle is now IN the Macros modal.** That line
>    was written when the modal only DISPLAYED macros. Once it could EDIT them, leaving the toggle out meant
>    a fixed-grams user editing derived percentages would be silently converted -- and the fix for that is the
>    toggle, because an explicit switch is not a silent conversion. Switching modes CONVERTS the numbers on
>    screen rather than blanking them, so the toggle can never cost somebody their split.
> 2. ❌ *"Need exact numbers? Fine-tune in Settings > Goals"* -- **that link is DELETED.** Everything it
>    pointed at now lives in the modal, so it sent you somewhere for something already in front of you.
> 3. ⚠️ **The gate therefore has TWO homes, not one.** The note below says the real gate sits on the macro
>    controls inside Settings > Goals "because a free user walks there directly and never touches that link".
>    Still true -- but the modal is now a full second editor and needs the same gate. Gate one and not the
>    other and the cap does not exist. This is why the inline fields were built BEFORE the gate rather than
>    after: adding an editor to a gated thing later is exactly how the routine Duplicate hole happened.
>
> **ALSO BUILT, and not in the text below because it was found during the build:** `pj_settings.macroPreset`
> was written by two places and read by none -- the Macros modal GUESSED which preset was active by matching
> the live percentages against the four presets. That guess cannot tell "I picked Balanced" from "I typed
> 30/40/30 by hand", and Justin's call is that hand-authored numbers read as **Custom** even when they equal a
> preset. The marker is now written by Settings > Goals (on editing the SPLIT, never on changing calories
> alone) and read by the modal, falling back to the old matching only for accounts that have never set it.
>
> ⚠️ **SUPERSEDED: the "no backfill" call above was reversed on 2026-08-03** -- see the build-state block at
> the top of this section. Gating removed the "just retype it" escape that made option B safe.
These are NOT the same shape as the eight caps: no number, so no at-cap/over-cap split, no count in a title
and no delete-to-make-room offer.

**THE RULE (Justin, 2026-08-01):** a Supporter or free-weeker who has custom goals set **KEEPS them
(grandfathered) but cannot edit them further or make new ones. To change, they pick a preset.**
⚠️ The perks table said "n/a" on downgrade for these two rows. That never worked -- goals are LIVE numbers
the whole app reads from, so they have to become something the moment a membership ends. Grandfathering is
also what the standing category test gives: *did you make it?* -> yes, they made those numbers.
**PRESETS STAY FREE, which is the escape hatch that makes it safe.** Nobody is ever trapped with a target
they cannot correct -- same reasoning as the existing carve-out keeping the custom CALORIE goal free.

**⚠️ THE ONE-WAY DOOR, AND THE FIX. THIS IS THE WHOLE POINT.** "Keep it but pick a preset to change" means
the moment somebody taps a preset out of curiosity their custom numbers are gone forever, because getting
them back would be authoring a custom goal, which they cannot do. Somebody who spent weeks dialling in
40/30/30 taps Balanced to see what it looks like and it is unrecoverable, with no warning.
**FIX: STORE THEIR CUSTOM VALUES SEPARATELY FROM THE LIVE GOALS**, so selecting them again is RESTORING what
they already made, not authoring something new. That keeps it inside the rule and makes grandfathering mean
something. Warning-before-switching was considered and rejected: warning somebody they are about to
permanently lose their own settings is a worse experience than simply not taking it away.

**MACROS MODAL (the Macros sheet off the Home calorie card):**
- Gains a **FIFTH card, "Custom"**, showing their percentages in the same format as the four presets.
- **PRESET-SIZED, CENTRED under the 2x2** -- Justin's call, 2026-08-01; full width was proposed and rejected
  as much too big.
- Tapping a preset is then **safe, with NO warning**, because their card is still sitting there.
- ⚠️ The line currently under the grid, **"Custom goals set. Pick a preset to replace them."**, GOES. It
  describes the destructive behaviour being removed and would scare people off touching a preset.
- The card shows for **anyone with a stored custom split, Supporter or free** -- a Supporter benefits from a
  one-tap way back to their own numbers just as much.
- ⚠️ **The modal is ALWAYS percentages** (Justin corrected an earlier muddle here). Macros can be set as
  fixed GRAMS, but only on the Settings > Goals screen, and the app syncs percentages from grams
  (`settings.tsx` ~line 1253), so the modal always has percentages to show. No unit marker needed.
- ⚠️ **BUILD NOTE: restoring must restore the MODE too** (`macroMode: 'ratio' | 'fixed'`), not just the
  numbers. Pasting percentages back for somebody who was on fixed grams silently changes their real targets.
- Harmless quirk worth knowing before somebody reports it as a bug: for a fixed-grams user the percentage is
  DERIVED, so if their calorie target changes the grams hold and the displayed percentage drifts on its own.

**WHERE THE MACRO GATE ACTUALLY LIVES.** ⚠️ NOT on the "Need exact numbers? Fine-tune in Settings > Goals"
link. That was raised as a trap (it would block the free calorie goal, which lives on the same screen) and
**Justin correctly knocked it down**: Settings > Goals is reachable straight from Settings, so dimming a
shortcut blocks nothing, and the link's own words are about macro precision, which IS the gated thing.
Dimming the link is honesty, not enforcement. **The real gate sits on the macro split controls INSIDE
Settings > Goals**, because a free user walks there directly and never touches that link.

**NUTRITION GOALS MODAL (`NutritionGearModal.tsx`)** -- similar rule, different shape, and simpler:
- **The Custom card already exists** (6th tile in the preset grid, `PRESET_META` key `custom`). No new card
  needed.
- The gate is: **Custom is the locked door, AND the fields are read-only.** ⚠️ **TWO DOORS** -- `unlockCustom`
  is called both from the Custom tile and from tapping any field. Gating the tile alone leaves the fields
  wide open.
- A grandfathered free user keeps their Custom card **selectable with their own values**, fields read-only.
  Which needs the same separate storage as macros, or selecting a preset overwrites the custom values and
  Custom has nothing to return to.

##### ✅ APPROVED -- THE TWO GOALS WALLS
Both fire the same way: a free user taps Custom, or taps into a field, and gets the modal.
> **Custom Macro Splits**
>
> The four presets stay yours for free.
>
> Building your own protein, carb and fat split comes with the Supporter plan.
>
> **[ Support the Mission ]**  **[ Not Now ]**

> **Custom Nutrition Targets**
>
> All five presets stay yours for free.
>
> Setting your own targets for fiber, sodium, vitamins and the rest comes with the Supporter plan.
>
> **[ Support the Mission ]**  **[ Not Now ]**

**Both LEAD WITH WHAT STAYS FREE**, unlike the cap modals. At a cap the user has lost access to something
they had, so that copy reassures first. Here they have lost nothing, they are just at a door, and the fair
thing is to make clear the free path is genuinely usable rather than a crippled trial.
⚠️ **SHORT TITLES ARE DELIBERATE.** The longer version ("Macro Splits Are Part Of The Supporter Plan") made
the last line a restatement of the title -- three lines carrying two ideas. Short, each line does its own
job: the title names what you tapped, the second says what stays free, the third says what it takes. A title
that explains itself also sounds like it is bracing for an argument.
⚠️ **NO REFERENCE TO THE FREE CALORIE GOAL.** An earlier draft mentioned it; Justin cut it. Somebody tapping
Custom wants a macro split, and telling them calories are free answers a question they did not ask and reads
like the app defending itself.
⚠️ **NEITHER MENTIONS GRANDFATHERING**, because a grandfathered user never sees these. They keep their Custom
card and their own values, so they only hit this wall if they try to CHANGE them.

##### ✅ DATA EXPORT -- ALREADY GATED, NO COPY NEEDED (resolved 2026-08-01)
The only export in the app captures the report as an image and hands it to the iOS share sheet
(`app/report.tsx`). **Reports are already Supporter-gated** -- `app/reports.tsx` has
`hasAccess = REPORTS_BETA_OPEN || isPro` with `REPORTS_BETA_OPEN = false` since 2026-07-28, a full locked
screen, and `stats.tsx` locks the launch card the same way. Export lives inside Reports, so the perks-table
row "Data export: None / Yes" is **already true today with no work and no wall copy of its own**. The one row
of that table that is already done.
⚠️ **Do not go looking for the gate in `app/report.tsx`** (the report VIEWER) -- it has no membership check
and the confusingly similar filename cost a wrong conclusion once already. The gate is in `app/reports.tsx`
(the hub) and `stats.tsx`.
⚠️ **THREE OTHER PLACES USE THE SHARE SHEET AND ARE NOT DATA EXPORT:** sharing a Bible verse (`bible.tsx`)
and sharing a message out of either AI chat. "Gate sharing" is an easy instruction to hand somebody and
paywalling the Bible verse share would be a genuinely bad look.
**HONEST CAVEAT, LOGGED AS ITS OWN ROADMAP ITEM:** what a Supporter actually gets is sharing a report as an
image. That is real but thinner than "data export" sounds on a feature list. A TRUE export -- the user's
logged data in a file they own -- does not exist and needs speccing and building.

**SEPARATE, NOT PART OF THIS:** colouring the macro values in the Macros modal cards (see QUICK WINS in the
roadmap). It is a standalone improvement to a modal that already ships and must not hold up the cap work. ⚠️ **Check what the SCREEN calls each one before writing a word** -- "custom foods" turned out
to be **My Foods** and "saved meals" turned out to be the **Meal Catalog**, and neither label exists in the
UI. That check has changed the copy every single time so far.
⚠️ **Macro goals, nutrition goals and data export are NOT this shape.** They are straight paywalls with no
number, so there is no at-cap/over-cap split and no delete option. They need their own treatment.

**AND, NOT PART OF PIECE 2:** if someone subscribes from that modal, they must land back where they were,
still wanting to create that food. Paying and getting dumped on the Profile tab is a sour ending to the best
moment this product gets.

---

#### ✅ PIECE 3 -- DOES THE USER SEE A CAP COMING (LOCKED 2026-08-01, **BUILT + DEVICE-VERIFIED 2026-08-02**)

> 🏗️ **BUILD NOTES 2026-08-02 -- READ THESE BEFORE TRUSTING THE TEXT BELOW.** Seven of the eight caps ship
> exactly as written. **Two things changed on contact with the code:**
>
> **1. MEAL SLOTS ARE EXEMPT. They get NO toast.** The spec's premise -- "every capped thing already fires a
> creation toast" -- is false for this one. Adding a slot fires nothing at all, the slot is born called
> "New Meal" and drops you into a rename field so there is no name to show, and the Edit Meal Slots sheet has
> no `ToastRenderer` inside it, so a toast fired there would render underneath the sheet's own window.
> **It already has a better count:** that sheet's header reads `5 of 5 slots`, live, against the real tier
> cap, directly above the Add Meal Slot button. Justin's call, and he was shown the alternative.
> ⚠️ The header does NOT carry the "included on the free plan" framing, and over the cap it counts AWAKE
> slots (a user with 6 and a cap of 5 reads "5 of 5"). Both reviewed and deliberately left: it is a status
> line on a screen you opened on purpose, not a message fired at you, and the over-cap meal-slot WALL carries
> no number at all so there is nothing for it to contradict.
>
> **2. GRAPHS NEEDED THEIR OWN BUILDER** (`customGraphCountLine` in utils/caps.ts). The graph cap is a RAW
> TOTAL of 8, so feeding it through the normal path would have said `8 of 8` -- arithmetically right and
> useless, because the user did not create eight graphs. Both numbers are derived BY IDENTITY: the allowance
> is the cap minus the defaults the user STILL HAS, not minus the seven that ship, because deleting a default
> genuinely buys room for another of your own. A hardcoded "cap - 7" would have told someone who deleted two
> defaults they were at "1 of 1" while the button let them add two more. The noun pluralises for the same
> reason ("1 of 3 custom graph" is not a sentence).
>
> **THREE PRE-EXISTING BUGS FELL OUT OF BUILDING THIS, all fixed:** the routine **Duplicate** button was an
> ungated SECOND creation door (see PIECE 6, which said routines had one); the routine, program and food-detail
> cap counts only refreshed when you ARRIVED at the screen, so creating never locked the door and deleting
> never unlocked it; and **Save as Copy fired two toasts**, the second naming the food you copied FROM.

**THE DECISION: the count rides on the SUCCESS toast that already fires when you create something, EVERY
time, phrased as counting UP, free users only.** Justin's idea and his lean; nothing else shows a count.

> **Food saved**
> Chicken Thighs (3 of 20 included on the free plan)

**WHY THE EXISTING TOAST AND NOT NEW UI.** Every capped thing already fires a creation toast (Food saved,
Meal saved, Graph added, Exercise added) and their second line is usually empty. The count rides on something
the user is already looking at, at the exact moment they used one up. Nothing new to find, nothing always-on.

**WHY EVERY TIME AND NOT ONLY NEAR THE END.** Claude argued first for staying quiet until the user is close,
on the precedent of `QUOTA_VISIBLE_AT = 5` hiding the Halo/Otto counter until it is useful. Two things
overturned it:
1. **Halo's counter counts DOWN, this one counts UP.** "5 messages left" is a fuel gauge; "3 of 20" is a
   collection filling. Identical information, opposite feel. The objection was to the countdown, not the count.
2. **TWO CAPS HAVE A RUNWAY OF ONE** -- stats graphs and meal slots both give a free user exactly one of their
   own. A "stay quiet until near the end" rule never fires for those at all, and needs proportional tuning
   (a fixed "5 remaining" is most of a cap of 20 and the whole of a cap of 3). Every time works everywhere,
   needs no threshold and needs no explaining.

**THE WORDING, and every part of it was fought for:**
- ⚠️ **"INCLUDED" IS LOAD-BEARING** (Justin's word). "3 of 20 on the free plan" reads as a restriction notice;
  "3 of 20 **included** on the free plan" reads as something you were given. Fits *limit, don't paywall*, and
  makes the eventual wall land as fair rather than stingy.
- ⚠️ **PARENTHESES, NOT A DOT.** The app uses "·" to join things of EQUAL weight ("3 items · 420 kcal"). Here
  the name is the confirmation and the count is a footnote, so the punctuation must subordinate it. Justin
  rejected the bare "Chicken Thighs · 3 of 20" outright: it does not say what the 20 is.
- ⚠️ **NEVER "20 free foods"** -- reads like foods with no calories.
- ⚠️ **BIND THE WHOLE PARENTHETICAL WITH NON-BREAKING SPACES.** Otherwise a long food name orphans the word
  "plan" on its own line. Bound, the phrase either sits after the name or drops to the next line WHOLE, so a
  long name gives a tidy two lines instead of a ragged break. (~35 chars against a near-full-width toast line;
  it fits with room to spare.)

**THE TWO CAPS OF ONE (stats graphs, meal slots) KEEP THE SAME FORMAT** plus one word, so there are no special
cases. Claude proposed dropping the number entirely ("your free graph"); Justin disagreed -- "1 of 1" is plain
and readable, not insulting -- and he was right. The added word fixes the only real problem, which is accuracy
rather than tone: a free user HAS eight graphs (seven defaults + their one) and five meal slots (four defaults
+ their one), and a bare "1 of 1" could be read as the free plan giving you a single graph.
> **Graph added**
> Recovery Trend (1 of 1 custom graph included on the free plan)

> **Slot added**
> Pre-Workout (1 of 1 custom meal slot included on the free plan)

**THE TOAST IS THE WHOLE OF IT.** No count on the list screens, no permanent counter anywhere. A count sitting
on My Foods or the Exercise Library is the always-on fuel gauge already rejected for Halo, it shows whether or
not the user cares, and the number is only actionable at the moment you are about to add another one -- which
is exactly when the toast fires. Justin 2026-08-01: "toast alone is fine. we can re-evaluate if it doesnt end
up being good or we get complaints."

**RULES THAT FALL OUT OF THIS -- all four are easy to get wrong:**
- ⚠️ **SUPPORTERS NEVER SEE A COUNT. NEVER.** (Justin, emphatic.) There is nothing to count. Which also means
  somebody finishing the 7-day taste starts seeing counts on day 8 where they saw none on day 7. That is
  correct, but it is a visible change and should be deliberate rather than a surprise.
- ⚠️ **CREATE ONLY, NEVER LOG.** Logging a saved meal for the fortieth time consumes nothing. A count there
  would say it does.
- ⚠️ **THE COUNT MUST EXCLUDE PRESETS AND BUILT-INS**, exactly like the cap does -- routines, programs and
  exercises all mix user-created with shipped ones. A count that includes them is both wrong and alarming.
- ⚠️ **THE NUMBER SHOWN MUST BE THE NUMBER THE CAP ENGINE USES.** Caps are CONCURRENT, so deleting one frees a
  slot and the next toast reads lower. Two separate counting implementations WILL drift.
- 🎁 A free property of counting up: the final creation announces itself ("20 of 20 included on the free
  plan"), so the last one doubles as the warning with no extra work.

**DEVICE CHECK WHEN BUILT:** how the two-line wrap looks with a long name, and whether the toast has any
height constraint that a second line fights with (the second line has no `numberOfLines` limit, so it wraps
rather than truncating, which is what we want).

---

#### ✅ PIECE 4a -- MEAL SLOTS: WHAT "DORMANT" ACTUALLY MEANS (LOCKED 2026-08-01)

⚠️ **"Dormant" is SPEC JARGON invented by an earlier thread. The user never sees the word** and Justin had
never used it. Shipped copy says the extras are "saved and waiting". Nothing here is user-facing vocabulary.

**THE WHOLE FEATURE, IN ONE SENTENCE: when the app draws a day, show the LIVE slots, plus any sleeping slot
that has food logged on that day.**

**AND THE PROPERTY THAT MAKES IT SAFE: this feature WRITES NOTHING.** It only decides what to draw. No new
storage, no migration, no job that runs when a membership ends, nothing rewritten on anyone's device. Data
cannot be harmed by a change that only decides what is rendered.

##### WHICH SLOTS SLEEP: POSITION DECIDES (Justin's call)
The first N in the list are awake, everything below is asleep, where N is the tier cap (5 free / 8 Supporter).
**There is NO stored sleeping flag.** A slot is awake because of where it sits, full stop.
- Kills the whole class of bugs where a stored flag disagrees with the count.
- ⚠️ Deliberately does NOT reuse the stats cards' `visible` flag or anything like it -- that flag is
  USER-controlled, so dormancy built on it would let a downgraded user just switch their extras back on.
- **Waking one is free: drag it above the line** in Edit Meal Slots. That is not creating anything, it is
  choosing among what they already own -- same principle as the grandfathered custom macro split.
- 🎁 **Deleting a live slot automatically wakes the next one down.** Nothing to build; it falls out of
  position-decides. Looks like a bug if you do not know it is intended.
- 🎁 **THERE IS NO DOWNGRADE EVENT TO HANDLE AT ALL.** The live set is derived from order + current cap, so
  nothing runs when a membership ends, nothing can run twice, and nothing can fail halfway. Resubscribing is
  the same in reverse and equally free.

##### ⚠️ THE THING THAT WAS NEARLY BUILT WRONG: LOGGED FOOD MUST NEVER DISAPPEAR
If sleeping slots simply stopped rendering, a downgraded user opening last Tuesday would find the food they
logged into their extra slots **gone from the screen**. That breaks the line the whole cap philosophy rests
on (*cap creation, never restrict access to data someone already logged*), and it is worse than it sounds
because the app ALREADY behaves that way on manual slot deletion -- `deleteMealSlot`'s alert warns entries
"won't appear in your log going forward." That was acceptable for a delete the user chose. Dormancy is not
chosen, and would silently do it to weeks of history.
**Justin's vision, and it is the spec:** past dates read like a screenshot frozen in time. Downgrade to 5,
arrow back to a day you used 7, and all 7 are there with their names and their food.
⚠️ **ONE ACCEPTED DIFFERENCE from a true frozen snapshot** (Justin agreed 2026-08-01): a past day where they
had 7 slots but only put food in 5 shows 5, not 7 with two empty cards. **Sleeping slots return for a day
only if there is something in them.** Empty cards from a slot you no longer have are clutter, not history.

##### THE THREE RULES, AND THE NINE PLACES THEY APPLY (verified in code 2026-08-01)
**1. DRAWS A DAY -> live slots + any sleeping slot with food that day.**
   `app/(tabs)/log.tsx` (the day render is ONE loop, line ~1787), `app/day-detail.tsx`, `app/report.tsx`.
**2. PICKS A SLOT (a destination) -> live slots ONLY.**
   `app/add-food.tsx`, `app/food-detail.tsx`, `app/recipe-log.tsx`, `app/ai-meal-estimator.tsx`, and the chip
   row in `components/RepeatMealModal.tsx` (which receives `slots={mealSlots}` as a prop from log.tsx, so
   log.tsx must hand it the LIVE list).
**3. NEEDS THE FULL LIST -> the Edit Meal Slots modal (so the locked rows show) and the home-screen step-down
   message in `app/(tabs)/index.tsx`, whose whole job is saying the extras are waiting.**

**NOT IN SCOPE, checked:** Day Summary, Weekly Summary and Monthly Summary do not read the slot list at all.
**OTTO IS NOT IN SCOPE, and it is already handled:** his food history is one of the five attachments item B
gates off from free users, and sleeping slots only exist for free users, so the situation cannot arise. If
that gate ever broke, the worst case is Otto naming a slot the user still owns -- cosmetic.

##### ⚠️⚠️ THE RULE THAT PROTECTS THE DATA: THE SHORTENED LIST IS NEVER SAVED
`saveMealSlots` has exactly FOUR call sites, ALL in `log.tsx`, all in the Edit Meal Slots flow (add, delete,
rename, drag-reorder). That same file also holds the slot list in state. **So log.tsx must keep the FULL list
in state** and derive the shorter views for rendering. If its state ever held the filtered list, the next
rename or reorder would write 5 slots over 7 and the extras would be gone from storage permanently.
⚠️ **DO NOT "FIX" THIS BY MAKING `loadMealSlots` RETURN THE LIVE LIST.** That was proposed and is WRONG:
changing a shared function so the one dangerous caller has to opt OUT of danger is backwards. If a live-list
loader is wanted, add it under a NEW NAME and move read-only callers to it one at a time -- then a missed
call site shows a stale extra slot (visible, harmless, findable) instead of silently truncating.
✅ **Checked and clean:** every writer of `pj_settings` does a read-then-merge, so nothing else can clobber
the slot list.

##### BUILD NOTES
- ⚠️ `addMealSlot` hard-guards `mealSlots.length >= 8` (log.tsx ~1337, with matching copy "Maximum 8 slots
  reached" at ~2753 and the disabled state at ~2749). **This is the ONLY place the maximum is enforced** and
  it becomes tier-aware. The dim state + gold lock from piece 2 goes here.
- The Edit Meal Slots header already reads `${mealSlots.length} of 8 slots` (~2720). It becomes tier-aware
  and that is the whole count job done there. ⚠️ For a free user over the cap it reads "5 of 5 slots" and
  that is CORRECT -- the locked rows sitting right below explain themselves, and Justin explicitly rejected
  inventing a third form of that line.
- `findSlotForMeal` returns nothing for a slot absent from the list you hand it. That is exactly the
  mechanism that would drop a historical entry, so **it must always be given the full list.**
- History display is safe either way: entries store the slot ID and `slotNameCache` never shrinks, so a
  sleeping slot's old entries still resolve their proper name.

##### 🔎 THREE THINGS TO CONFIRM WHEN THE FILE IS OPEN (not design risks -- "does this file do what it appears to")
1. **Day Detail may already be correct for free.** Its rendering is driven by the meal keys actually present
   in the day (`day-detail.tsx` ~679) rather than by the slot list, which is the same idea as this rule.
2. **Reports cover a date RANGE, not one day**, so the rule there is "a sleeping slot with food anywhere in
   the range". Small variation, easy to write wrong.
3. **Meal PHOTOS resolve in a separate loop from the render** (log.tsx ~950, day-detail ~106). Both loops must
   walk the SAME list, or a sleeping slot returns for a past day with its food but without its photo.

---

#### ✅ PIECE 4b -- STATS GRAPHS: WHAT SLEEPING MEANS (LOCKED 2026-08-01)

**Deliberately split from meal slots (4a).** They are independent problems, neither waits on the other, and
lumping them together made every explanation worse. Same core rule, smaller surface, one different hazard.

**THE RULE, IDENTICAL TO MEAL SLOTS: position decides.** The first 8 GRAPH cards are awake (7 defaults + 1 of
your own on free), everything below sleeps. No stored flag. Nothing runs at downgrade. **The feature writes
nothing** -- it only decides what is drawn. Waking one is dragging it above the line in Edit Stats.

##### ⚠️ WHY GRAPHS NEED NO "COMES BACK ON PAST DAYS" RULE (the 4a problem does NOT apply here)
A sleeping meal slot would have hidden FOOD SOMEBODY LOGGED. A sleeping graph hides a **view**, not data.
Verified: a card holds configuration only (dataKey, chartType, colour, period, nutrientKey). Every number it
charts lives in the day records and is still reachable in the other graphs, Day Detail, summaries and
reports. Justin confirmed 2026-08-01 after being asked to rule on it explicitly rather than have it assumed.
- The configuration survives untouched, so a woken card comes back **exactly as built** -- same metric, chart
  type, colour, period. Not a blank card to set up again.
- ⚠️ A graph pinned to Home disappears from **Home** too when it sleeps. Expected, but Home is the most-looked
  -at screen, so it is the one people notice.
- No side effects: the only other consumer is the loader deciding how far back to fetch, and it already keys
  off which cards are showing.

##### GRAPHS RENDER IN TWO PLACES, NOT ONE (found 2026-08-01)
Graph cards can be **pinned to Home** via `placement: 'both'`, so:
1. **`app/(tabs)/stats.tsx` ~2018-2025** -- the Stats tab list. Already filters `type === 'graph' && visible`;
   the cap joins that existing condition.
2. **`app/(tabs)/index.tsx` ~4422-4426** -- the pinned section on Home. Already filters
   `type === 'graph' && placement === 'both' && dataKey`; same, one more condition.
3. **The Home PICKER (`index.tsx` ~4536/4539 collapsed preview and ~4727/4732 full list)** lists graphs you
   can pin. ⚠️ Needs the cap too, or a user can pin a sleeping graph.
4. **The Edit Stats modal gets the FULL list**, so the sleeping rows show, greyed with the flat gold lock,
   trash still available, eye dimmed (toggling visibility on a sleeping card means nothing).

⚠️ **DO NOT CATCH THE CREATOR PREVIEW.** `stats.tsx` ~2673 and ~2874 render a `StatsGraphCard` built from a
synthetic `creator_preview` card that is NOT in the saved list. Applying the cap carelessly would blank the
preview while somebody is building a graph.
✅ **SYSTEM CARDS CAN NEVER SLEEP, and that is structural already:** the Edit Stats modal keeps GRAPH CARDS
and SECTIONS as separate lists and rebuilds them separately on save (`stats.tsx` ~2461), so the cap only ever
touches graphs.

##### ⚠️⚠️ THE HAZARD UNIQUE TO GRAPHS: `saveStatsCards` TOMBSTONES MISSING DEFAULTS
`saveStatsCards` does not just save the list. It takes every DEFAULT card **absent** from the array you hand
it and writes those ids into `pj_stats_removed_defaults` as "the user deleted these on purpose", which stops
`loadStatsCards` from ever restoring them.
**So saving a shortened list would not merely drop somebody's custom graphs -- it would permanently tombstone
their DEFAULT graphs too, across two storage keys, silently, with no error.** This is the single most
destructive thing in item C.
**THE RULE: the shortened list is NEVER saved. State holds the FULL list; the cap is applied at render.**
- `saveStatsCards` has **12 call sites** (stats.tsx x10, index.tsx x2) -- period change, nutrient change,
  reorder, delete, add, visibility toggle, card edit. Every one maps over current state and saves the result.
  A free user with 5 custom graphs who merely changed a chart from 30D to 7D would have wiped the other four.
- ⚠️ **`app/(tabs)/index.tsx` ~2322 writes `pj_stats_cards` DIRECTLY with `storageSet`, bypassing
  `saveStatsCards` entirely** (the pinned-card period change). It therefore skips the tombstone logic, which
  makes it safer, not less safe -- but it is a 13th write path that a grep for `saveStatsCards` will miss.
- **Home must hold the full list in state** for exactly the reason the Log tab must, since it saves the card
  list three ways.
- 🚩 **LOGGED SEPARATELY:** that tombstone infers "user deleted it" from absence rather than from a real
  delete action. Nothing today triggers it wrongly, but it is a loaded gun in the save path and deserves its
  own roadmap item.

##### A HIDDEN GRAPH STILL COUNTS TOWARD THE CAP (agreed 2026-08-01)
The eye icon in Edit Stats is user-controlled hiding, and it is **independent of sleeping** -- a card renders
only if it passes BOTH (visible AND within the cap). A hidden card still occupies one of the 8, because caps
are CONCURRENT and count what you HAVE, not what is on screen. Otherwise hiding is a free way around the cap.
Practical effect: **hiding does not make room, deleting does** -- which is exactly what the wall modal says.
⚠️ Never build dormancy ON the `visible` flag; a downgraded user would just switch their extras back on.

---

#### 🟡 PIECE 5 -- HOW THE TWO DOWNGRADE CATEGORIES BEHAVE IN PRACTICE (mostly locked 2026-08-01)

The categories themselves were fully settled by pieces 2 and 4: **grandfathered content stays and simply
cannot grow; layout reverts by position.** What piece 5 turned out to be about is the practical moment --
**does the user ever find out?**

##### ⚠️ THE GAP: THE STEP-DOWN NOTICE ONLY COVERS THE FREE WEEK
`shouldShowStepDown` (`utils/firstWeek.ts`) is three flat checks: not entitled, the **7-day taste end date**
has passed, and a once-ever flag has not been set. That is correct for the taste and **wrong for everyone
else**:
- Somebody who subscribed LATER (after their taste ended and the notice already fired) and then cancels gets
  **nothing** -- their meal slots and stats graphs quietly revert with no explanation. That is a paying
  customer, and the group most likely to read a silent change as the app breaking.
- Because the flag is once-ever, subscribe -> cancel -> resubscribe -> cancel only ever tells them once.

✅ **DECIDED (Justin, 2026-08-01): a Supporter whose subscription ends gets the same notice.** Same modal,
wider trigger, nothing new built.
✅ **The hard part is already right:** that modal already knows to mention ONLY the two layout caps and never
the content ones (content is grandfathered, so warning about it would frighten people about a loss they are
not taking), and it already does the "defaults plus one" maths correctly. It is the TRIGGER that is narrow.

##### ✅ THE FREE-PLAN LIST WAS MISSING THE CREATION CAPS
`FirstWeekEndedModal`'s "Here's the free plan" bullets covered the AI limits and reports but said nothing
about any of the eight caps -- correct when written, incomplete now that item C exists. **New bullet,
Justin's wording:**
> - Room to keep building, within free limits

⚠️ **NO NUMBERS AND NO LIST, deliberately.** Eight numbers is a wall of text at the moment somebody is least
receptive, and any single number is a LIE for the person sitting over it (a taste user holding 30 custom
foods keeps all 30). The reassurance is already two lines above: "Everything you logged and built stays
exactly where it is. Nothing was deleted."
⚠️ Enumerating a few was tried and rejected repeatedly -- there are SIX content caps, so naming three or four
is wrong by omission every time. Do not reintroduce a list.

##### ✅ THE SUPPORT THE MISSION PAGE PERK (rewritten 2026-08-01)
The page already had this perk; its body named four of the caps and missed routines, programs, meal slots and
stats graphs. **New copy:**
> **Room To Build**
> The free limits come off. Nothing you create is capped, counted, or held back.

⚠️ **"HIGHER LIMITS" WAS WRONG AND UNDERSOLD IT BADLY** (Justin caught this): **seven of the eight go fully
UNLIMITED.** Only meal slots stay finite, going 5 to 8. So "the free limits come off" is the accurate frame,
with a slight round-up on that one row.
⚠️ **NO EXACT NUMBERS ON THIS PAGE EITHER** (Justin's call). Somebody reading it wants to know what they get,
not to audit an allowance. The moment a number matters is the moment they hit a wall, and the wall modal
handles that.
⚠️ The body deliberately does NOT open with "Build", since the title already owns that word.

##### ⚠️ THREE SURFACES DESCRIBE THE SAME TIER AND MUST MOVE TOGETHER
There is a warning already in `app/support.tsx`: this page, **the onboarding free-week block
(`app/onboarding/all-set.tsx`)** and **the step-down notice** all describe the same tier, and a user reads
them a week apart. If the wording drifts, the step-down stops reading as a promise kept. **Any change to one
lands in three places.**

##### ✅ THE SUPPORTER VERSION OF THE MODAL (decided 2026-08-01)
**Title: "Your Supporter Plan Has Ended".** Same shape as "Your First Week Is Up" -- a plain statement that a
period has closed, with no editorialising at somebody who just paid for months. Rejected: "You're On The Free
Plan" (evasive about what happened), "Thanks For Supporting This" (gracious but tells them nothing, and the
modal exists to explain a change they are about to notice).
**Icon: KEEP THE CALENDAR.** A checkmark was proposed and Justin knocked it down correctly -- a subscription
ending happened on a date exactly like a week running out, so the calendar fits, and a tick reads as
"transaction complete", which is a receipt and colder than this screen should be. Both versions are the same
modal about the same kind of event, so the same icon is consistency, not laziness. (If they are ever wanted
visually distinct, `time` -- a clock face -- is the closest sibling.) ⚠️ Do NOT use the gold Supporter sprout
here; that is the mark of BEING one, and this is the screen where they stop.

##### ✅ BILLING GRACE + THE STARTUP RACE (checked 2026-08-01)
**Grace periods: probably fine, and NOT the app's decision.** `MembershipContext` reads
`info.entitlements.active[SUPPORTER_ENTITLEMENT_ID]` and trusts RevenueCat's definition of active, with no
custom grace handling. RevenueCat keeps an entitlement active through a billing grace period, so a declined
card in retry should not flip anyone to free. ⚠️ **Unverifiable from the codebase** -- it is server-side and
depends on grace periods being ENABLED in the RevenueCat dashboard. Check there, not in the app.

⚠️ **THE REAL ONE, AND IT IS A LIVE BUG IN SHIPPED CODE: the step-down check does not wait for membership to
load.** `app/(tabs)/index.tsx` line ~1160 destructures ONLY `const { isSupporter } = useMembership()`. It
never takes `loading`. So at launch `isSupporter` is false-because-unknown and the effect starts running on a
real Supporter.
- What saves it today is pure timing: the notice waits 800ms, then waits for the launch splash, and when
  membership resolves the effect re-runs and its cleanup cancels the pending timer.
- **If RevenueCat answers slower than that window** (bad cellular at app open, which is not rare) a paying
  Supporter is told their plan ended. Worse, `markStepDownShown()` fires the moment it renders, so the
  **once-ever flag is burned**: a wrong notice now and no correct one later when they genuinely do cancel.
- ✅ **FIX: gate the effect on `loading` being false.** The flag already exists, and **this exact guard is
  already used one screen over for this exact reason** -- `MembershipContext` ~line 284 does `if (loading)
  return;` before `enforceIconEntitlement`, with a comment saying startup makes `isSupporter` briefly false.
  Not an invented fix; the codebase already solved this once.
- ✅ **Fails in the safe direction:** `loading` only turns false once RevenueCat resolves OR errors (there is
  a `.catch(() => setLoading(false))`). If it somehow never answered, the notice never fires -- far better
  than telling a paying customer they lapsed.

---

#### ✅ PIECE 6 -- WHERE THE CAPS GET ENFORCED (THE DOOR MAP, walked 2026-08-01)

**WHY THIS EXISTS: a missed door is not a visible bug, it is a cap that silently does not exist.** Nothing
errors, nothing looks wrong, the limit just is not there for anyone using that route.

⚠️⚠️ **THE METHOD IS THE POINT. TRACE THE HANDLER, NEVER THE BUTTON LABEL.** Cap 6 below was got WRONG the
first time by grepping for the words "Add Exercise" and assuming four matches meant four creation doors. Two
of them just navigate. The codebase even carries a comment warning about that exact confusion
(`workout-library.tsx` ~3401: *"CREATE, not 'Add'. This modal makes a NEW exercise in your library. The
Workout tab has its own..."*). **Every door below was verified by reading what the onPress actually does or
by following the storage write. Do the same for anything added later.**

##### EACH CAP NEEDS THREE THINGS
1. **The doors** -- every place creation starts.
2. **The count** -- how many they have right now, with presets/built-ins handled correctly (see the table).
3. **One shared place that owns it** -- all doors ask the same code "what is the cap, how many do I have, am
   I at it". Not eight screens each doing their own arithmetic. ⚠️ The number the TOAST shows (piece 3) must
   come from the same place, or the toast says 19 while the wall says full.

##### THE DOOR MAP
**1. CUSTOM FOODS (20) -- FIVE doors** (was six; one was deleted 2026-08-02, see below). The most of any cap.
   1. Log tab plus -> Create Food (deep-links to Add Food with `openCreate: '1'`) ⚠️ **the param path is
      checked AGAIN on arrival** -- otherwise any future deep link, notification or tutorial route using that
      param walks straight past the wall. Gate the ACTION, not only the button that usually triggers it.
   2. Add Food plus -> Create Food
   3. Scan banner -> **"None match? Create & Set food"**
   4. Food detail -> **Save as Copy** (the clone path, ends in the "Saved to My Foods" toast)
   5. Recipe builder -> add a custom food inline (`recipe-builder.tsx` ~720)
   🗑️ **DELETED 2026-08-02, do not restore: "Create Food for this Barcode"** at the bottom of the results
   list. Redundant BY CONSTRUCTION -- its condition (`lastScannedBarcode && !query.trim()`) was a strict
   subset of the scan banner's (`lastScannedBarcode`), so it could never appear without the banner button
   already on screen doing the identical thing. Its only job was catching you at the bottom of a long results
   list, and the banner is one flick away under the search box. It also looked washed out normally, because
   unlike the banner button it floated on the page with no container behind it. Locking it is what made the
   duplication obvious: two identical grey bars are harder to ignore than two blue ones.
   ✅ The AI meal estimator does NOT create foods -- verified by whole-repo grep of both the storage key and
   the creator component; it writes nutrition straight into the day's entry. ⚠️ If it or Otto ever gains a
   "save this as a food" button, that is door seven.
   ⚠️ `saveNewFood` in `add-food.tsx` looks like a door and is DEAD CODE -- nothing calls or renders it.

**2. SAVED MEALS (5) -- ONE door.** Log tab -> a logged meal's action column -> Save as Meal. The create
   function is called from exactly one line (`log.tsx` ~1125).
   ⚠️ **FUTURE DOOR: Otto's meal builder (plan item F) writes into this same catalog.** Supporter-only, so it
   cannot walk a free user into a wall, but meals Otto built DO count toward their total if they downgrade.

**3. RECIPES (5) -- TWO doors.** Log tab plus -> New Recipe, and Add Food plus -> New Recipe.
   ⚠️ **Gate the door that opens the builder with NO recipe id.** The same screen edits an existing recipe
   when an id is passed (from Add Food and from the recipe log). Gate the screen and a free user with five
   recipes cannot fix a typo in any of them.
   ⚠️ The recipe tutorial injects a demo recipe into the same list -- never block it, never count it.

**4. ROUTINES (5) -- TWO doors.** ⚠️ **THIS SAID "ONE" AND WAS WRONG. Corrected 2026-08-02.**
   1. Workout Library plus -> Create Routine (`setEditingRoutine(null)`).
   2. **Duplicate**, on every PRESET routine card, next to USE. It writes a copy straight into `pj_routines`
      (`saveMyRoutines([...myRoutines, copy])`) and shipped with no cap check at all, so a free user could
      sit staring at a locked Create Routine button and keep making routines from it indefinitely.
   Tapping one of your own opens the same builder to edit; never blocked.
   ✅ **THE "CHECK AT BUILD" QUESTION IS ANSWERED: loading a preset does NOT spend one of your five.** `USE`
   calls `openLoadRoutinePicker`, which only puts the preset onto a DAY and never writes `pj_routines`.
   Verified by following all three `saveMyRoutines` call sites (create/edit, delete, duplicate). Never gate USE.
   ⚠️ **HOW THE MISSED DOOR WAS FOUND, because it is the same lesson as cap 6:** by following the STORAGE
   WRITE rather than the buttons. Grepping the screen for creation-looking labels finds Create Routine and
   stops. Grepping for `saveMyRoutines` finds all three.

**5. PROGRAMS (3) -- ONE door.** Workout Library plus -> Create Program (`setEditingProgram(null)`).

**6. EXERCISE LIBRARY (15 of your own) -- TWO doors.** ⚠️ **This is the one that was got wrong.**
   1. Exercise Library plus -> **Create Exercise** (`openAdd()`)
   2. **"Create new exercise"** link inside the Create Routine modal (`workout-library.tsx` ~1685)
   Both feed the same single write, so it is two doors and one save.
   ⚠️ **THREE buttons say "Add Exercise" and NONE of them create anything:** the inline one on the Workout
   tab and the one in its plus menu both just `router.push` to the library in select mode; the Workout tab's
   own Add Exercise MODAL writes into that DAY's exercise list, never the library. **Blocking any of them
   would stop a free user building a workout from exercises they already own.**
   ⚠️ The library's plus menu has NO select-mode guard, so Create Exercise is reachable when you arrive from a
   day too. Same button, same modal, same save -- gating it once covers both routes.
   ⚠️ **FUTURE DOOR:** Otto creating an exercise (item A resolution 3). Supporter-only by design.

**7. MEAL SLOTS (5) -- ONE door.** Edit Meal Slots -> Add Meal Slot. The function is defined once and called
   from that one button. **Easiest of the eight: the enforcement already exists** as a hardcoded `>= 8` with a
   disabled state and "Maximum 8 slots reached" copy. It just becomes tier-aware, plus dim + gold lock.

**8. STATS GRAPHS (8) -- ONE door.** Stats plus -> Add Graph. Verified by tracing `generateCardId`, which is
   used in exactly one place. ✅ Home can pin, unpin, edit, delete and change a graph's period but **cannot
   create one** -- checked specifically. ⚠️ The tutorial drives the creator open itself; never block it.

##### ⚠️ THE COUNT RULES ARE NOT THE SAME ACROSS CAPS. GETTING THIS BACKWARDS BREAKS THEM.
| Cap | How to count |
|---|---|
| Custom foods, saved meals, recipes | Raw list length. Nothing is seeded. |
| Routines | Your own only. Presets render from a separate section, not your list. |
| **Programs** | ⚠️ **EXCLUDE built-ins -- they are seeded into the SAME list as yours.** |
| **Exercise library** | ⚠️ **EXCLUDE built-ins -- the app's own exercises live in the SAME list.** |
| Meal slots | ⚠️ **RAW TOTAL, defaults included.** 5 = the 4 that ship + 1 of yours. |
| Stats graphs | ⚠️ **RAW TOTAL, defaults included.** 8 = the 7 that ship + 1 of yours. |

⚠️ **SOMEBODY WHO JUST LEARNED THE "SKIP THE BUILT-INS" RULE FROM PROGRAMS/EXERCISES WILL APPLY IT TO MEAL
SLOTS AND GRAPHS AND HAND EVERY FREE USER FOUR EXTRA SLOTS.** The two layout caps are raw totals.

⚠️⚠️ **EXCLUDE BUILT-INS BY IDENTITY, NEVER BY NUMBER (Justin, 2026-08-01).** Plan item J adds 60+ exercises
(~79 to ~143). Anything that computes "how many minus 79" silently gives every user on earth 60 extra slots
of allowance the day J ships, or takes them away, depending which way it runs. Nothing errors. The count must
ask *"did the USER make this"*, never *"how many are there, minus the ones that shipped."*

##### 🎓 TUTORIALS ARE NEVER CAPPED, ON ANY OF THE EIGHT
Custom foods, recipes and stats graphs all have tutorials that drive their creator open directly, and the
recipe one injects a demo recipe into the real list. Each opens by its own path, separate from every
user-facing door, so there is a clean place to make the distinction -- but it must be deliberate or a free
user at their cap dead-ends inside a tutorial.

---

##### 🗄️ THE FALLBACK, KEPT ON PURPOSE -- MODAL ONCE, THEN TOAST
**Not the plan. Kept because "modal every time" is a "we can try it", and if it reads as too much on device
this is what we fall back to** rather than re-deriving it from scratch. Justin, 2026-08-01: "can you leave
the 1 time modal and then toast idea in there but say we agreed on the modal every time? just in case modal
every time is too much?"

The shape was: modal on the **first** tap at a given cap, **toast** every tap after, with first-time state
stored **per cap** (not per app -- hitting the recipe wall teaches nobody anything about the exercise
library) the same way `pj_tooltip_{key}` already stores seen-state.

Toast copy never got settled, and the reasons are the useful part:
- **At the cap**, approved and then reopened by Justin ("i feel like the toasts need the supporter mention"):
  `My Foods is full` / `Free accounts hold 20. Delete one to make room.`
- **Over the cap:** never settled. Rejected: `All 30 are still yours to log and edit.` (Justin: a consolation
  pat on the back -- by the fourth tap nobody wants reassurance, they want to know why the button did
  nothing) and `New foods need the Supporter plan.` (Justin: "thats so amateur" -- reads like a vending
  machine). Lukewarm best: `The Supporter plan makes room to keep building.` Last draft, untested:
  `No room for new foods` / `The Supporter plan opens My Foods back up.`
- ⚠️ **If this fallback is ever picked up, the tappable-toast question comes back with it.** Naming the
  Supporter plan in a toast collides with the standing rule that the plan is never named without a Support
  the Mission jump. Making toasts tappable = an OPTIONAL tap handler plus a chevron shown only when one is
  passed, so all ~40 existing toasts pass nothing and are untouched; an optional duration is the same
  additive change. **Justin's verdict on that work, and it stands: not worth it** -- 2.2 seconds at the
  bottom of the screen means almost nobody taps it, Support the Mission already has a permanent home on the
  Profile tab, and navigating out of a toast that fired while a FAB menu or modal is open is its own problem.

**⚠️ THIS DOES NOT COVER MEAL SLOTS OR STATS CARDS.** Those are the two REVERT rows, and their wall arrives
without anyone tapping anything: a lapsed Supporter's 8 meal slots become 5 while they are not even in the
app. Nothing above applies to that moment. Pieces 4 and 5.

### THE MILESTONE ASK (AGREED 2026-07-28) -- an Otto hub card, never an interruption

WHY IT EXISTS: today the app only asks at WALLS. Someone has to run out of Otto messages or tap a locked
feature to learn Supporter exists, and most people never hit either. This is the one ask that reaches people
who are happy, rather than people who are blocked.

DELIVERY: a card in **Otto's notification hub** (the bell), exactly like the Rate Us fallback card in
utils/ottoPrompts.ts. NOT a modal, NOT a popup, NOT Apple-dialog-style. A trigger PLACES the card and does
nothing else; the user sees a red dot and reads it when they choose to. This is deliberately gentler than
Rate Us, whose triggers fire Apple's review dialog directly -- asking for money should cost less of
someone's attention than asking for thirty seconds, not more. `replace` lifecycle so it can never stack.

TRIGGERS: **all nine existing Rate Us triggers**, reused as-is. water goal, gratitude, reading plan,
devotional, protein, weight milestone, weight goal, manual workout completion, challenge win.
⚠️ Claude first proposed cutting this to the three "big" moments (weight goal, weight milestone, challenge
win) on the theory that a money ask should follow a real achievement. Justin rejected that, correctly:
weight goal may fire once ever, challenge win may fire never, and a trigger that rare means the card never
appears at all. TWO THINGS DISSOLVE THE ORIGINAL CONCERN: (1) the copy never references the trigger, so
nobody ever sees "great job on your water goal, now pay me" -- the trigger decides WHEN the card is placed,
not what it says; (2) **the BUDGET controls how often someone is asked, not the trigger list.** More
triggers only means it lands sooner, never more often. Being stingy with triggers only risks it never
landing. Reuse the existing `fireRatingTrigger()`-style 3s delay so it never fights the celebration or
toast from the same action.

TIMING (Supporter ask vs the existing Rate Us numbers):
| | Rate Us (existing) | Support ask |
|---|---|---|
| Minimum account age | 7 days | **14 days** |
| Cooldown between asks | 30 days | **60 days** |
| Lifetime cap | 3 | **4** |
- 14 days, not 7, puts a full week between the step-down notice (day 7) and the first money ask. Asking in
  the same week as "your free week ended" would feel choreographed.
- 60 days, not 30: a review costs thirty seconds, a subscription is recurring. Every other month reads as
  patient; monthly reads as pestering.
- 4, not 3: roughly one ask every two months across the first year, then permanently quiet.
- Own budget, separate from Rate Us. Note the codebase already REJECTED merging Rate Us + Feedback into one
  shared budget (ottoPrompts.ts) because one running out would silence the other. Same reasoning here.
- **14-day hold-back either side of a Rate Us ask**, so the two never read as a pair. (Precedent:
  `FEEDBACK_HOLD_BACK_AFTER_RATE_ASK_DAYS = 5` already does this for the Feedback card.)
- Never during the 7-day taste. Never for existing Supporters. Free users only.
- **The step-down notice BEATS the Rate Us prompt 100% of the time** (see the first-week section below).

COPY (agreed after ~15 drafts; the rejected directions matter as much as the winner):
  Title: More of GoodForge
  Body:  Unlimited photo estimates, more time with Otto each day, custom reports, custom goals, and limits
         lifted app wide.
         See what's included.
⚠️ DIRECTIONS JUSTIN EXPLICITLY REJECTED, do not re-propose them:
  - "Pay so other people don't have to" / covering the cost for everyone else. Disliked the vibe outright.
  - "Help keep GoodForge free" in any phrasing.
  - The "one person built this all by myself" angle -- reads as self-congratulation.
  - "What Supporters get" as a title -- reads cheap and amateur, like a pricing page header.
  He wanted SELLING, but humble: state the perks plainly, no pleading, no mission speech, no boasting.
LEAD WITH THE ESTIMATOR -- it is the strongest single selling point (see the first-week section).
The closing line is Justin's call and is deliberately functional, not persuasive. Note the Rate Us card has
no closing line; this one does.
ACCURACY NOTE: "limits lifted app wide" is honest because every gated limit is either removed or raised.
The one exception is HALO, which stays 25/day for free and Supporter alike. A user would have to go looking
to notice, and "faith is never upcharged" is a good answer if they do.

### THE FIRST WEEK: A 7-DAY TASTE, THEN STEP DOWN (AGREED 2026-07-28)

New accounts run on FULL SUPPORTER limits for 7 days, then step down to free. Announced up front, never
silent. This is deliberately NOT an Apple free trial: no card, no commitment, no cancellation, nobody can
ever be billed by accident. It exists to create CONTRAST, which is what actually converts -- a limit only
means something to someone who has felt what it is like without it.

✅ **BUILT AND DEVICE-VERIFIED 2026-07-31.** All ten parts were walked with Justin, checked against the real
code and the RevenueCat API, then built and tested on his iPhone in four batches. Everything below stands,
with additions marked "CONFIRMED 2026-07-31". Item A (SPEC_otto.md) is what this taste steps DOWN from, so
read that first.

⚠️ **THE TASTE ITSELF WORKS. WHAT IT ANNOUNCES LARGELY DOES NOT, YET.** The entitlement genuinely starts and
ends, so anything already gated behind Supporter status locks correctly (reports, Comparison, the deeper EvR
cards, and the AI caps dropping to 10/day and 5/month). But **item C is not built at all** -- there are no
caps on anything, nothing goes dormant, and extra meal slots and stats cards do NOT revert. **Item B is not
built either**, so Otto still does everything for everyone. Both the onboarding block and the step-down
modal are therefore writing cheques B and C have to cash. Fine pre-launch; **neither may reach TestFlight
until B and C are done.**

#### WHAT IS ACTUALLY BUILT (files, so nobody re-derives it)
- `functions/src/firstWeek.ts` -- `grantFirstWeek` + `revokeFirstWeek` callables, deployed.
- `utils/firstWeek.ts` -- the claim + retry, the stored end date, the once-ever flag, the dev expiry.
- `app/onboarding/all-set.tsx` -- the announcement block, and the grant on the final button tap.
- `MembershipContext.tsx` -- `details.isFirstWeek`, the cache invalidation, and the launch retry.
- `components/MembershipCard.tsx` + `app/support.tsx` -- the taste wording on all three surfaces.
- `components/FirstWeekEndedModal.tsx` + the effect in `app/(tabs)/index.tsx` -- the step-down notice.
- Dev rows in Settings: **Grant First Week**, **End First Week Now**, **Revoke First Week**.

#### HOW THE STEP-DOWN DECIDES TO FIRE (three flat questions, no transition-watching)
`pj_first_week_ends_at` is stored the moment the week is granted, so the notice never has to catch an
entitled -> not-entitled transition (fragile: it depends on being alive for one particular launch). Instead:
is that date past, are they no longer entitled, and has `pj_first_week_stepdown_shown` not been set. Same
logic in testing and production.
⚠️ The "no longer entitled" half is also what stops it firing for someone who SUBSCRIBED during their week.
Their taste end date passes identically, but nothing was taken from them.

#### ⚠️ THE TIMING, AND THE TWO WAYS THAT LOOK RIGHT AND ARE NOT
**Correct: an ~800ms `setTimeout` FIRST, then `runAfterLaunchSplash`.** Identical to the Day/Week/Month
summary path in the same file. This is the one arrangement that behaves.
❌ The splash gate ALONE (no delay) lands on top of the launch cinematic.
❌ Gate first, then a short pause, ALSO lands on the cinematic.
Match the summaries rather than reasoning about it from first principles. Two cleverer orderings were tried
on device and both failed.
⚠️ **AND NULL THE TIMER REF IN CLEANUP, not just `clearTimeout`.** The effect re-runs the moment membership
resolves from loading to free; cleanup cancels the pending timer, and if the ref still holds the dead handle
the next pass sees "a show is already pending" and returns early FOREVER. Cost an hour.

#### THE OVER-CAP LINE, precisely
Only ever mentions the two LAYOUT caps. Content people made (custom foods, recipes, saved meals, custom
exercises) is GRANDFATHERED, so nothing there disappears and naming it would frighten them about a loss they
are not taking.
⚠️ **Both caps are "defaults plus one", never raw totals:** meal slots = the 4 defaults + 1 = **5**; stats
cards = the **7 default GRAPH cards + 1** (system cards are not in the cap at all).
Wording, built from whichever they are actually over:
- Slots only: *"Your meal slots go back to five. The extras are saved and waiting if you come back."*
- Cards only: *"Your extra stats cards go back to the standard set. They're saved and waiting if you come back."*
- Both: *"Your meal slots and stats cards go back to the free layout. The extras are saved and waiting if you come back."*

HOW IT IS BUILT -- and it is far less work than it first looks. A trial IS Supporter status with a known end
date, exactly like a monthly sub someone cancelled in iPhone settings (entitled, `periodEnd` set,
`willRenew: false`). The app already renders that shape. So: grant a **7-day RevenueCat PROMOTIONAL
ENTITLEMENT** on onboarding completion -- the same mechanism already used to comp testers, just time-boxed
and granted programmatically. `REVENUECAT_SECRET_KEY` is already wired into the Cloud Functions.
Everything then falls out for free: every gate opens because `isSupporter` is genuinely true; the Membership
card and Support screen show the end date with no new code; it expires on its own so there is no timer or
scheduled job; it is SERVER-SIDE so a reinstall cannot farm it; and the lapse is detectable through the same
path as a real subscription ending, so the notice reuses the same modal.
(Claude initially called this a "third membership state" and a real bit of plumbing. Justin pushed back --
correctly -- that it is just Supporter with an end date. Do not rebuild it as a separate state.)

#### ✅ CONFIRMED 2026-07-31 -- the mechanism checks out, plus four build notes
- **The grant is `POST /subscribers/{app_user_id}/entitlements/{entitlement}/promotional`** on the SAME v1
  REST API `functions/src/membership.ts` already calls, with the SAME secret key. Nothing new to wire.
- ✅ **A CUSTOM END TIME IS AVAILABLE.** The API takes `end_time_ms` (an arbitrary epoch) as well as the fixed
  duration buckets. So the week CAN be set to expire at **local midnight on day 7** rather than at whatever
  o'clock they finished onboarding. This closes the "check at build time" question below.
- **Entitlement identifier must be exactly `supporter`** -- the one every gate checks. RevenueCat will
  happily accept a differently-named entitlement while nothing in the app unlocks.
- ⚠️ **THE GRANT CAN FAIL SILENTLY.** Onboarding finishes, the call errors, and the user gets no taste at all
  while the screen just told them it was on us. Needs a **prompt retry** (not once-a-launch-tomorrow, or they
  spend a day hitting free limits during their free week). `isSupporter` already does a live RevenueCat
  lookup on a cache miss, so verifying costs nothing new.
- ⚠️ **A SERVER-SIDE "ALREADY HAD THEIR WEEK" RECORD IS LOAD-BEARING, not a nice-to-have.** It stops the retry
  granting twice, AND it is what stops a reinstall farming a second week (the onboarding-complete flag is
  LOCAL, so a reinstall re-runs onboarding).
- ✅ **IDENTITY IS SAFE, verified two ways.** `app/_layout.tsx` routes anyone without a user to sign-in, and a
  signed-in user with onboarding incomplete goes through sign-in too, so onboarding CANNOT run unauthenticated.
  And `MembershipContext.tsx` calls `Purchases.logIn(user.uid)`, so the RevenueCat app_user_id IS the Firebase
  uid. A server-side grant keyed to the uid lands correctly even if the client has not finished logging in.
- ✅ **WEBHOOK EMAIL SPAM IS ALREADY GUARDED**, do not re-solve it. `revenueCatWebhook.ts` skips the
  new-Supporter email when `event.store === 'PROMOTIONAL'` or the product id starts with `rc_promo_`. That
  guard exists because granting the testers emailed Justin once already.

LENGTH: 7 DAYS. Justin's ceiling was "definitely not more than 7", and 3 was rejected as actively pointless:
days 1-3 of a fitness app are setup (profile, goals, finding things), so a 3-day taste passes unnoticed --
you pay for it and get no contrast. A week is the minimum where someone uses the app enough to feel a
difference, and it covers a weekend, when eating patterns change.

⚠️ SUPERSEDED 2026-07-29 BY SPEC_otto.md -- THIS IS NO LONGER JUST AN ESTIMATOR TASTE.
The paragraph below was written when Otto's ONLY Supporter perk was a higher message cap, which nobody
notices. Otto is now being split free vs Supporter (advice free, artifacts paid), so the taste becomes:
for seven days Otto knows your numbers, builds your workouts, and builds your meals -- then he stops.
That is a real before-and-after, and it is the mechanic the free tier's acceptability now RESTS on. Lead
with the estimator AND Otto now, not the estimator alone. Read SPEC_otto.md before writing either copy.

THE ORIGINAL REASONING, kept because the estimator half is still true: Free Otto is 10/day and most people
send one or two, so for the vast majority the message cap alone gives them nothing they notice and the
step-down takes nothing away. The AI MEAL ESTIMATOR is where it bites: free is 5/MONTH, and a curious new
user photographing meals can burn 5 in two days. Going from "photograph everything" to "five a month" is a
difference someone genuinely feels.

ANNOUNCE IT UP FRONT, on the final onboarding screen, naming exactly what they get. Being quietly generous
and then taking it away is a rug pull; saying it plainly makes the step-down a promise KEPT.

#### ✅ THE ANNOUNCEMENT -- BUILT 2026-07-31 (app/onboarding/all-set.tsx)
- **NO new onboarding screen.** It lives on the existing `all-set.tsx` payoff screen. Precedent: `commitment.tsx`
  was CUT for being corny and for breaking the step count, and a "you got a free week" screen would repeat that
  mistake.
- **MERGED INTO ONE CARD** with the three existing how-to rows. The week block sits ON TOP (it is the news),
  the how-to rows underneath (they are reference). Two separate cards read as two competing objects and the
  second one lost.
- **The grant fires on the final button tap**, the same action that writes `pj_onboarding_complete`. ⚠️ There
  are TWO buttons on that screen ("Set Up My Home Screen" and "Set it up myself"), so it must fire on either.
  ⚠️ Do NOT block the button on the grant -- navigate immediately, grant in the background, retry if it fails.
- ⚠️ **CURRENTLY UNGATED.** None of the taste logic exists, so the block shows for EVERYONE and names builders
  (E, F) that do not exist. There is a comment in the file saying so. **Must not reach TestFlight until D, B,
  E and F are real.** Justin accepted this deliberately since the app has not launched.
- **The copy, as shipped:**
  > **Your first week is on us**
  > Seven days with everything unlocked. Free, no credit card, nothing to cancel.
  > • Otto builds workouts straight into your Workout tab
  > • He puts meals together from food you actually eat
  > • His answers use your real numbers
  > • 30 messages a day with Otto and Halo, up from 10
  > • Custom Reports, Comparison and your full Effort vs Results open up
  > • 100 AI Meal Estimates a month, up from 5
  > When the week is up the app eases back to the free plan, and everything you built stays exactly where it is.
- ❌ **A Supporter-plan mention was tried on this screen and CUT.** They have been in the app four minutes and
  have felt no limits, so it has nothing to attach to and sours the one screen whose job is being generous.
  The step-down notice carries that message seven days later, when it lands.
- ⚠️ `AI Estimate` was renamed to **`AI Meal Estimate`** on the estimator screen the same day, so the page
  finally matches the button in Add Food.
- ℹ️ Coach Insight is FREE and stays out of both lists. Patterns lives inside Effort vs Results, so it is not
  listed separately.

#### ✅ CONFIRMED 2026-07-31 -- the passive end date is nearly free, and the taste keeps the GOLD
- `components/MembershipCard.tsx` already builds its date line as **`${willRenew ? 'Renews' : 'Ends'}`** plus
  the date, and that card is SHARED across Profile and Settings. `app/support.tsx` renders its own version of
  the same thing. A promotional entitlement does not renew, so it would already read "Ends Aug 7, 2026" with
  no new code.
- ⚠️ **BUT "Ends" is the cancelled-subscription voice** and reads faintly like a punishment for someone seven
  days into a gift. **DECISION: the taste gets its own wording** -- card title **"Your first week"** (not
  "You're a Supporter", which is not true of someone who has not supported anything) and a **"Free week ends
  Aug 7"** date line. Applies to the Membership card AND the Support screen; anywhere the app says "You're a
  Supporter" has to know the difference or the two screens will contradict each other about the same person.
- ✅ **THE TASTE KEEPS THE FULL GOLD TREATMENT, sprout and all** (Justin, explicit). Only the WORDS change.
  Showing them exactly what the paid state looks and feels like is the entire point.
- **HOW TO TELL A TASTE FROM A REAL SUB:** key off the entitlement's SOURCE (promotional vs App Store), NOT
  `willRenew` -- that reads false for a free week AND for a cancelled subscription, so it cannot tell them
  apart. ⚠️ Confirm exactly how `react-native-purchases` surfaces that field at build time; five-minute check.
- ✅ **BUYING DURING THE FREE WEEK RESOLVES ITSELF.** They then hold two sources of the same entitlement, and
  RevenueCat serves whichever reaches furthest -- a monthly or annual sub always outlasts the remaining days.
  So the card flips to "You're a Supporter, Renews ..." the MOMENT they buy, not on day 8. No special handling.
  ⚠️ There is no way to defer an Apple subscription's start date, so a few days of overlap is unavoidable. The
  end date being on screen means they can see it and choose knowingly. Accepted, do not chase.

SHOW THE END DATE PASSIVELY -- no countdown. A daily countdown creates low-level anxiety and nags. Instead
the end date appears where membership status already appears: the Membership card (Profile + Settings) and
the Support screen, reading like a cancelled sub ("Full version until 4 August"). Findable if curious,
invisible if not. This comes free with the promotional-entitlement approach above.

THE STEP-DOWN NOTICE: same centred modal + same deferral rules as MOMENT A below (retries each launch, takes
the first opening, own once-ever flag). Frame it as a promise kept, not something taken away -- they never
paid, so there is nothing to thank them for. NAME THE ACTUAL NUMBERS; vague copy ("some limits now apply")
makes people imagine something harsher than the truth.
#### ✅ THE STEP-DOWN COPY -- REWRITTEN 2026-07-31 (the old draft below is superseded)
⚠️ **THERE ARE TWO STEP-DOWN EVENTS AND FOUR MESSAGES. Do not merge them:**
| Event | Message |
|---|---|
| Free week ends | this modal |
| Paid subscription ends | MOMENT A's modal |
| First WALL after the free week | Otto's in-chat explanation (SPEC_otto.md, trap 4) |
| First WALL after a subscription lapses | Otto's other in-chat explanation (SPEC_otto.md, trap 4b) |
Each event gets an app modal when it happens, and an Otto line the first time it actually bites. Different jobs.

⚠️ **THIS ONE SELLS. MOMENT A DOES NOT.** A taste user never paid you anything, so there is nothing to thank
them for and asking is fair. A lapsed subscriber gave you money for months, so that one is gratitude and asks
for nothing. **This also explains the apparent contradiction in this spec:** Moment A says keep the copy
GENERAL and never enumerate features ("it reads like a punishment list"), while this one NAMES the numbers.
Both are right for their own situation -- a taste user was told these exact numbers seven days ago, so
repeating them is the promise being KEPT. Do not "fix" one to match the other.

**COPY (agreed 2026-07-31). Numbers deliberately mirror the onboarding block word for word:**
> **Your first week is up**
>
> Everything you logged and built stays exactly where it is. Nothing was deleted.
>
> Here's what the free plan looks like:
> • Otto answers anything, but stops building workouts and meals
> • 10 messages a day with him and with Halo
> • 5 AI Meal Estimates a month
> • Your reports go back to the free view
>
> [Become a Supporter] [Got it]

- ⚠️ **LEAD WITH THE REASSURANCE, do not end on it.** Ending on it means they read four bullets of things going
  away before finding out their data is safe. Flipped, the list lands as information rather than loss.
- **The reports bullet is deliberately VAGUE** (Justin's call) -- it covers Custom Reports, Comparison, the
  deeper Effort vs Results cards and Patterns without listing any of them. Onboarding names them; this does not.
- **PLUS the conditional over-cap line** from the DOWNGRADE BEHAVIOUR section, shown ONLY to the minority who
  are actually over on meal slots or stats cards.
- ℹ️ "Become a Supporter" as a BUTTON is fine. SPEC_otto.md's naming rule (never the bare word, never equate a
  feature WITH the plan) governs explanatory sentences, not buttons and titles.
✅ **RESOLVED 2026-07-30 (SPEC_otto.md open item 2): the promise holds, with ONE wording fix needed.**
Everything Otto BUILT survives permanently -- workouts, meals, recipes -- on both downgrade paths (taste
ending AND a Supporter cancelling). Content she logs with (recipes, saved meals, custom foods) is
GRANDFATHERED even when over the free cap; only NEW creation is blocked until she is back under.
⚠️ BUT two things DO step down, so "everything stays exactly where it is" is not literally true: **meal
slots revert 8 -> 5 and stats cards revert 4 -> 1** (extras go dormant, top of her own order survives,
nothing is deleted, all of it returns on resubscribe). The copy must not promise more than that. Full
detail and the reasoning is in SPEC_otto.md open item 2.
➡️ **FIX: make that line CONDITIONAL, not a blanket warning (decided 2026-07-30).** `DEFAULT_MEAL_SLOTS` is
exactly 4 (Morning, Lunch, Dinner, Snacks) and the free cap is 5, so a free user gets the defaults plus one
of their own. Only someone who added several extras during their week is affected, which is a minority. So:
- NOT over either cap -> leave the copy as it is. It is completely true for them.
- OVER on slots or stats cards -> add ONE sentence, roughly: *"Your extra meal slots and stats cards go back
  to the standard layout. They're saved, and they'll be right there if you come back."*
Nobody gets warned about a loss they are not taking, and the person who IS taking it hears it from the app
rather than discovering it Wednesday morning when their Log tab looks different.

### ⚠️ WHEN A DOWNGRADE ACTUALLY LANDS (decided 2026-07-30 -- applies to the taste AND to any cancellation)
- **CAPABILITIES drop immediately** when the entitlement ends (Otto's data access, building things, message
  caps). Nothing on screen changes, so there is no reason to delay them.
- **LAYOUT CHANGES wait for the next LOCAL DAY BOUNDARY** (meal slots, stats cards, anything visual).
- **WHY:** the taste is a 7-day RevenueCat promotional entitlement granted at onboarding completion, so its
  expiry is a TIMESTAMP, not midnight -- and for a real cancellation Apple owns the moment entirely. Without
  this rule someone who logged lunch into slot 7 would watch that row vanish off the screen mid-afternoon.
  With it, the new day starts empty, so nothing is ever stranded and no data migration is needed.
- ⚠️ CHECK AT BUILD TIME whether the promo grant can carry a custom end date so it lands on local midnight
  anyway. Nice to have, not required.

⚠️ THE STEP-DOWN NOTICE BEATS THE RATE US PROMPT, 100% OF THE TIME (Justin, explicit). These are scheduled
to collide for EVERY user, by design: utils/ratingPrompt.ts has `MIN_ACCOUNT_AGE_DAYS = 7` and the trial ends
at day 7, so both become eligible on the same launch. The step-down explains why the app just changed
behaviour and must land first; a review request can wait a day. Asking for a review in the same breath as
telling someone their free week ended is bad timing regardless.

RULES SETTLED:
- CLOCK STARTS AT ONBOARDING COMPLETION, not install. Someone who installs and does not return for ten days
  must not have burned the week without using it.
- NEW ACCOUNTS ONLY, from the day this ships. Moot for the current TestFlight group (all comped a year of
  Supporter), but it stops every existing user being handed a free week for nothing.
- ALREADY A SUPPORTER (comped tester, or subscribes during onboarding): SKIP ENTIRELY. No announcement, no
  step-down notice.
- OVER-LIMIT AFTERWARDS is already solved by the concurrent rule + downgrade principle above: build 25 custom
  foods during the week, step down to 20, keep all 25, simply cannot add more. No deletions.

### DOWNGRADE BEHAVIOUR (PRINCIPLE AGREED 2026-07-28 -- applies to EVERY limit above)

This is a PREREQUISITE, not a detail. Nothing above can ship until it is settled, because it governs
ordinary churn (a card expires, someone cancels) as well as any trial or taste-then-step-down scheme.

**THE PRINCIPLE: downgrading removes the ability to CREATE or CHANGE. It never removes the thing itself.**

So a user with 40 custom foods who drops to a free limit of 20:
- All 40 STAY. Visible, searchable, loggable, completely unchanged.
- They cannot add a 41st until they are back under the limit.
- Nothing is deleted, hidden, greyed out, or made read-only-looking.

CUSTOM MACROS / NUTRITION GOALS -- THE IMPORTANT CARVE-OUT: their numbers STAY. They simply cannot change
them again without resubscribing. Do NOT revert anyone to a preset. Silently moving someone's calorie or
macro targets because their card expired would change what the app tells them to eat, through no action of
their own. That is hostile, and it is the single worst thing this feature could do.

This is the same line the section above already draws: cap creation, never touch data they already made.

⚠️ DAY-ONE MIGRATION: EXISTING USERS WILL BE OVER THE LIMIT THE MOMENT THIS SHIPS. This is the same shape as
a downgrade but it is NOT the same event, and it hits far more people. Anyone who has already built 40 custom
foods is instantly over a 20 cap, having never been a Supporter and having done nothing wrong. The rule above
handles it correctly (keep all 40, cannot add a 41st), but two things follow that are easy to get wrong:
- THE WALL COPY MUST NOT READ AS AN ACCUSATION. "You have exceeded the limit" is false and insulting here --
  they did not exceed anything, the limit arrived underneath them. Wording has to work for BOTH a user who
  filled 20 slots normally and a user who woke up at 40.
- THESE USERS GET NO LAPSE NOTICE (nothing lapsed), so the first they learn of it is the wall itself. Decide
  deliberately whether that is acceptable or whether the migration deserves its own one-time note. NOT YET
  DECIDED -- raised 2026-07-28, flagged rather than resolved.
Do not treat this as an edge case. On the day these limits ship it is the MOST common way anyone encounters
them, because every long-standing user meets it at once while brand-new users meet it never.

TELL THEM, ONCE, GRACEFULLY. Silence is worse -- they would hit a wall weeks later with no idea why.

⚠️ THESE ARE TWO SEPARATE MOMENTS. Do not write one piece of copy for both (the first draft did, and read
as if custom foods were the only thing affected):

MOMENT A -- THE MEMBERSHIP ENDS. A one-time CENTRED MODAL (house pattern; never a bottom sheet) on the next
app open after the entitlement lapses. MembershipContext already tracks entitlement, so the client can
detect the entitled -> not-entitled transition. Deliberately NOT Otto: he is a helper, and having him
deliver billing news muddies what he is for. Shown ONCE. No guilt, no urgency, no countdown, never repeated.

⚠️ IT MUST DEFER, NOT COMPETE (Justin spotted this 2026-07-28). A subscription lapses overnight, so the very
next launch is exactly when a Day/Week/Month Summary is most likely to fire -- the collision is likely, not
theoretical. RULE: it RETRIES on every launch and takes the first opening where nothing else is on screen.
Summary wins; the notice waits. It is a once-ever message that is not time-sensitive, so being a day late
costs nothing, whereas stacking two modals on someone the moment their membership ends is a bad first
impression of the free tier. It carries its own "shown" flag so it can still only ever appear once.
DO NOT build a general modal queue for this -- roughly ten lines of deference, not a framework.

⚠️ KNOWN GAP, NOT URGENT, WILL BITE AGAIN: there is NO cross-system modal coordination in the app. What
exists today is local: the summaries self-limit via `pj_last_summary_shown` (one per day, and only ONE kind
of day/week/month ever fires) and wait for the launch splash via `runAfterLaunchSplash`; Rate Us has its own
independent budget (3 asks ever, 7-day minimum account age, cooldowns) in utils/ratingPrompt.ts. They do not
collide today because they trigger at different moments, not because anything prevents it. Every future
launch-time modal inherits this problem and the current answer is "hope they don't overlap."
Copy stays GENERAL -- do not enumerate every gated feature, it gets long and reads like a punishment list.
DRAFT COPY (not locked, Justin to refine):
  "Your Supporter membership has ended. Everything you created is still yours and stays exactly where it
   is. A few things are paused for now, like adding new custom items and editing your custom goals. If you
   ever want to pick it back up, the door is open."
Tone target: thank them for what they gave, be clear about what changed, ask for nothing.

MOMENT B -- THEY HIT A SPECIFIC WALL LATER (trying to add the 41st custom food). THAT is where the copy
names the specific thing, in the existing locked-state pattern. It must also handle the case where the user
is legitimately ABOVE the free cap through no fault of their own, so the wording cannot imply they did
something wrong.

BUILD COST, stated honestly so it is not a surprise: eight separate limits, each needing a count, a check at
the moment of creation, a locked state with its own copy, the Supporter branch, AND the over-limit state
above (someone can legitimately be above a free cap without having done anything wrong). Justin's words:
"i know it will be a bitch to build and test but so be it." Nothing here has been built yet.

EXPECTATION SETTING: none of these sells a subscription on its own. Nobody pays $9.99/month for more recipe
slots. What they do is make the bundle feel like a real product rather than "AI limits", at the moment
someone is already deciding. The AI remains the actual reason to subscribe.

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
- THANK-YOU EMAIL -- ✅ **BUILT AND VERIFIED 2026-07-25**, not a plan anymore. `functions/src/revenueCatWebhook.ts`
  is live: RevenueCat webhook -> Cloud Function -> email to Justin on both INITIAL_PURCHASE (new Supporter) and
  NON_RENEWING_PURCHASE (a tip). Subject is tagged [SANDBOX] on test purchases. Confirmed working off a real
  sandbox tip. The email carries product name + id, price, store, country, timestamp, the Firebase UID, and the
  buyer's Apple Hide-My-Email relay address (which forwards to their real inbox), so Justin can hand-write a
  personal thank-you exactly as planned.
  ⚠️ THIS KILLS ONE OF THE THREE ARGUMENTS FOR AN IN-APP TIP RECORD. "You can't thank someone you can't see"
  is FALSE -- he can see every giver already. What survives is the GIVER's side: they pay, get a toast, and the
  app then holds no evidence it happened. Decide the acknowledgment on that basis alone, not on Justin's
  visibility. An in-app "note from the maker" remains the post-launch upgrade.

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
- Copy: the "why" paragraph is APPROVED (DECISIONS #4). Remaining strings (upsell one-liners, thank-you note,
  Settings row) are being drafted in the copy pass.
- MOCKUP (Light theme / cyan accent, free-user state, 2026-07-11): https://claude.ai/code/artifact/d81bbbfd-9a6d-4537-ba7f-cf5077d30a6c
  Faithful proxy for LAYOUT + COLORS (pulled from theme.tsx) + COPY; the real app will differ on TYPE (DM Sans +
  Bebas Neue on the big amounts) + native polish (shadows/animations/haptics) + the real gold sprout (not emoji).
  Justin approved the layout 2026-07-11 ("fine, can tweak more when it's actually built").

## UPSELL TOUCHPOINTS -- ✅ **BUILT. VERIFIED IN CODE 2026-07-28.**
⚠️ THIS SECTION READ AS A TO-DO LIST UNTIL 2026-07-28 AND IT IS NOT ONE. Everything below is shipped, with
the locked copy in place and "Supporter" wording throughout (no leftover "Pro" in any user-facing string).
Reading this section as a plan sent a session down the wrong path -- it produced advice to "go build the
conversion touchpoints" when they had been built for weeks. CHECK THE CODE BEFORE TRUSTING ANY "PLANNED"
FRAMING IN THIS FILE.

WHAT IS LIVE (every one of these routes to /support):
- Custom Reports -- locked screen "Custom Reports is a Supporter feature" + "Become a Supporter →"
  (app/reports.tsx), plus a lock icon on the Stats card that routes straight to Support.
- Comparison / Day-vs-Day -- locked screen "Comparison is a Supporter feature" + "Become a Supporter →"
  (app/comparison-report.tsx). Guards the screen itself, so it covers EVERY entry point, not just the card.
- Effort vs Results (app/diagnostic-report-view.tsx) -- the most developed of them: free users get the FIRST
  insight card in full, the rest frost behind a BlurView with an unlock CTA, and Patterns are fully locked.
  Titles are deliberately hidden too (showing them crisp gave the finding away and made the lock pointless).
- AI Meal Estimator at the limit -- "Become a Supporter to keep going →" (app/ai-meal-estimator.tsx).
- Otto at the wall -- "Supporters get more time with Otto each day. Become a Supporter →"
  (components/AssistantChat.tsx). Free users only, only at 1-left/none-left, never mid-conversation.
- Halo -- shows the remaining count and NOTHING ELSE. No upsell, ever. Faith is not upcharged, and the code
  comment says so explicitly. LOWERING HALO'S CAP NEEDS NO COPY CHANGE: the cap and the remaining-count
  label already exist, so changing 50 -> 25 changes a number and nothing else.
- MembershipCard (Profile + Settings) -- permanent, status-aware entry.

THE ONE REAL GAP: `REPORTS_BETA_OPEN = true` in app/reports.tsx forces Reports open for EVERYONE regardless
of entitlement. History: the flag was added 2026-07-07 when Reports shipped and no purchase system existed;
the lock + RevenueCat both landed 2026-07-12 and the flag was left on so testers kept access. It is now
redundant if testers are comped in RevenueCat (comping is manual/per-account, so it is really a safety net
against a missed comp).
⚠️ CONSEQUENCE WORTH KNOWING: because the flag bypasses the entitlement check entirely, THE REPORTS LOCKED
SCREEN HAS NEVER BEEN SEEN BY ANYONE, including Justin. The "Force Free State" dev toggle does NOT reveal it
(the flag is OR'd in ahead of isPro). Same class of blind spot already bit the EvR locked card, which has
never had a shadow on iOS -- found by reading the code, not by looking at the screen, precisely because an
entitled account never renders the locked state. Flip the flag false to eyeball these before launch.

--- original planning notes, kept for the COPY (which is what shipped) ---
Because 95% is free, there are very few walls. Keep every one honest + non-naggy, no core-flow interruption:
- AI Estimator limit reached (INLINE on the estimator screen + a "Support the Mission" link/button beneath it,
  NOT a modal -- calmer, non-naggy). COPY LOCKED 2026-07-11: "You've used all your free estimates this month.
  Become a Supporter to keep going, or check back August 1 for a fresh batch." ([reset date] auto-fills from
  nextResetLabel() = the 1st of next month.)
- Locked Custom Reports / Day-vs-Day (a gentle locked state + a "Support the Mission" link, not interruptive).
  COPY LOCKED 2026-07-11: Reports = "Building your own reports is a Supporter perk. Become a Supporter to get
  started." · Day-vs-Day = "Comparing any two days is a Supporter perk. Become a Supporter to get started."
  ALSO reword the existing code's "Pro" -> "Supporter" (comparison-report.tsx toast + pill; reports.tsx gate).
- POST-PURCHASE THANK-YOU (COPY LOCKED 2026-07-11, voiceless, the warm moment after a successful purchase):
  Sub = "Thank you for backing the mission and becoming a Supporter. It keeps this going and moving forward."
  Tip = "Thank you for chipping in. It genuinely means a lot and keeps this moving forward."
- Permanent, non-intrusive Settings entry (its OWN row/section, high-ish in Settings, status-aware). COPY LOCKED
  2026-07-11: free = "Support the Mission"; Supporter (already in) = "Thanks for your support 🌱".
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
- ⚠️ THE LOCALIZATION GOTCHA (cost an hour on 2026-07-28, WILL happen again on any new IAP). Every in-app
  purchase needs a LOCALIZATION in App Store Connect -- the display name + description Apple shows in the
  purchase sheet. `tip_founder` was created 2026-07-27 without one. Apple then treats the product as INVALID
  and silently omits it from the app's product fetch: no error, no warning, the ID just isn't in the response.
  The Support screen had nothing to sell for that tile, so it toasted "Tips aren't available right now" while
  the other four tips worked fine.
  WHY IT BURNS TIME: App Store Connect does NOT flag it. The list view showed Founder as "Prepare for
  Submission", byte-identical to the four working tips -- not "Missing Metadata", no warning icon. Every other
  visible signal (product IDs, type, RevenueCat entry, entitlement wiring) was correct, so everything said it
  should work. RevenueCat's status column is no help either: it reads "Could not check" on ALL products
  because the App Store Connect API key isn't connected.
  IF A NEW IAP EVER RETURNS NOTHING: check localization FIRST, before suspecting code. Then price/availability
  territories. Only then consider propagation (a genuinely new product can take hours to become fetchable).
  Verified correct on 2026-07-28 and NOT worth re-checking: product IDs match across config.ts, support.tsx,
  App Store Connect and RevenueCat; entitlement id is `supporter`; offering `default` is current with
  `$rc_monthly`/`$rc_annual` packages; both subs sit in one subscription group.

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

## MEMBERSHIP AUDIT FINDINGS (2026-07-11) -- NON-REVENUECAT GAPS TO CLEAR TOMORROW WITH THE RC BUILD
Justin asked "besides RevenueCat, is anything else about membership unfinished?" A real code audit found the
below. NONE are done yet. All pure-JS except where noted. Do these WITH the RevenueCat session (shared testing;
the gates only actually fire for free users in a RELEASE build).

CRITICAL CONTEXT (why it all "looks fine" today): isPro = useState(__DEV__) in ai-meal-estimator.tsx:123 and
comparison-report.tsx:160. In the DEV build __DEV__ is true, so everything reads as Pro and NONE of the free/
locked states or "Pro" strings below are ever visible on-device right now -- they only appear in a release build /
for a real free user. "It looks wired" is partly the dev build masking the gaps.

1. "PRO" -> "SUPPORTER" USER-FACING RENAME. [DONE 2026-07-12] All user-facing spots handled: the 3 Coach Insight
   locked branches REMOVED (coaching is free, see #4 Rule 1); the Day-vs-Day pill, Patterns pill, and Monthly
   Summaries pill now show a "SUPPORTER" chip (chip label decided via a live light/dark mockup); the estimator
   limit modal now reads "Supporters get {N} estimates a month."; the Day-vs-Day toast now reads "Day vs Day is a
   Supporter feature". LEFT ALONE on purpose: settings.tsx:3749 dev-toggle label (dies at launch, REVERT #2) +
   reports.tsx code comments (not user-facing). STILL PENDING (separate, the locked-copy polish in #2, NOT the
   rename): the estimator message becoming a calm INLINE message + "Support the Mission" link instead of a modal,
   and the Day-vs-Day toast becoming the fuller locked copy. Original confirmed spots (for reference):
   - comparison-report.tsx:214  toast "Day vs Day is a Pro feature"  -> "...Supporter..."
   - comparison-report.tsx:354  "PRO" pill  -> "SUPPORTER" (or the locked treatment)
   - ai-meal-estimator.tsx:867  "Pro members get {N} estimates a month."  -> "Supporter"
   - weekly-summary.tsx:312, monthly-summary.tsx:400, stats.tsx:1323, diagnostic-report-view.tsx:436 + :764 --
     "PRO" pills on the COACH INSIGHT card. [RESOLVED 2026-07-12, see #4 Rule 1] Coach Insight is now FREE, so these
     pills are REMOVED (not reworded to Supporter) and the TIPS_GATED lock comes off the Coach Insight card. The
     Supporter gating instead moves to the EvR ranked feed (1 free, rest locked -- NEW build) + "Patterns In Your
     Data" (fully locked). See #4 for the full three-rule split + locked-state visual treatment.
   - settings.tsx:3749  "Unlock Pro Features" (the devProUnlocked dev toggle; dies with the toggle at launch, REVERT #2)

2. LOCKED UPSELL COPY NOT IMPLEMENTED (strings are already LOCKED in this spec; the app doesn't use them yet):
   - AI Estimator limit: current modal (ai-meal-estimator.tsx ~858-874) says "Pro members get..." with NO link to
     the Support screen. Replace with the LOCKED copy: "You've used all your free estimates this month. Become a
     Supporter to keep going, or check back [reset date] for a fresh batch." Spec also wants it INLINE on the
     estimator screen + a "Support the Mission" link/button, NOT a centered modal (calmer / non-naggy).
   - Reports locked state: LOCKED copy "Building your own reports is a Supporter perk. Become a Supporter to get
     started." + a Support link. (reports.tsx currently gates only via REPORTS_BETA_OPEN=true; wire the real locked
     UI when flipping it false, REVERT #5.)
   - Day-vs-Day locked state: LOCKED copy "Comparing any two days is a Supporter perk. Become a Supporter to get
     started." + a Support link (replaces the bare "Pro feature" toast at comparison-report.tsx:214).

3. SUPPORT SCREEN HAS NO SUPPORTER-STATE: app/support.tsx always renders the "Become a Supporter" pitch + the
   (stubbed) buy button, even for someone already IN. Build the LOCKED state-aware "You're a Supporter, thank you"
   view (status + thank-you + gold sprout + Manage Subscription link; tip jar stays; no buy button). CAN key off
   devProUnlocked NOW (like the Membership rows) -- does not strictly need RevenueCat, though it finalizes with it.

4. [RESOLVED 2026-07-12] EvR / summary coaching gating. Investigating the code showed the single TIPS_GATED
   switch actually controls THREE different things, so the a/b framing was too blunt. Justin's decision, a clean
   three-rule split:
   - RULE 1 -- COACH INSIGHT (the blue headline blurb) = FREE for everyone, everywhere it appears (home, day,
     weekly, monthly, EvR). Honors DECISIONS #3 "Smart Coach = free for all." ACTION: remove the TIPS_GATED lock on
     the Coach Insight card so it never shows the locked shell; the "PRO" pills on those cards go AWAY (not reworded
     to Supporter). Cheap to give away (weekly/monthly generated once per period + cached; EvR reuses the home cache).
   - RULE 2 -- EvR RANKED DIAGNOSTIC FEED (the "finding + proof + lever" cards) = FREE users see 1 card, the REST
     are locked (Supporter). NOTE: this gate DOES NOT EXIST in code yet -- today every ranked card is free to all
     (diagnostic-report-view.tsx maps the full feed with no gate). This is a small BUILD, not a switch flip.
   - RULE 3 -- EvR "PATTERNS IN YOUR DATA" (cross-signal correlation cards) = LOCKED for free users (Supporter).
     Today it's built as "first one free, rest blurred (idx > 0)"; change to FULLY locked per Justin.
   - LOCKED-STATE VISUAL TREATMENT (applies to Rules 2 + 3): real HEADER / title stays readable (enticing, shows
     it's about THEIR data) + body text and any graphic BLURRED (visibly there, unreadable) + a lock icon +
     "SUPPORTER" chip + an explicit "Become a Supporter to unlock" CTA line so the tap target is obvious + the whole
     card taps through to the Support the Mission screen. NO full gray-skeleton shell (reads as broken/empty, not
     premium). Exact CTA wording still Justin's to finalize.
   - OPEN TAIL (don't lose): the deeper EvR insights (Rules 2 + 3) are now a Supporter perk NOT named in the locked
     perk list (More AI Room / Custom Reports / Day-by-Day / Custom Badge). Decide whether to add a perk line or
     fold it into an existing one before finalizing perk copy.
   - FLAG (separate, unresolved): SPEC_monthly_summary.md still says the ENTIRE monthly summary surface is
     Pro-gated (not just its Coach Insight). That conflicts with Rule 1 freeing the monthly Coach Insight. Resolve
     the monthly-whole-surface question on its own; today's decision only covers the Coach Insight card + the two
     EvR sections.

5. (RevenueCat-coupled, already on the checklist below) real isPro source replacing __DEV__/devProUnlocked; beta
   caps revert (Otto 100->10/25, Halo 50->25/25, Estimator 100->5/100); REPORTS_BETA_OPEN -> false.

---

## CAP-REACHED / OUT-OF-QUOTA COPY (app-wide, LOCKED 2026-07-12)
Rule: maxed FREE -> gentle Supporter nudge; maxed PAID -> calm come-back, no nudge; HALO -> calm come-back for
EVERYONE, NEVER a nudge (faith is never upcharged).
- HALO (25/25 for all): "That's all for today. Halo resets tomorrow." + "1 message left today. Halo resets
  tomorrow." NO upsell, ever. DONE (already correct; the "1-left" line renamed off "It" -> "Halo" 2026-07-12).
- OTTO (free 10 / Supporter 25): "That's all for today. Otto resets tomorrow." + "1 message left today. Otto
  resets tomorrow." DONE 2026-07-12. PLUS a FREE-USER-ONLY nudge line under the reset message -- LOCKED copy,
  wiring PENDING the real entitlement (Otto has no free-vs-Supporter awareness yet): "Supporters get more time
  with Otto each day. Become a Supporter →" (taps to /support). Deliberately NO hard number so copy can't break
  if caps retune. A Supporter who maxes out sees only the reset line, no nudge.
- ESTIMATOR (free 5 / Supporter 100): inline out-of-estimates card (replaced the old popup). FREE: "You've used
  all your free estimates this month." / "Your free batch refreshes on [reset date]." / "Become a Supporter to
  keep going →". SUPPORTER: "You've used all your estimates this month." / "They refresh on [reset date]." / no
  link. No lock icon. DONE 2026-07-12 (shows for real free users once the entitlement replaces __DEV__).

---

## BUILD CHECKLIST (before public launch -- required + functional)
1. Payment infra: RevenueCat (or StoreKit) integration; define products (1 sub + N consumable tips).
2. Real `isPro` source: replace `__DEV__ || devProUnlocked` with the real entitlement; REMOVE the dev toggle
   + override (REVERT #2). Keep a dev-only entitlement path for testing behind a flag.
3. Wire existing gates to the real entitlement: comparison-report Day-vs-Day, ai-meal-estimator, reports
   (`REPORTS_BETA_OPEN -> false`, REVERT #5).
4. Restore real free caps: AI Estimator FREE_LIMIT + PRO_LIMIT (REVERT #3), Otto/Halo FREE_DAILY_CAP (REVERT
   #4) to the locked numbers above.
5. Build the "Support the Mission" screen (copy final) + Settings entry. >> SCREEN BUILT 2026-07-11
   (app/support.tsx; route registered in app/_layout.tsx; reachable via Settings > Help > Support). Renders ALL
   locked copy, adapts to every theme/accent (live tokens), price pills toggle; PURCHASE BUTTONS ARE STUBBED
   (fire a "coming soon" toast) until RevenueCat is wired. Pure JS, tsc clean, no rebuild.
   SETTINGS ENTRY RELOCATED 2026-07-11: pulled out of Help into its own prominent, status-aware "Membership"
   section (2nd position, directly under Appearance). Status-aware row using the new custom sprout glyph
   (components/SproutIcon.tsx, variant C) + a title-height amber tick (matches the Health section labels) +
   amber title + amber chevron. Copy: free = "Support the Mission" / "Help keep the app going"; supporter =
   "Thanks for your support" / "Active Supporter". Status currently keys off the devProUnlocked dev toggle.
   DEFERRED WIRING (Membership row, do when RevenueCat lands): (1) swap devProUnlocked -> the real Supporter
   entitlement; (2) "Active Supporter" -> "Renews on [real date]" (NO faked date -- honest-numbers rule, so it
   stays "Active Supporter" until RC provides the real renewal date); (3) sprout amber -> the real gold when the
   badge system is built; (4) FLESH OUT the supporter-state Membership card (Profile + Settings) into a real
   membership summary -- plan (Monthly/Annual), "Member since [date]", "Renews on [date]" (Justin 2026-07-11: the
   bare "Active Supporter" card feels too thin). ALL of these need RevenueCat (member-since = purchase date,
   renews-on = next bill, plan = the product bought); there is NO honest source without it, so building it now =
   empty labels that read as broken to TestFlight testers. HOLD the build until RC lands, then do layout + real
   values together. The FREE-state card stays the simple CTA (a free user has no subscription info to show).
   REMAINING: real purchases (RevenueCat) + the Supporter-STATE of the support screen itself.
   PROFILE ENTRY BUILT 2026-07-11: a collapsible "Membership" ProfileSection (2nd, under Basic Info, default
   open), the sprout row wrapped in a card (bgInput + Verse-card amber-tint border rgba(212,134,10,0.4) + subtle
   shadow) to match Profile's boxed content; status keys off devProUnlocked, refreshed on focus.
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
