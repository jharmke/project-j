# NOTES -- Body Measurements (Working Discussion Doc)
# Session 62 -- June 24 2026
# STATUS: ACTIVE DISCUSSION. Nothing here is final. Do not treat as spec.
# When decisions are locked, fold into SPEC_body_progress.md (or split into separate spec files -- TBD).

---

## Context

Body measurements is Part 2 of the broader Body Progress feature (SPEC_body_progress.md covers the full picture including photos). Photos are a separate phase -- measurements are the priority focus right now. This doc covers measurements only.

---

## Where It Lives -- PARTIALLY DECIDED, STILL DISCUSSING

- Stats tab gains a new collapsible section: FITNESS (name TBD -- leaning FITNESS, also considering BODY, PHYSIQUE. Not decided.)
- This section replaces/absorbs the current standalone HEART RATE ZONES section. Heart Rate Zones folds into FITNESS as one of its cards.
- Stats sections after consolidation: At a Glance, Trends, Records, Streaks, Challenges, Calendar, FITNESS, Reports. Cleaner than adding a ninth section.
- FITNESS section expands inline like all other Stats sections -- does NOT navigate on tap. Consistent with existing behavior.
- Inside FITNESS when expanded: Heart Rate Zones card (existing) + Body Measurements card (new, condensed snapshot).
- Body Measurements condensed card taps through to a dedicated full screen. Whole card is tappable with a chevron in the top right. Also has a dedicated LOG button on the card for quick logging access without entering the full screen.
- Full dedicated screen is where: full history, all fields, graphs, logging form all live.
- Logging new measurements happens from the dedicated screen only -- NOT from the Stats FAB. TBD whether to note this in FAB options list.

OPEN: Stats FAB "Log Measurements" option -- was in old spec, decided to remove since logging lives in dedicated screen. Mark as TBD/confirmed removal pending final FAB options decision.

OPEN: Whether there is a home screen card for Body Progress at all -- deferred from old spec, still unresolved.

---



## Measurement Fields -- DECIDED (with one TBD)

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
- Navy Method Body Fat % -- Neck + Waist for males, Neck + Waist + Hips for females. Uses sex from profile. Only shown when required inputs are present.

**TBD -- Future Consideration:**
- Wrist -- excluded for now. Some body fat formulas use it (Army/Heritage methods, not Navy). Bodybuilders don't typically track it for progress. Left out of v1 but flagged for future consideration if user demand warrants it.

**Removed vs old spec:**
- No ankle (dropped, not useful for progress tracking)
- Shoulders confirmed as single measurement not bilateral

**Units:** inches default, cm toggle. Preference saved to profile. (Carried from old spec -- not re-discussed, assumed still correct.)

---

## Logging Form -- PARTIALLY DECIDED

- Lives in the dedicated Body Measurements screen only. No FAB shortcut.
- Flat form, scroll to see all fields. No multi-step wizard. (Carried from old spec.)
- Fields grouped by region:
  - Upper Body: Neck, Chest, Shoulders
  - Core: Waist, Hips
  - Arms: Left/Right Bicep, Left/Right Forearm
  - Legs: Left/Right Thigh, Left/Right Calf
  - Calculated: Navy BF% (read-only, auto-fills)
- All fields optional. Empty fields save as null, not 0. (Carried from old spec.)
- No pre-fill with last logged values. Instead: ghost/dim previous values shown as placeholder text only. User sees context ("last: 14.5in") without accidentally saving stale data. Decided.
- Today only -- no past date entry for v1. Rationale: measurements are taken live with a tape measure, not logged from memory. POTENTIAL FUTURE FEATURE -- past date entry noted as TBD if user demand warrants it.
- Trend arrow on logging form (showing up/down vs last value as new value is entered) -- decided NO. Form is for data entry only. Trends live on the dashboard after save. Keeps form clean and focused.
- Logging opens as a full screen, not a modal. 13 grouped fields is too much for a modal. FAB on dedicated screen taps into full screen logging form → save → back to dashboard.

---

## Dedicated Screen -- PARTIALLY DECIDED

Dashboard layout, not a history-first view. Three sections:

- **Top -- Current Snapshot:** Most recent logged values for key metrics. Big readable numbers, date logged underneath each. Not all 13 fields -- key ones only (waist, BF%, biceps etc). "Where am I right now" glance.
- **Middle -- Trends:** Collapsible. Mini sparkline graphs for key metrics over time. Default collapsed -- user expands what they care about. Mirrors Stats > Trends pattern, same graph card component scoped to measurement fields. Decided: trends live here, NOT on the logging form.
- **Bottom -- History:** Reverse chronological list of all logged entries. Tap any entry to expand and see all fields logged that session.
- **FAB:** Bottom right, accent color, scale-press behavior per build standard. Taps into full screen logging form.
- **Export / Progress Report:** Shareable progress image -- key stats, delta from start date, optional before/after photo slot. Export via native iOS share sheet. Image export first, PDF as potential pro feature later. Flagged as its own future item, does not block core feature build.

OPEN: Condensed card on dashboard top -- does it show all fields with last known value per field (even if logged at different dates), or only fields from the single most recent session? Leaning: show all fields with their individual last known value + date. More useful, but could look messy if dates vary widely. Not decided.

---

## Condensed Card -- UPDATED, PARTIALLY DECIDED

- Card is tappable (whole card), chevron top right.
- Dedicated LOG button on card (accent colored).
- Deltas INCLUDED alongside current values. Decided.
- 4-6 user-picked measurement slots from the 13 circumference fields. User picks which fields show. Simple picker -- not a full settings deep-dive. Same pattern as Stats graph card picker.
- Default slots driven by goal direction (see Goals below) if set. Fallback default TBD at build time if no goal set.
- Grid layout: 2 columns. If odd number of slots selected, last box is centered (2x2x1 pattern).
- Fixed footer row below the slots: Weight + Navy BF%. Always shown if data exists. NOT one of the 4-6 customizable slots -- separate fixed section.
- Each slot: value prominent, field label, delta from first logged entry underneath.
- Shows most recent logged value per field (each field tracks its own last-known value independently).

---

## Goals -- NEW, PARTIALLY DECIDED

- Optional. Never required.
- Two tiers:
  - Direction only: Cutting / Bulking / Maintaining. Drives default condensed card field selection. No specific numbers needed.
  - Specific targets (power user, optional): e.g. Waist goal: 32in, BF% goal: 15%. If set, shows progress toward target. If not set, shows delta from first logged entry only.
- Goal direction is not a hard lock on condensed card fields -- just drives the smart default. User can override via the field picker.
- Where goal is set: TBD -- likely inside the dedicated Body Measurements screen or profile. Not decided.

---

## How-To Tooltips -- PARTIALLY DECIDED

- Every measurement field has a (i) icon. Purpose: technique guidance, not a definition. Tape measurement placement is non-obvious for most users (flexed vs relaxed, snug vs tight, exact position). All 13 fields warrant it.
- OPEN: Whether this is a full TooltipModal per field or a simpler inline expandable instruction. Full modal may be excessive -- needs decision. Could simplify to inline expand.
- Tapping opens TooltipModal with: measurement name, placement instructions (text), visual asset, technique callout where relevant.
- Visual asset approach: HYBRID -- image/visual + written step-by-step instructions. Same pattern as exercise library. NOT text-only. NOT a hard blocker on static illustration assets for v1 -- can ship with good copy and add visuals as a polish pass.
- Old spec required one illustration per field as a hard blocker before ship. CHANGED -- illustrations are not a hard blocker for v1.
- OPEN: Source/format of visual assets not yet decided. Options: custom line-art SVG (original spec), GIF/short video of technique, or sourced reference images. Needs decision before build.
- One (i) per field per existing tooltip scope rule.
- All tooltips must be added to tooltipRegistry.ts and appear in Settings > Help per build standard.

---

## Measurement History -- CARRIED FROM OLD SPEC, NOT RE-DISCUSSED

