# 🚀 LAUNCH CHECKLIST — the single source of truth

Created 2026-07-13. This file **replaces** the scattered launch lists: the roadmap's "REVERT BEFORE APP STORE
LAUNCH" banner, the roadmap's "LAUNCH BLOCKERS" section, and the launch-only notes inside SPEC_monetization.md.
Those stay for context, but **this is the list you work from.** If you add a hack, add it here the same day.

**It is ORDERED. The order is not cosmetic — several steps break your testers or your revenue if done early.**
Every code item below was verified against the actual source on 2026-07-13 (file:line given). Nothing here is
from memory.

---

## ⛓️ PHASE 0 — TESTER ENTITLEMENTS — ✅ DONE 2026-07-13

**The ordering trap that made this Phase 0:** testers are NOT Pro and never were. `isSupporter = entitled ||
(__DEV__ && devOverride)` (MembershipContext.tsx:228) and `__DEV__` is **false** in TestFlight — so the Settings
dev toggle only ever worked on Justin's local dev build. Testers' access came entirely from the beta hacks in
Phase 2. Revert those before granting entitlements and every tester drops to the real free caps with no way out.

- [x] **0.1 — Grant every tester the `supporter` entitlement. DONE: all 11, `yearly`, 2026-07-13.**
      **The plan changed for the better.** We assumed testers had to be on a RevenueCat build and open the app
      first (RevenueCat only knows a customer once the SDK has run). Not so: the v1 REST API **GET
      /subscribers/{id} CREATES the customer**, and you can then grant a promotional entitlement to someone who
      has never opened the app. The entitlement simply sits waiting for them. No chasing anyone to update, no
      tracking who did.
      Method: `GET /v1/subscribers/{uid}` then `POST /v1/subscribers/{uid}/entitlements/supporter/promotional`
      with `{"duration":"yearly"}`, looped over every uid, using a RevenueCat **secret** API key.
      The uid list came from `firebase auth:export` — NOT from memory. Worth noting: the hand-written list Justin
      had assembled was missing **four** testers. Enumerate, don't recall.
      ⚠️ **Justin's TWO accounts are deliberately un-granted** (`jtharmke@gmail.com` = the dev-build uid
      `zLZOx2aqiKXcl3tlg7LNmkwbGxH3`, and `justin.harmke@gmail.com`). A real entitlement can never be switched
      off by the dev toggle, so granting either would permanently destroy his ability to see the free/locked
      state — on dev AND on TestFlight. He needs one free account on each.
      Chose `yearly` over `lifetime`: covers the whole beta and well past launch, then quietly ends, rather than
      giving the product away forever.

- [x] **0.2 — THE TRAP THIS EXPOSED (fixed; see Phase 1).** A promotional grant reaches RevenueCat but does NOT
      arrive as a usable subscription webhook — it comes through as `NON_RENEWING_PURCHASE`, the same event type
      as a TIP. Two consequences, both caught live:
      (a) it emailed Justin "Someone left a tip... $0... time to write the thank-you" (would have been 11 emails);
      (b) it never wrote a membership record, so the SERVER would have given every granted tester **free-tier AI
      caps** while the app told them they were Supporters. Silent, and hell to diagnose.
      Fixed by making Firestore a CACHE and RevenueCat the TRUTH (Phase 1), plus a promo guard on the email.

---

## 🔒 PHASE 1 — SERVER-SIDE SUPPORTER TRUTH — ✅ DONE + VERIFIED 2026-07-13

