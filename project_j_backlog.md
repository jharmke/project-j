# Project J -- Backlog
# Parked ideas, post-launch features, LOW priority items, and marketing strategy.
# Not required reading at session start. Open when planning future sessions or doing quarterly review.

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

- Energy level tracking -- user logs energy level, correlates with food choices ("you always crash at 3pm on high carb days").
- Hydration timing insights -- not just how much water, but when. Pairs with existing water timestamps.
- Per-metric sleep exclusion -- exclude sleep without excluding full day. Revisit during stats revamp.
- Nap tracking -- Apple Health tracks naps separately on iOS 16+.
- Report templates / Report Card -- time-ranged snapshot (7/30/90d): avg calories/macros, steps, sleep score, weight change, workouts logged. Shareable as screenshot. Pairs with PDF export.

---

## WORKOUT

- HIIT mode -- Tabata, standard intervals, custom.
- Workout rest timer between sets.

---

## BODY & PROGRESS

- Body progress photos + measurements -- full spec in SPEC_body_progress.md. Pose photos (Front/Side/Back), timelapse, side-by-side, full circumference measurements, Navy method body fat %, all fields graphable. Blocked on Firebase Storage migration, illustration assets, timelapse tech spike.

---

## SLEEP

- Sleep detail page -- dedicated screen when Sleep card is tapped, real graph/breakdown. New screen, not a small add.
- HRV (and other metrics) normative-context graphic -- Justin liked the LOOK of an age/gender HRV reference table (a clean banded table: age range x sex x value). Idea: show "is my number typical for my age/sex" context inside the metric drill-down. PINNED 2026-06-14, HOLD. Two real blockers to solve first: (1) the reference table Justin shared is RMSSD / ln(RMSSD) based, but our HRV metric is SDNN -- different scale, does NOT map; we would need SDNN-specific age/sex norms (noisier, less standardized). (2) Philosophy: our recovery model is deliberately baseline-relative (you vs your own normal), so a population chart slightly cuts against that message -- would need careful "context only, your trend matters more" framing. Revisit as a drill-down enhancement once good SDNN norms are sourced.

---

## FAITH

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