- Each log is a dated entry.
- User can log as frequently as they want -- no minimum frequency.
- History view: reverse chronological order. Tap entry to view full detail or edit.
- OPEN: Edit behavior -- can user edit any historical entry, or only the most recent? Not discussed.
- OPEN: Delete behavior -- can user delete a historical entry? Confirm Alert + heavy haptic per build standard assumed yes but not discussed.

---

## Stats Graph Integration -- CARRIED FROM OLD SPEC, NOT RE-DISCUSSED

- All measurement fields available as graph series in Stats > Trends graph system.
- Same pattern as existing graph cards (weight, sleep score, steps etc).
- User can add "Left Bicep", "Waist", "Navy BF%" etc as graph cards.
- Navy BF% available as a graph series once measurements system ships. (Old spec noted body fat % was removed from HealthKit integration -- this is the intended replacement home for it.)

---

## Tutorial / Toolkit -- DECIDED

- Required. Measurements feature has significant technique nuance.
- Tutorial and toolkit both needed -- not optional.
- Exact content TBD at build time.

---

## Disclaimer -- OPEN

- Navy BF% is a health metric. Disclaimer modal likely required per build standard.
- Not yet confirmed. Assume yes until decided otherwise.

---

## Mindful Mode Behavior -- OPEN

- Not yet discussed. Per mode-awareness build standard: must be defined before ship.
- Likely: measurements logging unaffected by Mindful mode (it's data entry, not judgment). BF% display behavior may need thought.

---

## Storage -- CARRIED FROM OLD SPEC

- AsyncStorage key: `pj_body_measurements`
- Array of dated measurement entries, each with all fields (null for fields not logged).
- No Firebase Storage dependency for measurements (photos need Firebase Storage, measurements do not).

---

## Build Blockers -- UPDATED FROM OLD SPEC

Old spec blockers:
1. Firebase Storage migration -- STILL REQUIRED for photos. NOT a blocker for measurements since measurements use AsyncStorage only.
2. Illustration assets -- NO LONGER A HARD BLOCKER. Hybrid approach (copy + visuals) adopted, can ship v1 without full illustration set.
3. Timelapse tech spike -- PHOTOS ONLY. Not relevant to measurements.

Current measurements-specific blockers:
- None identified yet. Measurements can potentially be built independently of the photo system.

---

## Open Questions -- CONSOLIDATED

1. FITNESS section name final decision (FITNESS / BODY / PHYSIQUE / other)
2. Stats FAB "Log Measurements" option -- confirm removal
3. Dashboard top snapshot: all fields with individual last-known dates vs most recent session only -- leaning all fields with individual dates, not decided
4. History: edit any entry or most recent only?
5. History: delete entries -- behavior and confirmation?
6. How-to tooltip visual asset format (custom SVG / GIF / video / other)
7. Navy BF% disclaimer modal -- confirm yes/no
8. Mindful mode behavior for measurements
9. Home screen card for Body Progress -- still unresolved from old spec
10. Whether to split SPEC_body_progress.md into separate photos + measurements spec files once decisions lock
11. Day Detail integration -- photos leaning no. Measurements indicator in Day Detail -- small line/indicator potentially useful, not decided.
12. Apple Health circumference data -- HealthKit almost certainly does NOT support standard circumference types. Stray BF% Justin saw in Health was likely smart scale or third party app. Confidence medium -- verify before build. No import planned for v1.
13. Export / progress report -- image export via share sheet confirmed as future item. PDF as potential pro feature. Does not block core build.
14. Where goal direction / specific targets are set -- dedicated screen or profile? Not decided.
15. Condensed card fallback default fields if no goal direction set -- TBD at build time.

---

## What Still Needs Discussion This Session (or future sessions)

- Dashboard snapshot -- all fields with individual dates vs most recent session only (leaning all fields)
- History UX -- edit and delete behavior
- How-to tooltip visual asset format
- Graph card behavior for measurement fields (inside dedicated screen trends section)
- Achievement hooks (first measurement logged, consistency streak etc) -- not yet discussed
- Whether measurements tie into Smart Coach / EvR system at all -- not yet discussed
- Export / progress report design -- future item, own discussion when closer to build
- Where goal direction / specific targets are set (dedicated screen vs profile)
- Condensed card default fields when no goal direction set
