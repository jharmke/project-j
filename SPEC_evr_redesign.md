# SPEC: Effort vs Results Redesign

## RESUME HERE (handoff 2026-06-15)

Fresh session picking this up: read project_j_roadmap.md first (per CLAUDE.md), then this whole file. State of the redesign:

- **SHIPPED, do NOT redo:**
  - Recovery wired into the EvR coach (commit 4456016): rec_load_drag / rec_tracks_sleep / rec_sustained_low in utils/smartTipsEngine.ts.
  - Anti-weight-monopoly "headline topic fatigue" on ALL multi-topic coaching surfaces: home (track 1a, commit d1d8d25) + EvR/weekly/monthly (track 1b, commit b109c15). Lives in utils/smartTipsEngine.ts as headlineTopic() + the optional recentTopics param on selectByPrioritySpine, wired into computeCoachPacket('home'), computeCoachPacketEvr, computeCoachPacketWeekly, computeCoachPacketMonthly. Each has its own additive pj_coach_topic_hist_* key. Scoped sleep/recovery coaches are intentionally exempt (single-domain).
- **NEXT = TRACK 2: the EvR surface rebuild** in app/diagnostic-report-view.tsx. Turn the report from a scorecard into the diagnostic feed below: EvR-styled diagnostic headline + a relevance-ranked, relevant-only card feed where each card = claim + pointed proof + lever (Sections 3, 4, 6). This is UI work AND the deferred strength-weighted relevance rewrite (Section 10 item 2), done together with proof-data per card rather than bolted onto the live spine.
- **STILL OPEN:** app-wide vs EvR-only ranking scope (Justin leaned everywhere; 1a/1b already applied the fatigue everywhere, so effectively settled); ranking weight tuning; Free/Pro rework (parked, Section 10 item 3); which existing finding cards survive as diagnoses (Section 9).
- **DECISIONS LOCKED:** Sections 2 through 9. Key ones: EvR explains results good AND bad; positives count as diagnoses so there is no empty state; per-pattern auto windows, no 14/30/90 selector; never invent a problem.

Status: PARTIALLY BUILT. Engine anti-monopoly done (tracks 1a + 1b). EvR surface rebuild (track 2) not started. Free/Pro parked.

This supersedes the old EvR report model (the configurable-window scorecard with fixed finding cards). The Level 1 / Level 2 smart coaching engine stays; what changes is what EvR IS and how findings get ranked.

---

## 1. Why we are redesigning

The old EvR became a fourth scorecard. Day, Weekly, and Monthly summaries are the same template at three time scales: the Day Score composite (Nutrition 40% / Activity 35% / Recovery 25%), the metrics inside each category, weight start to end, and a Coach Insight. EvR shipped as that same thing with a 14/30/90 window selector. So it was "a weekly summary you can resize," which is why it always felt redundant and why it was hard to design (we were scared of overlapping with summaries that did not exist yet).

Three user-visible symptoms of the old model:
- The single headline tip is almost always weight/calorie. One shared ranking function ranks by a fixed family ladder where weight/calorie sits at the top, so it crowds out everything else whenever it has anything to say (which is most days).
- The domain cards are a fixed data readout, often not relevant.
- Lower-priority signals (fiber, water, sodium, IF) effectively never get a tip because they are permanently outranked.

## 2. The lane (what EvR now IS)

Take the name literally. **EvR is the diagnostic layer: it explains your results and names the lever.** The summaries tell you HOW you did (scorecard). EvR tells you WHY, and what to change.

- Summaries = retrospective scorecards on fixed calendar windows (yesterday / Sun to Sat / calendar month). Auto-generated, pushed.
- EvR = the "why + what do I do" engine. User-initiated. It correlates effort (logging, training, intake, sleep behavior) against results (weight, recovery, energy), surfaces the connection, and names the lever.

EvR explains results that are GOOD as well as bad. "Why is this working, keep it" is as much a diagnosis as "why are you stuck." EvR is an explanation engine, not a problem finder.

This cleanly resolves the overlap: summaries report, EvR diagnoses. Different jobs, no repeat.

## 3. Surface structure

Top to bottom:

1. **Headline diagnosis (Level 1, EvR-styled).** The single biggest "here is what is actually going on" right now. This is a SEPARATE packet from the home card (already is today, already deduped so EvR never echoes the home tip), so it gets its own voice: deeper and more diagnostic. The home card is a quick glance-nudge (a poke); EvR's headline is the real read.

2. **Diagnostic card feed (ranked, relevant-only).** A list of diagnosis cards, each a lever, ordered by relevance. Only cards with a genuine current pattern appear. Each carries its Level 2 "so what + what to change."

3. **States, not an empty state.** Because positives count as diagnoses, EvR almost never has nothing to say. The real states:
   - **Not enough data yet:** the existing logged-days lock (report does not generate until the minimum is met; confirm exact threshold at build, believed ~7 days).
   - **Enough data, nothing wrong:** show the positive whys ("here is what is working and why"). Never blank, never invented problems.

## 4. Card anatomy (non-negotiable)

Every diagnostic card = **claim + pointed proof + lever.** The data on a card exists to PROVE the claim, aimed at it. Not a pile of relevant numbers; the one number that backs the point.

Example:
- Claim: "Your weekends are erasing your weekday deficit."
- Proof: "Mon to Fri net: -480. Sat to Sun net: +320."
- Lever: "Treat weekend eating with the same intention as weekdays and the deficit holds."

This claim + proof + lever shape is what separates a diagnosis card from a scorecard row. Build it into the card component, not per card.

