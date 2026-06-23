# SPEC: HR Zone Training

Status: DESIGN IN PROGRESS (started 2026-06-23). Calculation foundation LOCKED with Justin. Display/surface + settings + build order still open.

Roadmap origin: WORKOUT section, "HR Zone Training: 5-zone system, max HR (220-age default, user-settable), optional Karvonen. Stats: time-in-zone stacked bar." This spec supersedes that one-liner.

Pure JS feature: raw heart-rate (`HKQuantityTypeIdentifierHeartRate`) is already an authorized HealthKit read (used by the recovery/RHR system) and `queryWorkoutSamples` already returns workout start/end. NO new permission, NO native rebuild.

---

## 1. Why we did the research (accuracy mandate)
Justin's requirement: calculations must be relevant, useful, and accurate. We studied Garmin, Whoop, and the max-HR literature before locking anything.

Findings:
- **Garmin**: defaults to **%Max HR**, zones at 50/60/70/80/90/100% of max. Estimates max HR as 220-age then AUTO-RAISES from observed workout peaks. Offers %HRR as an option.
- **Whoop**: defaults to **%HRR (Karvonen)** because it factors in resting HR (personalizes to fitness). Estimates max HR with the Gellish formula (not 220-age), nudges from real peak.
- **Max-HR formula accuracy**: plain **220-age is the LEAST accurate** (biased, +/-10-12 bpm, worse for women and over-40). **Tanaka (208 - 0.7 x age)** is the validated best age-based formula (2001 meta-analysis of 351 studies). Most accurate practical approach used by both Garmin and Whoop: start from a formula, then trust the user's real observed peak HR when higher.

Sources: Garmin HR-zone docs; WHOOP max-HR/zone docs; Tanaka vs 220-age studies (SciELO, SimpliFaster).

---

## 2. LOCKED calculation model (confirmed with Justin 2026-06-23)

### 2.1 Zone model: %HRR default, %Max HR toggle
- **Default = %HRR (Karvonen)**: zone bound = ((maxHR - restingHR) x pct) + restingHR. Chosen because it personalizes to fitness and we already compute a solid overnight resting HR.
- **Toggle = %Max HR**: zone bound = maxHR x pct. Simpler Garmin-style; offered as a setting because it's cheap once the engine exists.

### 2.2 Max HR: Tanaka + observed-peak auto-raise + manual override
- Default estimate: **Tanaka = round(208 - 0.7 x age)** (age from profile birthday). NOT 220-age.
- **Auto-raise**: if the user's recorded workout HR samples show a peak higher than the current estimate, use the observed peak (Garmin/Whoop behavior). Track the highest HR sample seen across workout windows.
- **Manual override** always wins (settable in Settings).
- Honest-numbers rule: the UI must show WHICH max HR is in use and its source (estimated / observed / manual). Never hide it.

### 2.3 Resting HR (for Karvonen)
- Use the same overnight resting HR the recovery system computes (the RHR baseline), the best resting value we have. Document the exact source field at build time.

### 2.4 Zone boundaries (universal 5-zone split)
Applied through whichever model is active. Below 50% = uncounted/rest (not a zone).
- Z1 Warm Up: 50-60%
- Z2 Fat Burn: 60-70%
- Z3 Cardio: 70-80%
- Z4 Threshold: 80-90%
- Z5 Peak: 90-100%
(Zone NAMES still subject to a final copy pass; these are the working set.)

### 2.5 Time-in-zone computation
For a given workout: query raw HR samples between workout start and end, assign each sample (or the interval it represents) to a zone by the active model, and sum duration per zone. Mirror the existing sleep-window HR query pattern in useHealthKit.

---

## 3. Data source + entry point (workout tab is day-based)
- HR zones exist ONLY for workouts with recorded HR over a time window = real **Apple Health workout sessions** (imported as day rows with `fromAppleHealth: true`, `appleHealthUUID`, `appleStartDate`). The session END time must also be available (currently only start is stored on import; add appleEndDate or re-query).
- The app's own **strength checkmarks are NOT time-bounded sessions** -> no HR window -> no zones, UNLESS the watch recorded the lift as an Apple workout (then it imports and qualifies).
- Primary surface (LOCKED direction): **per-workout first** -- tapping a completed Apple Health cardio row in the workout tab opens its zone breakdown. Stats aggregate (time-in-zone stacked bar over 7/30d) is the fast-follow.

---