- [x] **1.1 — DONE.** functions/src/membership.ts. The RevenueCat webhook now records EVERY subscription event
      (new/renewal/cancellation/expiration) to a server-only Firestore collection (`memberships/{uid}`), and
      appCompanion + faithCompanion derive the daily cap from it. The client never gets a vote.
      - **Stores the EXPIRY, not a boolean** → self-healing: a dropped or late webhook can't leave someone
        wrongly entitled forever, because status is derived at read time from the expiry.
      - **Fails closed** → any lookup error defaults to the free tier. A bug can only make someone LESS
        generous, never hand out free AI.
      - **Out-of-order safe** → webhooks DO arrive out of order (seen live: an EXPIRATION, then a stale
        PRODUCT_CHANGE carrying an OLDER expiry, then the real RENEWAL). Writes are now transactional and
        keyed on the event's own timestamp, so a stale event can't stomp a newer one. VERIFIED by firing a
        crafted stale event at the live endpoint: it was correctly `SKIPPED (out-of-order/stale)`.
      - **Tips don't touch it** → verified live: a tip emails Justin and writes NO membership record.
      Both cap tiers are deliberately EQUAL right now (beta values), so nothing changed for testers. The real
      split turns on at 2.1.

- [x] **1.2 — HARDENED 2026-07-13: Firestore is a CACHE, RevenueCat is the TRUTH.**
      Webhooks alone were not enough (proven by the promotional-grant trap in Phase 0.2). `isSupporter()` now
      reads Firestore first, and on a MISS (or a "not a supporter" answer older than 6h) asks the RevenueCat REST
      API directly and caches the result. This self-heals promotional grants, transfers, and ANY webhook that is
      ever dropped, delayed, or shaped differently than expected. Still fails closed: any error → free tier.
      Needs the `REVENUECAT_SECRET_KEY` secret (set in Firebase, wired into appCompanion + faithCompanion +
      revenueCatWebhook).
      ⚠️ STILL UNVERIFIED IN THE WILD: the API-lookup path only fires when a granted tester actually messages
      Otto. Confirm from the logs (look for a membership record with `lastEventType: 'API_LOOKUP'`) the first
      time one of them does. Zero user impact if it's broken today — both cap tiers are equal during beta.
      The AI caps live server-side, but they have **no Supporter tier** — there is one cap for everyone
      (appCompanion.ts:37, faithCompanion.ts:29). The locked design is Otto 10 free / 25 Supporter and
      Halo 25/25, which the server currently cannot express.
      ⚠️ **Do not just trust a client flag.** If the app sends `isSupporter: true` and the server believes it,
      anyone can spoof it and run up the Anthropic bill. This is the one place in the system where a lie costs
      real money.
      **Approach:** have the RevenueCat webhook (functions/src/revenueCatWebhook.ts — already deployed and
      receiving every event) write membership state to Firestore (`users/{uid}/membership`), and have
      appCompanion / faithCompanion read it. Note the webhook currently **ignores** RENEWAL / CANCELLATION /
      EXPIRATION, so it must start recording them or the state will go stale.

- [ ] **1.2 — Otto's free-user nudge is already shipped** (AssistantChat.tsx, free users only, at the wall only).
      Its copy promises "Supporters get more time with Otto each day" — which only becomes **true** once 1.1 and
      2.1 land. It is currently a promise the code doesn't keep.

---

## 🚨 PHASE 2 — REVERT THE BETA HACKS (only after Phase 0 + 1.1)

Every one of these is currently making the app more generous than it should be at launch.

