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

>>> 📌 PINNED -- THE TESTER-ENTITLEMENT SEQUENCE (decided 2026-07-12, session 3). DO NOT flip the beta hacks
>>> out of order or you WILL break the testers.
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
- Copy: the "why" paragraph is APPROVED (DECISIONS #4). Remaining strings (upsell one-liners, thank-you note,
  Settings row) are being drafted in the copy pass.
- MOCKUP (Light theme / cyan accent, free-user state, 2026-07-11): https://claude.ai/code/artifact/d81bbbfd-9a6d-4537-ba7f-cf5077d30a6c
  Faithful proxy for LAYOUT + COLORS (pulled from theme.tsx) + COPY; the real app will differ on TYPE (DM Sans +
  Bebas Neue on the big amounts) + native polish (shadows/animations/haptics) + the real gold sprout (not emoji).
  Justin approved the layout 2026-07-11 ("fine, can tweak more when it's actually built").

## UPSELL TOUCHPOINTS (low stakes -- only ~2 real ones)
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