## 3a. LOCKED scope + display (confirmed with Justin 2026-06-23)
- **Scope: RECORDED workouts only.** HR zones require continuous HR samples over the workout window, so they exist only for Apple Health workout sessions. Manual / watchless workouts get a clean non-judgmental EMPTY STATE ("HR zones need heart-rate data from a watch or tracker"); we NEVER fake or estimate them (honest-numbers). Building a manual workout tracker would NOT unlock zones (a phone can't measure HR during exercise), so the two are unrelated -- do not build manual tracking for this.
  - Parked future edge: a workout logged manually in-app on a day the user WORE a watch has HR in Apple Health but we don't store the manual log's exact start time, so we can't pull the window. Could add a start-time field to manual logs later to enable it. Low value, parked.
- **Display: horizontal STACKED BAR + rows, in a centered modal.** Entry point = a small "HR Zones >" chip on Apple Health cardio rows that have HR data (does NOT hijack the name-tap=instructions or the edit/delete/check buttons; only appears where zone data exists, so it is self-documenting). Bar chosen over a donut because zones are an ordered intensity ladder and need bpm-range + time labels (Garmin/Whoop/Apple all use bars). Justin is used to donuts from other trackers but agreed to try the bar; the chart is a cheap swap, so we prototype the bar on his REAL workout data and revisit a donut only if it does not land. Layout: name + duration header; proportional 5-segment stacked bar; 5 rows (zone name, bpm range, time); max HR value + source line; active model line; inline disclaimer.

## 4. OPEN -- next design steps (not yet decided)
- **4.2 Stats time-in-zone aggregate**: [BUILT 2026-06-23, NEEDS DEVICE VERIFY] New "Heart Rate Zones" system section in the Stats tab (renamed from "Time in Zones" per Justin). BARS = each zone's SHARE OF TOTAL tracked time (bars sum to 100%), NOT relative-to-longest-bar (the first cut used max-bar scaling, which made 3 big similar zones all look near-full on 30D and read as meaningless; switched both the stats card AND the per-workout modal to share-of-total so "full" = a real fraction of time). System-section labels now always sync to the registry default in loadStatsCards (so a rename isn't stranded by a cached saved label). Card header drops the redundant name (the section header already says it), shows "{N} Workouts" when loaded. statsCardRegistry: added 'hrZones' SystemCardKey + sys_hrZones default (order 11, after Challenges; calendar/reports bumped to 12/13) + INSERT_AFTER sys_hrZones->sys_challenges so existing users get it slotted after Challenges, not stranded at the bottom (same safe additive pattern as Challenges). components/HRZonesStatsCard.tsx (self-contained, mounts its own useHealthKit): 7D/30D toggle, fetches all workout windows in range + their HR in PARALLEL (Promise.all), sums time-in-zone via the shared engine across every workout with HR, renders the same Garmin-style bars (Z5->Z1 + grey Below Zone, animated) + workout count + Max HR/Zones footer + (i) hr_zones tooltip + disclaimer. Loading spinner + empty state (no workout HR). Reads the same pj_settings override/model + frozen resting HR as the per-workout modal, so it stays consistent. Refetches on period change + hasHealthData (not every focus, to avoid hammering HealthKit). tsc clean (16 pre-existing). PERF NOTE: parallel fetch keeps it reasonable; if 30D feels slow with many workouts, add a per-UUID cache later. VERIFY: open Stats > Time in Zones, toggle 7D/30D, confirm totals look right + match the per-workout modals; empty state for no-HR; 5-theme audit.
- **4.3 Settings**: where max-HR override + model toggle live (likely a new block under Goals or Health).
- **4.4 Zone colors**: the blue->green->yellow->orange->red convention vs the app's design-system tokens; must pass 5-theme audit.
- **4.5 Empty states**: watchless / no-HR-recorded workout.
- **4.6 Disclaimer**: inline micro disclaimer + first-use modal (max HR is an estimate, not medical). Per Build Standards.
- **4.7 Mode-awareness**: zones shown factually in ALL modes; suppress prescriptive "spend more time in Z4" coaching in Mindful; Discipline/Balanced may show targets.
- **4.8 Tooltip + tutorial**: (i) tooltip entry + eventual interactive tutorial per standards.

---

