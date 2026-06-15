# Handoff: Recovery hero redesign + Drill-down Slice 2 (2026-06-15)

Pick up here in a fresh thread. Read CLAUDE.md, project_j_roadmap.md, SPEC_recovery_coach.md, SPEC_sleep.md (Section 13) first.

## What shipped this session (all committed, tree clean)
Commits: c26fbc0 (hero redesign), 16a5da1 (Slice 2 recovery graphs), d756b4a (Slice 2 sleep graphs).

1. **Recovery hero redesign** (app/sleep.tsx renderRecovery heroCard): score in the shared ScoreRing donut + zone word; each signal row got a divergent bar (center = 7d baseline, right/green helping, left/amber dragging, magnitude = |comp.score-75|/25). Baselines fold into each row as "Base XX" subtext. Retired the Key Signals card + its dead rangeBaselineSignals state/effect. SpO2 gets a RangeBar (90-100, green >=95, tick at 95). Row coloring consistent: NO arrow, delta colored by good/bad (rc). HRV delta now 1 decimal. Mindful: growth-ON falls through to full hero; growth-OFF gets accent glyph/word + single-tone accent observational bars (DivergentBar `tone` prop). Baseline window locked 7d/fixed.

2. **Drill-down Slice 2** (components/MetricDrilldownModal.tsx + app/sleep.tsx): tap any metric -> MiniMetricChart trend graph (auto-scaled round-number y-axis via a modal-local niceYTicks WITHOUT the 2.5 step, area+line+dots, tap a point to read date+value in the header line, width via onLayout). Data from LOCAL storage (pj_<date> recoverySignals/activeCalories) + in-memory sleep history -- NO new HealthKit query (fetchSignalHistory stays parked; this resolves SPEC_sleep 13.5/13.8). buildMetricHistory(key, days) in sleep.tsx loads it in an effect on drillKey/range change. Today's heart-signal point falls back to live hero values when storage lacks it. Mindful neutralizes chartColor to accent. Both tabs done: recovery (hrv/rhr/resp/spo2/activity/sleepScore) + sleep (deep/rem/bedtime/sleepBalance/wakeEvents). Bedtime + sleepBalance use custom y labels via chartValueFormat (clock time / hours).

## OPEN / NEXT (priority order)
1. **[FIXED 2026-06-15, DEVICE-VERIFIED] Bedtime drill-down y-axis labels clipped on the LEFT.** MiniMetricChart PAD_L is now dynamic: sized to the widest formatted tick label (maxTickChars * 4.3 + 6, floored at 32) so wide clock-time/hours labels get the gutter they need while numeric metrics stay pixel-identical at 32. Reordered so ticks/fmtTick compute before PAD_L. components/MetricDrilldownModal.tsx MiniMetricChart. (Initial pass over-reserved the gutter; tightened the per-char estimate after device check.)
2. **Device verify Slice 2** both tabs (run "Backfill Recovery History" dev tool first so recovery signal graphs have depth). Theme audit (all 5). Mindful verify.
3. **[BUG, pre-existing] Recovery tab "Text strings must be rendered within a <Text>"** on 30D view -- NOT in the hero (range-independent); likely the Trend card or a 30D path. Never located. Needs repro + hunt. (roadmap BUGS section)
4. Parked formula question: activity is two-sided (any deviation from norm drags recovery, so a lighter day reads as a mild drag, not a win). Debatable for recovery; changing it shifts everyone's scores -> deliberate decision later.

## Process reminders (from CLAUDE.md)
- Confirm before file changes; restate task + wait for go-ahead. One change at a time, verified before next. 2 attempts max on a bug.
- No double-dash in user-facing app strings. Never wipe/overwrite pj_* AsyncStorage (read-then-merge).
- Update roadmap in real time. Commit after each gate-passing feature (PowerShell, git one command at a time, simple add . / commit). Justin verifies on device; pure JS hot-reloads, no rebuild.
- Justin doesn't read code/diffs -- confirm in plain English. No AskUserQuestion picker. No pushing to remote unless asked.
