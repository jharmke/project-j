# 🚀 LAUNCH CHECKLIST — the single source of truth

Created 2026-07-13. This file **replaces** the scattered launch lists: the roadmap's "REVERT BEFORE APP STORE
LAUNCH" banner, the roadmap's "LAUNCH BLOCKERS" section, and the launch-only notes inside SPEC_monetization.md.
Those stay for context, but **this is the list you work from.** If you add a hack, add it here the same day.

**It is ORDERED. The order is not cosmetic — several steps break your testers or your revenue if done early.**
Every code item below was verified against the actual source on 2026-07-13 (file:line given). Nothing here is
from memory.

---

## ⛓️ PHASE 0 — THE DEPENDENCY THAT GATES EVERYTHING ELSE

**Nothing in Phase 2 can happen until this is done.** Read the reasoning; it is not obvious.

- [ ] **0.1 — Ship a TestFlight build that contains RevenueCat.**
      The native build exists but has never been distributed. Until testers run a build with the SDK in it,
      they do not exist as RevenueCat customers, so they cannot be granted anything.
- [ ] **0.2 — Have each tester open the app once.** `Purchases.logIn(firebase uid)` runs and creates their
      RevenueCat customer record.
- [ ] **0.3 — Grant each tester the `supporter` entitlement** in the RevenueCat dashboard (longest/lifetime).
      Their RevenueCat customer ID **is** their Firebase uid. UIDs are listed in SPEC_monetization.md.
      ⚠️ **Do NOT grant Justin** (`zLZOx2aqiKXcl3tlg7LNmkwbGxH3`). His dev build shares that uid, and a real
      entitlement can never be turned off by the dev toggle — he'd permanently lose the ability to see the
      free/locked state. He stays un-granted as the only account that can test both sides.

> **Why this gates everything:** testers are NOT Pro and never were. `isSupporter = entitled || (__DEV__ &&
> devOverride)` (MembershipContext.tsx:228) and `__DEV__` is **false** in TestFlight — so the Settings dev toggle
> only ever worked on Justin's local dev build. Testers' access comes entirely from the beta hacks in Phase 2.
> Revert those before granting entitlements and you drop every tester to the real free caps with no way out.

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

- [ ] **1.1-OLD (for reference — what the problem was)**
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

- [ ] **4.1 — ⭐ Apple Small Business Program.** Takes Apple's cut from **30% → 15%**. Justin qualifies. This is
      real money on every single sale and it is pure paperwork. Do it before the first dollar comes in.
- [ ] **4.2 — App Store Connect API key (AuthKey).** Enables price sync, refund handling, and Apple→RevenueCat
      server notifications. Deferred during the build; needed for a healthy production subscription.
- [ ] **4.3 — Product review screenshots + metadata** for the 6 IAP products (2 subs + 4 tips). Required by App
      Review. Products currently show "Missing Metadata" / "Draft" — fine for sandbox, **not** for submission.
- [ ] **4.4 — Verify the subscription group ranking** is still Annual = Level 1, Monthly = Level 2, so an upgrade
      is immediate + prorated (set 2026-07-13, device-verified).

---

## 📱 PHASE 5 — THE APP STORE LISTING

- [ ] **5.1 — App name + logo.** Finalize from the shortlist (Prevail, Steadfast, Worthy, Haven, Witness, Sown).
      Verify App Store + TikTok handle availability. Prevail is the current favorite. **Everything else in this
      phase is blocked on this.**
- [ ] **5.2 — App Store Connect listing:** privacy label, age rating, URLs, description, keywords, screenshots,
      review notes.
- [ ] **5.3 — privacy.html** — confirm it covers every data type the app now collects (standing rule: update it
      when a feature adds collection, don't batch it to submission day).
- [ ] **5.4 — Gold app icon.** Asset exists (`assets/images/icon-gold.png`). Needs: an alternate-app-icon config
      plugin, a **native rebuild**, the switch gated on the Supporter entitlement, and the Support screen's
      "Custom Badge & Icon" perk illustration updated to show it.

---

## ✅ PHASE 6 — FINAL VERIFICATION (on the real production build)

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