## 5. Build order (draft, refine as display locks)
1. [BUILT 2026-06-23, NEEDS DEVICE VERIFY VIA DUMP] Calculation engine (util) + HR fetch + dev dump. utils/hrZones.ts: tanakaMaxHR, resolveMaxHR (manual > observed-peak > Tanaka estimate, returns source), zoneBounds (Karvonen %HRR or %Max, falls back to %Max if no resting HR), zoneForValue, timeInZones (attributes inter-sample interval to earlier sample's zone, clamps gaps > 30s so auto-pause doesn't dump time), fmtZoneTime, ageFromBirthday. HR_ZONES table (50/60/70/80/90/100%, universal blue->red colors). useHealthKit.ts: fetchWorkoutWindows(days) (workout start/end from queryWorkoutSamples) + fetchWorkoutHeartRate(startMs,endMs) (raw HR samples in window), both exposed. settings.tsx dev tool "Dump HR Zones (recent workouts)": last 5 Apple workouts, resolves max HR (age from pj_profile.birthday, resting from fetchRecoverySignals.rhrBaseline, override from pj_settings.hrMaxOverride, model from pj_settings.hrZoneModel default hrr), shows max HR + source, zone bpm ranges, and time-in-zone per workout. Read-only. tsc clean (16 pre-existing). VERIFY ON DEVICE: run the dump, sanity-check zone ranges + that time-in-zone roughly matches each workout's duration and feels right for the effort. THEN build UI.
2. [BUILT 2026-06-23, NEEDS DEVICE VERIFY] Per-workout display + entry point. components/HRZoneModal.tsx: centered card (spring scale 0.85->1 + opacity on show, handle pill, tap-off close, accent top border), Garmin-style independent bars (Z5->Z1 + grey "Below Zone"), each bar width = its time / max-row-time, ANIMATED in over 650ms. Header = accent "HR ZONES" label + workout name + duration. Zone times in BebasNeue, labels DMSans, bpm range per row, colored dot per zone. Footer = "Max HR {x} . {source}" + model line (Karvonen w/ resting HR, or % of max) + inline disclaimer. Loading + empty states. useHealthKit.fetchWorkoutHRByUUID(uuid, approxDate) finds the workout by UUID on its calendar day + returns window + HR samples (works for any imported workout, no migration). workout.tsx: "HR Zones >" chip (accent, pulse icon) on Apple Health CARDIO rows with a UUID; openHRZones handler resolves age (Tanaka), manual override + model + observed peak (pj_settings), latest frozen resting HR (walk back 14 days of pj_<date>.recoverySignals.rhr), PERSISTS a new observed-peak high to pj_settings.hrObservedPeak (auto-raise, read-then-merge), computes zones, opens modal. tsc clean (16 pre-existing). NOTE: chip is cardio-only for v1; Apple STRENGTH workouts also carry HR and could show zones later (fast-follow). VERIFY: tap a recorded cardio workout's chip, confirm bars animate + numbers match the dev dump, aesthetics/haptics/themes; a no-HR workout shows the empty state.
2b. [DONE 2026-06-23, device-verified] Modal + tooltip polish. Apple Health badge moved to its own line under the exercise name (consistent regardless of name length). Modal bottom rows reworded + made consistent: "Max HR  188 bpm . Based on your age" (source labels capitalized: Based on your age / From your workouts / Set by you) and "Zones  Personalized to your resting HR (52)" (dropped the jargon words "Method" + "Karvonen" from the row). Modal title dropped to textSecondary (was harsh near-black). Disclaimer centered. hr_zones tooltip: all hyphens scrubbed, zone names COLORED by zone (Z1 blue -> Z5 red, Below grey) via a new optional `termColor` on tooltip definitions (TooltipModal renders it). (i) added to modal header (hideTour, no dead tour button). Justin approved all.
3. [BUILT 2026-06-23, NEEDS DEVICE VERIFY] Settings (max HR override + model toggle). Lives in Settings > Health (alongside Burn Accuracy, same calibration-control nature; subtitle now "Burn Accuracy . HR Zones . Apple Health", (i) hr_zones tooltip on the block). MAX HR field: numeric TextInput, placeholder = the Tanaka age estimate, saves on blur/end-edit (valid 100-230, empty reverts to estimate, invalid reverts to last good); writes pj_settings.hrMaxOverride (null when blank). Inline hint per the disclaimer decision ("Leave blank to use the estimate (188 bpm, based on your age). Only set your own if you know it from a test or race." / when set: "Using your number, X bpm."). ZONE METHOD toggle: two pills "Personalized" (hrr) / "Max HR" (maxhr), plain-language (no Karvonen/%HRR jargon), writes pj_settings.hrZoneModel, with a one-line explainer. Both already consumed by the modal handler + dev dump (they read hrMaxOverride/hrZoneModel from pj_settings), so changing them here flows straight into the per-workout modal. NO toast (matches Burn Accuracy's immediate-save pattern in the same section). NO full first-use medical modal (inline hint + the modal's existing "Not medical advice" line cover it). tsc clean (16 pre-existing). VERIFY: set a max HR, reopen a workout's zones, confirm the ranges shift + the modal's "Set by you" source shows; toggle Personalized/Max HR and confirm the zones + modal method line change; blank the field reverts to the estimate; 5-theme audit.
4. Stats time-in-zone aggregate.
5. Disclaimer + tooltip + tutorial + Mindful pass + 5-theme audit.
