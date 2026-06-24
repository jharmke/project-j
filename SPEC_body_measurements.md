# SPEC -- Body Measurements (v1)
Last updated: 2026-06-24
Status: SPECCED -- decisions locked, not yet built. No hard blockers (AsyncStorage only; illustrations no longer block).

This is the authoritative spec for the MEASUREMENTS half of Body Progress. Photos are a
separate, later phase and still live in SPEC_body_progress.md (Part 1). The measurements
content in SPEC_body_progress.md (its Part 2) is SUPERSEDED by this file.

---

## Overview

A body-measurements tracker living in a new BODY section of the Stats tab. Tape-measure
circumference fields + an auto-calculated Navy body fat %, with a dedicated screen for the
full dashboard (snapshot, trends, history) and a condensed glance card in Stats. Foundation
first: log, view, trend, edit. Achievements / coach integration / home card are deferred
(see "Deferred to a Later Version").

---

## Where It Lives -- LOCKED

- Stats tab gains a new collapsible section: **BODY** (name locked; HR Zones shares the
  section, which is why "Physique" was rejected).
- BODY **absorbs the existing standalone HEART RATE ZONES section** -- HR Zones folds in as
  one of BODY's cards.
- Stats sections after consolidation: At a Glance, Trends, Records, Streaks, Challenges,
  Calendar, **BODY**, Reports. (Folding HR Zones in avoids adding a ninth section.)
- BODY expands **inline** like every other Stats section -- it does NOT navigate on tap.
- Inside BODY when expanded: **Heart Rate Zones card** (existing) + **Body Measurements
  condensed card** (new).
- The Body Measurements condensed card taps through to a **dedicated full screen** (whole
  card tappable, chevron top-right). It also has a dedicated **LOG button** for quick access
  to logging without entering the full screen.
- The dedicated screen is where full history, all fields, graphs, and the logging form live.
- **Logging happens from the dedicated screen only** -- NOT from the Stats FAB.

---

## Measurement Fields -- LOCKED

**Circumference (tape measure, all user-entered):**
- Neck
- Chest (at nipple line)
- Shoulders (widest point -- single measurement, NOT left/right split)
- Waist (at navel)
- Hips (widest point)
- Left Bicep (flexed, at peak)
- Right Bicep (flexed, at peak)
- Left Forearm (widest point)
- Right Forearm (widest point)
- Left Thigh (widest point)
- Right Thigh (widest point)
- Left Calf (widest point)
- Right Calf (widest point)

**Calculated (auto-computed, read-only):**
- **Navy Method Body Fat %** -- Neck + Waist for males, Neck + Waist + Hips for females.
  Uses sex from profile. Only shown when required inputs are present. This is the intended
  replacement home for the retired HealthKit Body Fat % (see backlog).

**Removed vs old spec:** no ankle (not useful for progress); shoulders is single, not bilateral.

**Deferred field:** Wrist -- excluded from v1. Some BF% formulas use it (Army/Heritage, not
Navy); bodybuilders don't track it for progress. Flagged for future if demand warrants.

**Units:** inches default, cm toggle. Preference saved to profile.

---

## Logging Form -- LOCKED

- Lives in the dedicated Body Measurements screen only. No FAB shortcut.
- Opens as a **full screen, not a modal** (13 grouped fields is too much for a modal).
- Flat form, scroll to see all fields. No multi-step wizard.
- Fields grouped by region:
  - Upper Body: Neck, Chest, Shoulders
  - Core: Waist, Hips
  - Arms: Left/Right Bicep, Left/Right Forearm
  - Legs: Left/Right Thigh, Left/Right Calf
  - Calculated: Navy BF% (read-only, auto-fills when inputs present)
- All fields optional. Empty fields save as **null, not 0**.
- **No pre-fill** of new logs with last values. Instead show the previous value as a
  ghost/dim **placeholder** ("last: 14.5 in") so the user has context without accidentally
  saving stale data.
- **Today only** -- no past-date entry in v1 (measurements are taken live with a tape, not
  logged from memory). Past-date entry flagged as a potential future feature.
- **No trend arrow on the form** -- the form is data entry only; trends live on the dashboard.

---

## Dedicated Screen -- LOCKED

Dashboard layout (not history-first). Four parts + FAB:

- **Top -- Current Snapshot:** Shows **every field's last-known value with its own date**,
  not just the most recent session. Big readable numbers, date under each. **Staleness is
  labeled honestly:** values older than ~30 days render muted with a relative age ("3mo ago")
  so a months-old number never reads as fresh. (Decision: all-fields-last-known beats
  most-recent-session-only because users don't always measure all 13 at once; honest
  staleness labeling solves the "messy varying dates" concern.)