- [ ] **2.1 — Real AI caps.** Blocked on 1.1 (there is no Supporter tier to revert *to* until the server can
      tell who's a Supporter).
      - `functions/src/appCompanion.ts:37` — `FREE_DAILY_CAP = 100` → **10** (Supporter 25). *Needs redeploy.*
      - `functions/src/faithCompanion.ts:29` — `FREE_DAILY_CAP = 50` → **25** (Supporter 25 — faith is never
        upcharged, so both tiers are equal). *Needs redeploy.*
      - `services/aiMealEstimator.ts:34,38` — `FREE_LIMIT = 100` → **5**, `PRO_LIMIT = 9999` → **100**.
- [ ] **2.2 — Lock Custom Reports.** `app/reports.tsx:25` — `REPORTS_BETA_OPEN = true` → **false**. One line; the
      whole gate is already built and dormant behind it.
- [ ] **2.3 — Remove the dev Pro toggle.** `app/settings.tsx:3743` (the toggle), `:457`/`:815` (its state), and
      the `__DEV__ && devOverride` override in `MembershipContext.tsx:228`. Grep `devProUnlocked` — it must
      return nothing outside comments.
- [ ] **2.4 — Empty the AI whitelists.** `DEV_UNLIMITED_UIDS = ['zLZOx2aqiKXcl3tlg7LNmkwbGxH3']` appears in
      **three** places and bypasses every cap: `functions/src/aiProxy.ts:38`, `appCompanion.ts:41`,
      `faithCompanion.ts:33`. Its own comment says "Empty before launch." *Needs redeploy.*
- [ ] **2.5 — Remove the dev tools from Settings.** The 7-tap hidden Dev Tools section (app/settings.tsx:2193+):
      seed tools, the Weight-History self-test, "Seed under-logged test day", Vacation Mode dev reset, the
      local-data wipe, etc. They're safe, but they should not ship visible.
- [ ] **2.6 — Remove the dev sign-in skip.** `app/sign-in.tsx:274` — a `__DEV__`-only button that skips
      onboarding. Dead in production, but delete it with the rest.

---

## 🔑 PHASE 3 — SECURITY (do before public release)

- [ ] **3.1 — ROTATE the Anthropic API key.** It was previously bundled client-side. The code is now clean (all
      calls go through the aiProxy Cloud Function), but the old key was exposed and must be regenerated +
      revoked. Do it **after** testers are on a build that uses the proxy, or you break them.
- [ ] **3.2 — Raise the Anthropic spend cap.** Currently **$50/mo** with alerts at $25/$40 — a pre-launch
      backstop, not a launch number. Recalculate above expected real-user spend before going public.
- [ ] **3.3 — Verify the webhook secret.** `REVENUECAT_WEBHOOK_TOKEN` is set and the endpoint 401s on a bad
      token (verified 2026-07-12). Re-confirm after any redeploy.

---

## 💰 PHASE 4 — MONEY / APP STORE BUSINESS

- [x] **4.1 — ⭐ Apple Small Business Program. ENROLLED 2026-07-13, awaiting Apple's approval.**
      Takes Apple's cut from **30% → 15%** on every sale, forever. Prerequisite (the Paid Apps agreement) was
      already signed 2026-07-12. Ownership/control questions were all "No" (solo dev, one account).
      ⚠️ **The rate is NOT live yet.** It takes effect **15 days after the end of the fiscal month in which the
      enrollment is APPROVED** -- so a July approval means it activates around mid-August. This is exactly why it
      was done early: if you launch and sell before it activates, Apple takes 30% of those sales.
      TODO: confirm the approval email lands, and confirm the 15% rate is showing in App Store Connect before
      any real revenue arrives.
- [ ] **4.2 — App Store Connect API key (AuthKey).** Enables price sync, refund handling, and Apple→RevenueCat
      server notifications. Deferred during the build; needed for a healthy production subscription.
- [ ] **4.3 — Product review screenshots + metadata** for the 6 IAP products (2 subs + 4 tips). Required by App
      Review. Products currently show "Missing Metadata" / "Draft" — fine for sandbox, **not** for submission.
- [ ] **4.4 — Verify the subscription group ranking** is still Annual = Level 1, Monthly = Level 2, so an upgrade
      is immediate + prorated (set 2026-07-13, device-verified).

---

## 📱 PHASE 5 — THE APP STORE LISTING

- [ ] **5.1 — App name.** ⚠️ The old shortlist (Prevail / Steadfast / Worthy / Haven / Witness / Sown) is **DEAD**
      as of 2026-07-13 — Justin's verdict: *"those aren't good."* Do not resurrect it. Starting fresh.
      For any candidate, check: App Store name availability, TikTok/Instagram handle, and a domain.
      **Everything else in this phase is blocked on this.** (The logo already exists — assets/images/icon.png,
      plus the gold Supporter variant.)
- [ ] **5.2 — App Store Connect listing:** privacy label, age rating, URLs, description, keywords, screenshots,
      review notes.
- [ ] **5.3 — privacy.html** — confirm it covers every data type the app now collects (standing rule: update it
      when a feature adds collection, don't batch it to submission day).
- [ ] **5.4 — Gold app icon.** Asset exists (`assets/images/icon-gold.png`). Needs: an alternate-app-icon config
      plugin, a **native rebuild**, the switch gated on the Supporter entitlement, and the Support screen's
      "Custom Badge & Icon" perk illustration updated to show it.

---

## ✅ PHASE 6 — FINAL VERIFICATION (on the real production build)

- [ ] **6.0 — NOT YET BUILT. Reset the Rate Us budget for TestFlight testers on the real launch build.**
      `pj_rate_prompt` (utils/ratingPrompt.ts) is account-scoped, not build-scoped -- it's a synced `pj_`
      key, so any asks a tester used up during TestFlight testing carry straight into the real App Store
      install on the same account. Whoever hit the 3-lifetime-ask cap during beta testing gets ZERO real
      prompts after launch unless this is handled. Discussed with Claude 2026-07-24 -- Justin doesn't want
      testers to have Dev Tools visibility (so "just tap Reset Rate Prompt State yourself" is out), and a
      remote Firestore edit isn't provably safe (unclear whether it reliably pulls back down into an
      already-running install vs. getting overwritten by the device's own next local write).
      **The fix: a version-gated one-time reset**, not yet built. On boot, if the installed app version is
      at or past the real App Store launch version AND this account hasn't already been reset-for-launch,
      wipe `pj_rate_prompt` back to fresh (`totalAsks: 0`, `lastAskedAt: null`) once, then set a local-only
      marker so it never fires again. No-op for brand-new App Store downloaders (already fresh). Blocked
      only on: **the actual version number Justin will submit as 1.0.0 / launch** -- not decided yet. Build
      this once that number is picked, well before submission, so nothing has to be remembered at the
      actual moment of shipping.
- [ ] **6.1 — Full purchase gauntlet on a PRODUCTION build:** subscribe (monthly + annual), tip, restore,
      monthly→annual upgrade, cancel → confirm the card flips "Renews on" → "Ends on", let it lapse → confirm the
      app re-locks.
- [ ] **6.2 — INITIAL_PURCHASE webhook, end to end, from a FRESH sandbox account.** Justin's account can never
      fire it again — re-buying the same sub after a lapse sends RENEWAL, which we deliberately ignore. The email
      path itself is verified; RevenueCat's *delivery* of INITIAL_PURCHASE is not.
- [ ] **6.3 — Free vs Supporter across the app:** every gate (Comparison, Reports, EvR cards, estimator quota,
      Otto/Halo caps) behaves correctly for a genuinely free user on a release build.
- [ ] **6.4 — 5 themes × accents, 3 coaching modes, 3 faith tiers** on the surfaces touched by monetization.
- [ ] **6.5 — Explainer freshness:** tooltipRegistry.ts + data/tutorials.ts + Otto's KB
      (functions/src/assistantAppKnowledge.ts) must state the **final** caps and gates, not the beta ones.
      Redeploy Otto after editing his KB.
- [ ] **6.6 — Verification scan:** production build, device install, every flow confirmed before submitting.

---

## 🧾 KNOWN AND ACCEPTED (not blockers, but know they're true)

- **The AI estimator's real quota is enforced CLIENT-side** (services/aiMealEstimator.ts:83, `isPro ? PRO_LIMIT :
  FREE_LIMIT`). A modified client could bypass it. The exposure is bounded by the server-side abuse backstop in
  aiProxy.ts:32 (`estimator: 60/day`), so worst case is 60 estimates/day, not unlimited. Acceptable; just know it.
- **Tips do not grant the entitlement** — by design (device-verified). A $2.99 tip must never confer Supporter
  perks. The tipper badge, when built, is app-side purchase-history logic, not the entitlement.
