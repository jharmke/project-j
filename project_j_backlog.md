# Project J -- Backlog
# Parked ideas, post-launch features, LOW priority items, and marketing strategy.
# Not required reading at session start. Open when planning future sessions or doing quarterly review.

---

## MOTIVATION / GAMIFICATION
- Motivation hub: unify Challenges + Achievements + Records + Streaks into one "proof you're showing up" family (Records/Streaks already live in Stats; Challenges section being added there too; Achievements has its own page). Design the Challenges Stats section so achievement siblings can slot in later. (Justin 2026-06-18, while building #7.)

---

## FOOD INTELLIGENCE

- Food health score -- per-item score based on how well food fits current goals at that moment.
- "Why did you eat" / "How did it feel" / Hunger level -- quick tags on food entries (Hungry/Tired/Cravings/Bored/Social) + post-meal feel tags + 1-5 hunger scale before eating.
- Protein timing badge -- hit protein within 2 hours post-workout. Simple yes/no badge.
- Food group pattern detection -- gentle tip if user logs zero whole foods for X consecutive days. Mode-aware tone.
- Time of day food heat map -- when during the day does the user tend to eat, visualized as a grid.
- Calorie periodization -- higher calories on workout days, automated suggestion.
- Restaurant menu lookup -- scan/search restaurant, pull nutrition from FatSecret. Post-FatSecret feature.

---

## STATS & INSIGHTS

- [RETIRED 2026-06-17, restorable] Fitness Metrics home card -- killed because RHR / Resp Rate / Blood O2 now live on the Recovery home card (3 of its 5 boxes were duplicates). Only VO2 Max + Cardio Recovery were unique. Removed from the card registry + default orders + Settings/Help tooltip, and scrubbed from any lingering saved cardOrder on load (CARD_REGISTRY filter in loadLayout). PRESERVED for a one-line restore: the `fitness_metrics` CardId member, `renderFitnessMetricsCard()` (already restyled to the icon-chip/identity-color box grid matching Recovery, Body Fat box already pulled), and its `case` in renderCardById all still exist in index.tsx. RETHINK ANGLE if it comes back: make it a true cardio-CAPACITY card (VO2 Max + Cardio Recovery only -- absolute fitness, distinct from Recovery's baseline-relative readiness), rename off "Fitness Metrics" (too thin with 2 boxes), and re-add the tooltip entry (commented-retired in tooltipRegistry.ts). Body Fat % was FULLY RETIRED 2026-06-17 in the same pass (Justin's call: no Body Measurements feature to give a single % any context). Removed from: the home card, the stats graph picker (statsCardRegistry DataKey + DATA_KEY_META), the TrendData plumbing (utils/statsData.ts), StatsGraphCard rendering, the useHealthKit pull + export, the index.tsx save, and the Settings/Help tooltip + the graph-creator tutorial copy (now "16 data types"). Saved bodyFatPct GRAPH cards are scrubbed on load (loadStatsCards filter); historical pj_<date>.bodyFatPct VALUES are left intact (data integrity, just no longer read/written). The HealthKit READ permission string ('HKQuantityTypeIdentifierBodyFatPercentage') was left in the auth request (harmless unused authorization, avoids a rebuild). A future Body Measurements feature (waist/neck/hip + body fat) is the real home for this -- already a separate HOME/UX roadmap item.

- [DEFERRED 2026-06-24 from Body Measurements v1 -- foundation first] Body Measurements add-ons, all parked until the core tracker (SPEC_body_measurements.md) ships:
  - Home screen card for Body Progress -- home is a daily dashboard; measurements are weekly/monthly, so a card would sit stale and crowd daily content. They live in Stats > BODY + the dedicated screen. Revisit only if quick-log access proves wanted.
  - Achievement hooks -- behavior-only when built (first measurement logged; consistency tiers like 5/10/25 sessions). HARD NO to outcome-based ("hit 15% BF", "lost 2 in") -- cuts against the whole-person / Mindful philosophy. Deferred to skip the naming/description work for now.
  - Smart Coach / EvR tie-in (v2) -- measurements are a "results" signal, but cadence is sparse and data noisy (measurement error, water fluctuation), so a coach tie-in risks dishonest insights off noise. Let history accumulate as a clean standalone tracker first; revisit with proper Mindful gating.
- Energy level tracking -- user logs energy level, correlates with food choices ("you always crash at 3pm on high carb days").
- Hydration timing insights -- not just how much water, but when. Pairs with existing water timestamps.
- Per-metric sleep exclusion -- exclude sleep without excluding full day. Revisit during stats revamp.
- Nap tracking -- Apple Health tracks naps separately on iOS 16+.
- Report templates / Report Card -- time-ranged snapshot (7/30/90d): avg calories/macros, steps, sleep score, weight change, workouts logged. Shareable as screenshot. Pairs with PDF export.

---

## WORKOUT

- HIIT mode -- Tabata, standard intervals, custom.
- Workout rest timer between sets.
- Offline / non-Apple internal workout tracker (Justin 2026-06-15) -- an in-app live workout tracker for users WITHOUT a watch / not syncing from Apple Health: start/stop session timer, log sets/reps/cardio duration live, save the session to history. Gives watchless users a real way to capture workouts instead of relying on Apple Health import. Whole new subsystem -- backlog, needs a design session before any build.

---

## BODY & PROGRESS

- Body progress photos + measurements -- full spec in SPEC_body_progress.md. Pose photos (Front/Side/Back), timelapse, side-by-side, full circumference measurements, Navy method body fat %, all fields graphable. Blocked on Firebase Storage migration, illustration assets, timelapse tech spike.

---

## SLEEP

- Sleep detail page -- dedicated screen when Sleep card is tapped, real graph/breakdown. New screen, not a small add.
- HRV (and other metrics) normative-context graphic -- Justin liked the LOOK of an age/gender HRV reference table (a clean banded table: age range x sex x value). Idea: show "is my number typical for my age/sex" context inside the metric drill-down. PINNED 2026-06-14, HOLD. Two real blockers to solve first: (1) the reference table Justin shared is RMSSD / ln(RMSSD) based, but our HRV metric is SDNN -- different scale, does NOT map; we would need SDNN-specific age/sex norms (noisier, less standardized). (2) Philosophy: our recovery model is deliberately baseline-relative (you vs your own normal), so a population chart slightly cuts against that message -- would need careful "context only, your trend matters more" framing. Revisit as a drill-down enhancement once good SDNN norms are sourced.

---

## FAITH

- [DONE 2026-06-23, shipped] Custom verses & messages (Today's Message) -- BUILT: user-controlled pool (curated KJV on/off + custom verses added from the Bible reader via the sun icon), cycle vs pin mode, managed from a gear on the Today's Message card. Tooltip updated + the new Bible tutorial covers adding to the rotation. See the Today's Message overhaul entry in the roadmap FAITH section. (Kept here marked done for traceability; safe to delete.)
- Gratitude before meals -- one-tap give thanks before logging a meal. Unapologetically Christian. No spec yet.
- Faith-based fasting -- spiritual fasting with prayer log, separate from 16:8 IF. No spec yet.
- Challenges/Missions layer -- full spec in SMART_COACH_SPEC.md. Parked behind Faith AI track.

---

## SOCIAL

- Social and accountability partner -- one person you share daily score with. Not a full social feed. Build after core features + onboarding stable.

---

## PRO / MONETIZATION

- Premium / Pro system -- free tier good, Pro unlocks: PDF, full EvR, full Smart Tips, extended history, non-standard stats charts. $4.99/mo or $39.99/yr, RevenueCat, 7-day trial. Themes stay achievement-unlock only. Dedicated design + architecture session before any build.
- PDF export -- daily/weekly summaries as PDF. expo-print + expo-sharing, light-themed, toggleable sections. Build after Reports section ships.

---

## ONBOARDING

- Onboarding illustrations -- SVG illustrations, one per onboarding screen, theme-aware. Do after onboarding flow is fully functional.

---

## LOW PRIORITY / FUTURE

- Weight trend sparkline -- small inline trend line next to weight number showing recent direction over ~7-14 days. No axes, just shape.
- Language / internationalization.
- Apple Watch companion app -- V2 or later.
- iOS home screen widget.
- Animated app icon -- iOS 18 feature.
- Android -- React Native core reusable. HealthKit = iOS only; Android uses Health Connect. V2 after iOS is solid.

---

## MARKETING

- TikTok strategy -- anonymous account, interactive series format, crowd-sourced decisions, meme formats. Rebrand to app name when locked.
- Side-by-side screen recordings vs MFP -- same task in both apps, no commentary, let the UI speak. MFP's UI is 2015-era.
- AI scanner bashing content -- memes/comparison posts. "Scanner apps guess, Project J tracks."
- Faith angle content -- verse + workout clip format, subtle and authentic. Should be early content.
- Micro influencer outreach -- Christian fitness + faith-based wellness creators. Back pocket until TestFlight-ready.
- Photo logging anti-gimmick angle -- "We don't guess, we track." Decided against photo logging (can't see oil, portion weight, prep method).
- Distribution path -- 200-300 genuinely engaged users first. Christian community, ProductHunt, Reddit (r/Christianity, r/fitness, r/selfimprovement).