- **Middle -- Trends:** Collapsible, default collapsed. Mini sparkline graphs per key metric,
  user expands what they care about. Mirrors Stats > Trends, same graph-card component scoped
  to measurement fields.
- **Bottom -- History:** Reverse-chronological list of all logged entries. Tap an entry to
  expand and see every field logged that session.
- **FAB:** Bottom-right, accent color, scale-press per build standard. Opens the full-screen
  logging form.
- **Export / Progress Report:** Shareable progress image (key stats, delta from start,
  optional before/after photo slot), exported via native iOS share sheet. Image export first,
  PDF a potential Pro feature later. Its own future item -- does NOT block the core build.

---

## Condensed Card (in Stats > BODY) -- LOCKED

- Whole card tappable (chevron top-right) -> dedicated screen.
- Dedicated **LOG button** (accent colored) for quick logging.
- **Deltas included** alongside current values.
- **4-6 user-picked slots** from the 13 circumference fields. Simple picker, same pattern as
  the Stats graph-card picker.
- **Grid layout, 2 columns.** Odd count -> last box centered (2x2x1).
- **Fixed footer row:** Weight + Navy BF%. Always shown if data exists. NOT one of the
  customizable slots -- a separate fixed section.
- Each slot: prominent value, field label, **delta from first logged entry** underneath.
- Shows the **most recent logged value per field** (each field tracks its own last-known
  value independently).
- Default slot selection is driven by goal direction if set (see Goals); fallback default
  when no goal is set is TBD at build (see Open Items).

---

## How-To "How to Measure" Modal -- STRUCTURE LOCKED, FEEL TBD AT BUILD

- The logging form has a **single "How to measure" entry point** at the top (NOT a separate
  (i) on each of the 13 fields -- that was rejected as cluttered).