## 5. Per-pattern windows (no global selector)

The window is a property of each pattern, not a user setting. The engine already computes multiple windows internally and different rules already read different ones; we surface that and drop the selector.

Each signal has SEVERAL patterns, each with its own fixed window:
- **Fast signals, short window (~7d):** recovery acute drop, a bad-sleep run, energy. "Recovery dipped this week."
- **Behavioral patterns, medium window (~14 to 21d):** weekend spikes, protein consistency, sleep to intake, recovery tracks sleep. You need enough instances of the behavior for it to be real (e.g. a weekend pattern needs ~3 weekends).
- **Slow results, long window (30d+):** weight plateau, weight trend vs effort, sustained under-recovery. The scale moves slowly; needs a month of weigh-ins.

What picks the window for a given card: (a) the minimum data that pattern needs to be statistically real (each rule's data floor, e.g. recovery rules need 10 days), and (b) the signal's natural cadence (weight slow, recovery fast).

Result on screen: multiple cards can show at once, **each stating its own window as part of its proof** ("Last 7 days," "Across your last 4 weekends," "Over 30 days of weigh-ins"). The user never picks a window. A single signal can therefore surface a short-window story one day (acute drop) and a long-window story later (sustained slide or correlation) because they are different patterns of the same signal.

Optional later: a power-user "expand range" that widens how far each rule looks back. Auto is the default.

## 6. Relevance ranking (the anti-monopoly engine)

Replace the fixed family-first ladder with relevance-based ranking. This is the core fix for "always weight."

Ranking factors (tune at build):
- **Explanatory strength:** how strong/clear the pattern is (effect size, correlation separation).
- **Actionability:** is there a real lever the user can pull.
- **Recency / severity:** how current and how material to results.
- **Anti-repeat (fatigue decay):** a topic shown recently gets downranked so others rotate up. This is what breaks "weight every single day." The current system only excludes the single previous tip, which is too weak.

### Why the feed structure fixes the "buried forever" problem
- **Single-headline surfaces** (home card, summaries) have exactly one slot, so the bottom of any ranking starves. The fix there is the anti-repeat / fatigue decay above: rotate the headline so low-priority-but-real signals get their turn.
- **EvR is a multi-card feed.** In a ranked list, the hierarchy decides ORDER, not inclusion. Weight may be card 1, but fiber/sleep/recovery are cards 2/3/4: not buried, just below the lead. Any signal with a genuine current pattern appears. The "so far down it never shows" problem only exists with one slot; EvR's many slots dissolve it.

### Coverage principle (honest guardrail)
Coverage means "every signal that has something REAL to say gets shown," not "every metric always gets a card." No inventing a sodium tip when sodium is fine just to be fair to sodium. But when a low-tier signal genuinely has a story, it is no longer outranked into permanent silence.

## 7. App-wide ranking scope (RECOMMENDED, confirm before build)

There is ONE shared ranking function (`selectByPrioritySpine` in utils/smartTipsEngine.ts) and every coaching surface runs through it: home card, day summary, weekly, monthly, EvR. So the weight monopoly is one root cause feeding every surface.

Recommendation: make the relevance + anti-repeat ranking the shared behavior, so all surfaces benefit at once. It is one place to change (same work as fixing only EvR) and it is safe for summaries because weight is already a dedicated scorecard card there, separate from the coach tip; only the coaching headline rotates, the weight data is never hidden.

OPEN: Justin leaned "everywhere" but was not fully committed. Before build, dig surface-by-surface to confirm the rotation behaves correctly on each (home, day, weekly, monthly) and does not strip a surface of something it genuinely needs.

## 8. Mindful behavior

EvR in Mindful: observations, not verdicts. Diagnostic facts still show (factual), but framed as patterns to notice, not corrections to make. Corrective levers soften or suppress per the existing `applyMindfulSuppression` pattern; positives and neutral observations remain. The ranking should not feel like a scolding priority list in Mindful. Define each new card's Mindful copy at build time (per the standing mode-awareness rule).

## 9. What changes from the current report

- The category scorecard role LEAVES EvR (it belongs to the summaries). EvR stops being a data readout.
- Current finding cards (Consistency, Deficit, Burn Accuracy, Macros, Sleep) get re-cast as diagnostic cards (claim + proof + lever) or folded into the correlation set. Decide card-by-card at build which survive as diagnoses vs which were really just scorecard rows.
- The 14/30/90 window selector is removed in favor of per-pattern windows.
- The single-winner headline is replaced by an EvR-styled diagnostic headline + a ranked card feed.

## 10. Open decisions (carry into build)

1. **App-wide vs EvR-only ranking** (Section 7): recommended app-wide, needs final confirm + per-surface dig.
2. **Exact ranking weights / tuning:** the relevance formula factors are agreed in principle; weights need tuning against real output.
3. **Free vs Pro:** PARKED. Rework after the surface is locked, since what is sellable depends on what the cards become.
4. **Card migration:** which existing finding cards survive as diagnoses.
5. **Confirm the exact logged-days lock threshold** for report generation.

## 11. What stays (do not rebuild)

- The Level 1 / Level 2 hybrid coaching engine (brain builds packet, AI voices, deterministic fallback).
- The cross-signal correlation rules already in the engine (sleep to intake, sodium to scale, weekend spikes, burn to overeating, recovery load-drag / tracks-sleep / sustained-low). These are the SEED of the diagnostic feed; they were underused only because the scorecard ranking buried them.
- The home card stays a quick poke; EvR's headline is the deeper read.
