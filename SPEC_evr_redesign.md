# SPEC: Effort vs Results Redesign

## RESUME HERE (handoff 2026-06-16)

Fresh session picking this up: read project_j_roadmap.md first (per CLAUDE.md), then this whole file, then this block. Track 2 is IN PROGRESS. The ENGINE half of track 2 is built, verified on Justin's real data, and committed. The remaining work is the STYLED SURFACE plus polish. Do not rebuild the engine half.

### DONE + COMMITTED in track 2 (do NOT redo)
- **Engine diagnostic-card model** (commit 8ea3464, utils/diagnosticReport.ts): every finding + correlation collapses into one `DiagnosticCard` { id, claim, proof, lever, window, strength 0-100, tone, positive, insight? }. Built by `buildDiagnosticCards()`, attached as `report.cards`. Ranked strength desc, corrective above positive on ties, capped at 6. Positives count as diagnoses (good findings emit "why it's working" cards) so the feed is never a hollow "you're good." Consistency reweighted to a low band (never leads); a corrective gaps card surfaces when logging is poor.
- **Three pre-existing data bugs fixed** in generateDiagnosticReport (same commit): calTarget was read from pj_settings (wrong bucket, always 0); goalDirection treated weightGoal as a number when it is a bucket string; protein target used a bodyweight estimate. EvR now pulls calTarget / goalDirection / proteinGoalG from the SAME canonical sources every other coach uses (utils/calorieTarget loadCalorieTargets + the macro calc mirroring buildEngineContext). Verified on device: protein now shows the real 164g goal, the weight/deficit card now appears.
- **AI voicing layer** (commit PENDING below, utils/coachAI.ts): `voiceDiagnosticCards(cards, mode)` voices the WHOLE ranked feed in ONE batched API call (Sonnet 4.6, 1100 tokens, 20s timeout via the new maxTokens+timeoutMs params on callWithTimeout). Rewrites claim + lever and adds one `insight` sentence; proof is NEVER sent for editing (numeric integrity guaranteed). Deterministic fallback returns cards unchanged on no-key / timeout / parse fail. FEED_VOICE_RULEBOOK tuned over several device iterations: concrete-not-riddle, tight (claim one line / insight one sentence / lever one sentence), suggestions point not push (no ultimatums) but also not hedgy/eggshells (no stacked soft qualifiers, that is Mindful's job only), and never output the word "lever"/"levers". `getLastVoiceDebug()` is a removable diagnostic.
- **Dev tool "Dump EvR Cards"** (settings.tsx): generates the feed on real data, voices it, shows ranked claim/proof/insight/lever as plain text with an (AI voiced)/(fallback: reason) header. This is the verify-before-pixels harness; keep it until the surface ships, then can remove.

### EXACTLY WHAT TO DO NEXT (track 2, step 2: the styled surface)
1. **Rebuild app/diagnostic-report-view.tsx** to render: the EvR-styled headline diagnosis (keep the existing computeCoachPacketEvr headline, it is already deduped from home) + the ranked voiced card feed from report.cards. Each card renders claim (headline) + proof (the number, prominent) + insight (context line) + lever (the action, but NEVER label it "lever" in UI). Drop the old fixed finding-card components (Consistency/Deficit/BurnAccuracy/Macros/Sleep) and the scorecard role. Suppress the one feed card whose topic matches the headline so the feed does not echo the lead.
   - **[DONE 2026-06-16, verified via dump] PORT THE RECOVERY RULES (found missing 2026-06-16).** DONE: added exported computeEvrRecoveryFindings() + dumpEvrRecoveryDebug() in smartTipsEngine.ts (reuses the exact computeRecLoadDrag/TracksSleep/SustainedLow math + REC constants, own fixed 14d window), imported into diagnosticReport.ts, and buildDiagnosticCards now emits a card per fired finding (claim+proof+lever, strength first-pass, window "Last 14 days", tone attention/factor, positive:false). Verified on real data: footer shows rules evaluate (12/10 recovery days) and correctly fire nothing (mean 77 > 70 floor, no load/sleep delta pattern) -- a pass. ORIGINAL NOTE for context: buildDiagnosticCards in utils/diagnosticReport.ts contained ZERO recovery references (grep-confirmed). The rec_load_drag / rec_tracks_sleep / rec_sustained_low rules shipped 2026-06-15 into the OLD EvR coach pool (smartTipsEngine) only; the new card engine was built from scratch and never incorporated them, so the card feed emits no recovery card regardless of data. Section 11 ("What stays") lists these as SEED correlations, so this is an unfinished port. Add all three to buildDiagnosticCards as proper DiagnosticCards (claim + proof + lever + strength/severity + per-pattern window + Mindful copy). Reuse the hub coach's compute helpers (computeRecLoadDrag/TracksSleep/SustainedLow) for the math. Without this, recovery findings vanish from EvR the moment the surface switches to the feed.
2. **Cache the voiced output per report** so voicing is ONE call, not every open. Voice lazily on first view (show deterministic instantly, upgrade when the call returns) OR at generation; store voiced cards onto the saved report (pj_diagnostic_reports). Old saved reports lack cards/voiced text, handle gracefully (regenerate or render deterministic).
3. **Mindful pass** on the new cards (Section 8): the voicer already softens in Mindful mode; also decide card suppression for Mindful (corrective levers soften/suppress per applyMindfulSuppression philosophy).
4. **Drop the 14/30/90 window selector** (Section 5/9): reshape app/diagnostic-report.tsx entry flow to per-pattern windows. Do this AFTER the surface renders, as its own step. Each card already states its own window in its proof.
5. **Tooltip + tutorial sync** (effort_vs_results entry in tooltipRegistry.ts + the EvR tutorial in data/tutorials.ts + the TUTORIAL_DEMO_REPORT in diagnostic-report-view.tsx) and **5-theme + Mindful audit**, then commit.

### STILL OPEN / DECISIONS
- Ranking weight tuning (strength curves are first-pass; tune against more real output).
- Free/Pro rework PARKED (Section 10 item 3) until the surface is locked.
- Confirm the logged-days lock threshold stays 7 (Justin confirmed 7).
- NOTE the AI voicing requires EXPO_PUBLIC_ANTHROPIC_API_KEY in the build; the home coach uses the same key.

Status: track 2 ENGINE + VOICING done and verified on device. STYLED SURFACE not started. This supersedes the old scorecard EvR; the Level 1/Level 2 coaching engine stays.

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

## 7. App-wide ranking scope (LOCKED 2026-06-16: APP-WIDE)

There is ONE shared ranking function (`selectByPrioritySpine` in utils/smartTipsEngine.ts) and every coaching surface runs through it: home card, day summary, weekly, monthly, EvR. So the weight monopoly is one root cause feeding every surface.

Recommendation: make the relevance + anti-repeat ranking the shared behavior, so all surfaces benefit at once. It is one place to change (same work as fixing only EvR) and it is safe for summaries because weight is already a dedicated scorecard card there, separate from the coach tip; only the coaching headline rotates, the weight data is never hidden.

LOCKED 2026-06-16: APP-WIDE. Justin committed. BUILD ORDER (agreed): build and prove the relevance/severity ranking inside the EvR card engine FIRST (the card feed gives clean per-card proof data to tune severity against), THEN promote the same ranking onto the shared spine (selectByPrioritySpine) that drives home + day/weekly/monthly. Do NOT flip the live single-slot surfaces blind on day one. When promoting, dig surface-by-surface to confirm the rotation behaves correctly on each (home, day, weekly, monthly) and does not strip a surface of something it genuinely needs; weight stays a dedicated scorecard tile in summaries so weight DATA is never hidden, only the coaching headline rotates.

## 8. Mindful behavior

EvR in Mindful: observations, not verdicts. Diagnostic facts still show (factual), but framed as patterns to notice, not corrections to make. Corrective levers soften or suppress per the existing `applyMindfulSuppression` pattern; positives and neutral observations remain. The ranking should not feel like a scolding priority list in Mindful. Define each new card's Mindful copy at build time (per the standing mode-awareness rule).

## 9. What changes from the current report

- The category scorecard role LEAVES EvR (it belongs to the summaries). EvR stops being a data readout.
- Current finding cards (Consistency, Deficit, Burn Accuracy, Macros, Sleep) get re-cast as diagnostic cards (claim + proof + lever) or folded into the correlation set. Decide card-by-card at build which survive as diagnoses vs which were really just scorecard rows.
- The 14/30/90 window selector is removed in favor of per-pattern windows.
- The single-winner headline is replaced by an EvR-styled diagnostic headline + a ranked card feed.

## 10. Open decisions (carry into build)

1. **App-wide vs EvR-only ranking** (Section 7): LOCKED 2026-06-16 APP-WIDE. Build in EvR first, then promote to the shared spine for home + summaries. Per-surface dig at promotion time.
2. **Exact ranking weights / tuning:** DECISION 2026-06-16 -- NOT pre-settled; tuned LIVE during the EvR build against the "Dump EvR Cards" output on real data. Pre-deciding weights in the abstract is guesswork. Guiding principle locked under item 4 (result-explaining positives outrank metric-high back-pats).
3. **Free vs Pro:** PARKED. Rework after the surface is locked, since what is sellable depends on what the cards become.
4. **Card migration:** LOCKED 2026-06-16. The new engine already recast deficit / burn accuracy / protein / fiber / consistency / sleep into claim+proof+lever cards, so this is judgment calls, not demolition. Rules: (a) CONSISTENCY -- keep consistency_gaps as a real lever; consistency_good drops to LOWEST strength so it only ever appears when nothing else does, never takes a real slot. (b) BURN ACCURACY -- gate it to fire ONLY alongside a deficit-vs-results mismatch (never a standalone readout). (c) POSITIVES -- capped at 3 in the feed (one-line constant, bump to 4 if it feels thin), ranked by the same unified 0-100 strength scale as correctives. PRINCIPLE: positives that EXPLAIN A RESULT ("your deficit is working, the scale confirms it"; "sleep is carrying everything") are weighted ABOVE positives that just note a metric is high ("water high", "steps high", "active high") -- the latter are back-pats and sit at the bottom / cap out first. (d) RECOVERY -- port rec_load_drag/tracks_sleep/sustained_low into the engine (see step-2 build note above); they are diagnoses, not back-pats.
5. **Confirm the exact logged-days lock threshold** for report generation.

## 11. What stays (do not rebuild)

- The Level 1 / Level 2 hybrid coaching engine (brain builds packet, AI voices, deterministic fallback).
- The cross-signal correlation rules already in the engine (sleep to intake, sodium to scale, weekend spikes, burn to overeating, recovery load-drag / tracks-sleep / sustained-low). These are the SEED of the diagnostic feed; they were underused only because the scorecard ranking buried them.
- The home card stays a quick poke; EvR's headline is the deeper read.