- Tapping it opens a centered floating modal (house standard: handle pill, scale+opacity
  animation, no bottom sheet) that **opens to an INDEX**, not to a specific measurement:
  - **Index page:** all 13 measurements as a grid, **grouped by region** (Upper Body / Core /
    Arms / Legs -- mirrors the form's grouping). Everything visible at once; no horizontal
    scrolling hunt. (Opening to an index removes the "why is Neck always first" problem -- there
    is no forced first item.)
  - **Detail page:** tapping a tile slides to that measurement's page -- hero visual + step-by-
    step copy -- with a "All measurements" back link and **left/right swipe** between siblings.
  - **Motion:** tap-from-index -> detail fades/slides in, hero visual fades+scales, steps
    **cascade** in (staggered). Swipe within detail -> horizontal carousel slide, content swaps
    in place. Exact feel is tuned on-device at build time (build this modal early so Justin can
    eyeball it before the rest of the feature wires up).
- **Content is hybrid: visual + written steps** (same idea as the exercise library). NOT
  text-only.
- **Illustrations are NOT a hard blocker for v1** (changed from old spec). Can ship with good
  copy and add/upgrade visuals as a polish pass.
- Purpose is **technique guidance** (flexed vs relaxed, snug vs tight, exact placement), not a
  definition.
- All entries go in **tooltipRegistry.ts** and appear in **Settings > Help** per build standard.

---

## Measurement History -- LOCKED

- Each log is a dated entry; user can log as often as they want (no minimum frequency).
- History view: reverse chronological. Tap an entry to expand/view all its fields.
- **Edit ANY historical entry**, not just the most recent. Tapping an entry opens that session
  **pre-filled** with its values (the one place we pre-fill, because it's correcting real data,
  not logging new). Saving recomputes that entry's Navy BF% and any deltas. This does not break
  the today-only logging rule -- editing corrects an existing dated entry, it does not invent a
  new past date.
- **Delete ANY entry** with the destructive guardrail: confirm Alert + heavy haptic + toast on
  completion. Deleting the baseline/first entry shifts "delta from start" to the next-oldest,
  recomputed automatically. No silent deletes.

---

## Goals -- PARTIALLY LOCKED

- Optional. Never required.
- Two tiers:
  - **Direction only:** Cutting / Bulking / Maintaining. Drives the condensed card's default
    field selection. No specific numbers needed.
  - **Specific targets (optional, power user):** e.g. Waist 32 in, BF% 15%. If set, shows
    progress toward target; if not, shows delta from first logged entry only.
- Goal direction is a **smart default, not a hard lock** -- the user can override via the field
  picker.
- OPEN: where goals are set (dedicated screen vs profile) -- not decided (see Open Items).

---

## Stats Graph Integration -- LOCKED (carried)

- All measurement fields available as graph series in the Stats > Trends graph system, same
  pattern as existing graph cards (weight, sleep score, steps).
- Navy BF% available as a graph series once measurements ship (its intended new home after the
  HealthKit BF% retirement).

---

## Disclaimer -- LOCKED: YES, both layers

Navy BF% is a calculated health estimate, so it gets the full build-standard treatment:
- **Inline micro disclaimer** ("For informational purposes only. Not medical advice.") wherever
  BF% shows.
- **First-use modal** before BF% first displays -- short: Navy method is a tape-measure estimate
  (not a DEXA/clinical scan), accuracy varies by a few points, informational only. Same pattern
  as the sleep/recovery/BMR first-use modals.

---

## Mindful Mode Behavior -- LOCKED

Logging is untouched; display goes neutral.
- **Logging:** fully unaffected across all three modes (data entry, no judgment).
- **Deltas:** Discipline/Balanced may use up/down color (green/red). **Mindful strips the
  good/bad color** and presents change observationally in secondary text ("Waist 33.5 in ·
  0.5 in since start") -- no celebratory or critical tone. Mirrors weight values going
  textSecondary and the neutral YvY reframe in Mindful.
- **BF%:** still shown (user's own data), but plainly -- **no "ideal range" comparison or
  judgment** in Mindful.
- **Goals:** appearance/performance-framed, so Mindful **does not nudge goal-setting** and
  defaults to neutral "Maintaining." Still available if the user goes looking.

---

## Tutorial / Toolkit -- LOCKED

- Both required (the feature has real technique nuance). Exact content TBD at build time.

---

## Storage -- LOCKED

- AsyncStorage key: `pj_body_measurements`.
- Array of dated measurement entries; each entry holds all fields (null for fields not logged).
- **No Firebase Storage dependency** for measurements (that is a photos-only requirement).
- Each entry needs a stable id (for edit/delete by id, mirroring the My Foods id pattern).

---

## Build Blockers

- **None for measurements.** AsyncStorage only; illustrations are no longer a hard blocker.
  (Photos still need the Firebase Storage migration + a timelapse spike, but those are the
  separate photos phase, not this.)

---

## Open Items (decide at / before build)

1. **Where goals are set** -- dedicated Body Measurements screen vs profile. Not decided.
2. **Condensed card fallback default fields** when no goal direction is set -- TBD at build.
3. **How-to visual asset format** -- custom line-art SVG vs GIF/short video vs sourced
   reference images. Not decided (does not block v1; copy can ship first).
4. **Stats FAB "Log Measurements" option** -- leaning REMOVED (logging lives in the dedicated
   screen); confirm against the final FAB options list.
5. **Day Detail integration** -- a small measurements indicator/line in Day Detail could be
   useful; not decided. (Photos in Day Detail lean no for v1.)
6. **Apple Health circumference data** -- HealthKit almost certainly does NOT support standard
   circumference types; the stray BF% seen in Health was likely a smart scale / third-party
   app. Verify before build (confidence medium). No import planned for v1.
7. **Spec split bookkeeping** -- once photos are picked back up, decide whether to fully retire
   SPEC_body_progress.md Part 2 (already superseded here) and scope that file to photos only.

---

## Deferred to a Later Version (NOT in v1)

Parked in project_j_backlog.md. Build the foundation first.

- **Home screen card for Body Progress.** Home is a daily dashboard; measurements are
  weekly/monthly, so a home card would sit stale and crowd daily content. They live in
  Stats > BODY + the dedicated screen. Revisit only if quick-log access proves wanted.
- **Achievement hooks.** Behavior-only when built (first measurement logged; consistency tiers
  like 5/10/25 sessions). HARD NO to outcome-based ("hit 15% BF", "lost 2 in") -- that cuts
  against the whole-person / Mindful philosophy. Deferred to avoid the naming/description work
  right now.
- **Smart Coach / EvR tie-in.** Tempting (measurements are a "results" signal) but cadence is
  sparse and data noisy (measurement error, water fluctuation), so feeding it to a coach risks
  dishonest insights off noise. Let history accumulate as a clean standalone tracker first;
  revisit in v2 with proper Mindful gating.

---

## Gates (Three Gate Rule)

Does not ship until:
1. Works correctly -- logs persist to `pj_body_measurements`, Navy BF% calculates correctly,
   edit/delete behave, deltas/snapshot/trends read right, never loses data.
2. Looks premium -- CPP. Form, condensed card, dashboard, and how-to modal all polished.
3. Feels right -- form is fast, how-to modal motion is satisfying, trends animate, FAB and
   transitions solid.
