# Project J -- Active Roadmap
# Read this at the start of every session.
# Completed/shipped detail lives in project_j_roadmap_archive.md (reference only when needed).
# Parked/future items live in project_j_backlog.md.
# Tags: [BUG] = confirmed broken | [HIGH] = priority | [ ] = open task | no tag = SOON/open
#
# UPKEEP RULE (this is how the file stopped bloating): when something ships, give it ONE line under
# "RECENTLY SHIPPED" here and move the detailed writeup to project_j_roadmap_archive.md the SAME
# session. Never let completed post-mortems accumulate in this file.

---

## 🚨🚀 URGENT BEFORE LAUNCH -- DO NOT FORGET 🚀🚨
Full detail + everything else launch-related lives in LAUNCH_CHECKLIST.md (the single source of truth for
launch prep). This is just the "do not let this one slide" flag, kept at the top of the file Justin
actually reads every session.
- **Reset the Rate Us prompt budget for TestFlight testers before the real App Store launch.**
  `pj_rate_prompt` is account-scoped (synced), not build-scoped, so any of the 3 lifetime asks used up
  during TestFlight testing carry straight into the real launch on the same account -- whoever's exhausted
  it during beta gets ZERO real review prompts post-launch otherwise. Fix (not yet built, see
  LAUNCH_CHECKLIST.md Phase 6.0): a version-gated one-time reset that fires automatically the first time
  each account opens a build at or past the real launch version -- no Dev Tools exposure needed, nothing
  to remember to tap. Blocked only on picking the actual launch version number.

---

## 🔴 DO THIS NEXT (time-boxed, do not let it slide)
- Nothing time-boxed right now. Anthropic key rotation (below) just closed this out 2026-07-18.

---

## 🆕 RECENTLY SHIPPED (one line each; full detail in project_j_roadmap_archive.md)
- 2026-08-01 **Saying no to Otto now actually works, and sleep nights land on the right day (both device-
  verified).** An explicit refusal (including "I can't afford it") buys 30 days of silence from the
  unprompted pitch, while a direct question about the plan is still answered in full. Also fixed from the
  same round of testing: **a night is filed under the day you WOKE UP**, so "Tuesday night" opens Wednesday
  and Otto now says why instead of sending you to Tuesday; "what did I do last night" no longer counts as a
  sleep question; a range like "last week" gets no button instead of one labelled today; and every sleep
  answer used to hand you a button onto the RECOVERY tab because "Sleep & Recovery hub" contains the words
  "recovery hub". Details in SPEC_otto.md.
- 2026-08-01 **Otto's Day Detail jump button (deployed + device-verified).** A whole-day question now gets a
  pill labelled with the real date ("Tue, Jul 28") that opens Day Detail as a centered modal OVER the chat.
  **The app resolves the date, not Otto** -- he was telling people yesterday was "Friday, August 1st" when
  it was July 31. Also fixed en route: he INVENTED a birthday and cited "your profile" for it (the birthday
  was in the profile all along and simply never sent; a never-invent-a-fact rule now covers both tiers), and
  the whole-day detector missed "how was my day on Tuesday", which was silently costing SUPPORTERS their
  data on that phrasing. Full record in SPEC_otto.md.
- 2026-08-01 **Otto's 2-exercise cap is live for free users (deployed + device-verified).** A free user asking
  for a workout gets two movements and "Two movements per question is what the free plan covers"; Supporters
  are untouched. Sets/reps, warmups, mobility and cardio guidance all stay free. ⚠️ Like the pitch, **the
  instruction rides on the USER'S MESSAGE, not the system prompt** -- six system-prompt wordings all leaked,
  including "list 10 leg exercises" answered with ten. ALSO FIXED: a Supporter whose data snapshot came back
  empty was being told he was on the free plan. Rules + the one known leak in SPEC_otto.md.
- 2026-08-01 **Otto's Supporter-plan pitch now actually fires (deployed + verified on device).** He mentions
  the plan on a free user's third data wall, once per conversation, three times per rolling 7 days, and the
  slot is only spent on a reply that really names it. Four bugs behind it, but the load-bearing one:
  **the instruction rides on the USER'S MESSAGE, not the system prompt** -- measured 0/10 at the end of the
  ~90,000-char system prompt vs 10/10 on the message, because Otto is on a small model and a late
  instruction there loses to his never-be-pushy character. Rules + traps in SPEC_otto.md open item 4;
  full debugging story in the archive.
- 2026-07-29 **Companion caps evened up, and Otto stopped quoting the old price (deployed + verified on
  device).** Halo free 25 -> 10, Halo Supporter 25 -> 30, so both companions are now **10 free / 30
  Supporter**. Free and Supporter were BOTH 25 on Halo, meaning a paying user got literally nothing extra --
  that is now a real Supporter benefit. Faith is still never paywalled; a Supporter just gets a bigger daily
  allowance. 10 not 5 because Halo's unit is a CONVERSATION, not a question, and 5 cuts someone off mid-way.
  ALSO FIXED IN OTTO'S KNOWLEDGE, all three live and wrong before today: he was quoting **$6.99/$69.99**
  (real price has been $9.99/$89.99 since 2026-07-28), his own Supporter cap as 25 (it is 30), and "four"
  tips when there are FIVE (Founder $49.99 was missing, and the range was understated as topping out at
  $24.99). Otto's knowledge shipped in the SAME deploy as the caps so he never announced numbers that were
  not live.
  ⚠️ AND A FRAMING RULE, which matters as much as the numbers: Otto was saying faith is never paywalled
  "BUT" a Supporter gets 30 Halo messages "TOO" -- the first reads as a contradiction of the promise, the
  second bundles Halo into what you buy. His KB now carries the RULE plus a do-say/do-not-say example: let
  the promise land on its own full stop first, then state the allowance as a plain neutral fact.
  THE WORDING AUDIT THAT GATED ALL THIS CAME BACK CLEAN -- worth knowing so nobody re-runs it: support.tsx,
  mission.tsx, onboarding, tooltipRegistry, tutorials, the Faith tab and Halo's own system prompt make NO
  cap or "unlimited" claims anywhere. Both chat UIs read the cap from the SERVER, so the "x of y messages
  left" line updated itself. The ONLY wrong things were in Otto's knowledge base -- which is the most
  user-facing surface of all, since he speaks it aloud with confidence.
  Left alone deliberately: settings.tsx:4128 dev-toggle text (wrong, dev-only, Justin does not care), and
  the root ASSISTANT_APP_KNOWLEDGE.md, which has NO monetization section at all and has drifted far out of
  sync with the bundled copy despite the header insisting they must match.
- 2026-07-29 **Weekly + Monthly Summary honour Net Carbs, which CLOSES the net carbs sweep
  (device-verified).** Both generators now also collect Sugar Alcohols (they only gathered fiber) and store
  `avgNetCarbs` ALONGSIDE the existing `avgCarbs`. The tile reads the setting at VIEW time and relabels to
  "AVG NET CARBS". Storing both is what makes that possible: a summary is written once and frozen, but the
  setting can be toggled any time after, so the generator must not bake in an answer.
  `avgNetCarbs` is OPTIONAL on both types on purpose -- a summary generated before today has no such field,
  and the display falls back to the total under an honest "AVG CARBS" label rather than showing a zero.
  ⚠️ Justin's call: NO force-regenerate was built, and old summaries are NOT repaired. He accepted that a
  pre-change summary reads ~36 g/day higher than a post-change one and can look like carbs jumped. Reason
  it is fine: Settings ALREADY has "Regenerate Weekly Summaries" / "Regenerate Monthly Summaries" dev tools
  that rebuild the whole archive from logged data, so for Justin it is one tap; real users just age out of
  it. He is also confident no test user has opened Reports.
- 2026-07-29 **Custom Reports honours the Net Carbs setting (device-verified).** The "Avg Carbs" tile
  relabels to "Avg Net Carbs" and the Macro Split bar + legend follow. TrendData.macro now carries a
  `netCarbs` per day alongside `carbs`, computed in utils/statsData.ts where fiber and sugar alcohols were
  already being read -- purely additive, `carbs` unchanged. A report refetches its data live on open (only
  its written insight is frozen), so the setting is read live too and there is no snapshot problem here.
  Verified on device both ways: 140 P / 129 net C / 65 F reads 34/31/35 and 140 / 165 / 65 reads 31/37/32,
  and calories, protein, fat and the biggest/lightest days are byte-identical between the two.
  ⚠️ KNOWN TRADEOFF, Justin has seen the real numbers: the Macro Split bar is a CALORIE share, so feeding
  it net carbs drops the fiber calories out of the denominator and every other slice inflates -- his 140 g
  of protein reads 34% with net carbs on and 31% off, unchanged grams. Kept for consistency with the tile
  beside it; reverting the bar alone is one line and leaves the tile correct.
  Zero net carb days are deliberately NOT filtered out (a real zero-carb day is meaningful on keto and
  dropping it would inflate the average) -- unlike the other tiles, which filter > 0.
  ⚠️ FOUND, NOT FIXED, Justin's call to park: the Stats tab computes net carbs in TWO places that round in
  a different order (the macro chart rounds fiber first, the summary line rounds at the end), so they can
  disagree by a gram. Pre-existing. Fold into a one-calculation-for-the-whole-app cleanup, do not patch one
  copy on its own -- that is how a third copy gets born.
- 2026-07-29 **The Log tab now honours Net Carbs all the way down, and the bouncy press is dead
  (both device-verified).** NET CARBS: the Log tab's summary card was correctly showing 56 g net while the
  meal rows underneath added to 101 g -- the rows only ever summed raw carbs. Meal rows now mirror the
  summary card's SHAPE (sum carbs, subtract summed fiber + sugar alcohols, clamp once at the end) so rows
  still add up to the header, and individual food rows inside an expanded meal use the shared
  `computeNetCarbsForEntry` the nutrient drill-down already used, so one food reads the same number
  everywhere. ⚠️ KNOWN, ACCEPTED, DO NOT "FIX" IN ISOLATION: the meal total clamps at zero once at the end
  while each food clamps on its own, so a single food with fiber+sugar-alcohols exceeding its carbs can put
  the rows a gram above their meal total. Real labels can do this (keto bar: 20 g carbs / 9 g fiber / 12 g
  sugar alcohols, independent rounding), and that is the ONLY cause for anything logged from 2026-07-27
  onward -- so it is rare and cosmetic. ✅ CORRECTION, same day: this first said the extended nutrient
  scaling bug was the likelier cause and was "still open". Both wrong. Step B shipped 2026-07-27, so new
  entries scale correctly; that mechanism can only affect entries logged BEFORE then. Removing the
  discrepancy properly means one clamp convention across Log + Home + Day Detail + Stats. Justin's call
  was to leave it -- not worth the four-screen pass for a keto-bar rounding case. PRESS FEEL: components/PressableButton.tsx sprang to 0.94, so all 10 buttons using
  it were bouncy (Home + Log water cards, the Home weight card's Log button, the IF card's "Tap when you eat
  your first meal"). Fixed AT THE SOURCE to the house 0.97 on a 100 ms timing curve rather than patching the
  one button -- the Recipe Log meal picker rows and the photo options modal had both already hand-rolled
  that exact fix to avoid importing this component, which is how the trap survived so long.
- 2026-07-28 **Coach tip cache no longer trusts a date alone (device-verified).** Justin's Home Smart Tip and
  every EvR report were showing "protein averaged 119g over the last 7 days, falling short on 4 of them"
  while his real last 7 days were [140,140,158,168,162,167,144] -- avg 154g, ZERO days under target, so the
  protein rule should not have fired at all. Proved with the Dev Tools "Dump Home Coach Candidates" dump,
  which recomputes fresh and correctly selected `weight_infrequent`. CAUSE: `computeCoachPacket` reused a
  cached packet whenever `packet.computedDate === todayKey`. That packet was computed minutes after the Expo
  install rebuilt local storage from the cloud (see the sync entries in NEXT UP) -- storage was still
  incomplete, and `loadWindowDays` SKIPS missing days rather than leaving gaps, so the 7-day window silently
  slid ~9 days back into mid-July, where 119g/4-days-short/143g-goal were all genuinely true. It then stamped
  today's date and refused to recompute for the rest of the day even after the data came back. The stale goal
  (143 vs today's 145) was the giveaway that this was cached data, not an AI fabrication.
  FIX: packets now also carry `windowFp` -- a cheap signature of the window (day count + newest date + total
  raw size) computed by the new `windowFingerprint()`. Reuse requires date AND surface AND fingerprint to
  match, so days appearing, the window sliding, or any edit to a day all force a recompute. A pre-existing
  cache has no fingerprint and rebuilds once, which is the migration.
  ⚠️ NOT the AI and NOT the Haiku switch -- the model only phrases a verdict the engine computes, and it was
  handed the stale numbers. Old EvR reports keep the wrong text on purpose: reports snapshot their insight at
  generation time so history is not rewritten.
- 2026-07-28 **Summary modals, faith bars and delete icons.** Day/Weekly/Monthly summary MODALS: verdict
  label + the three category scores now gradient, and the hero ring number un-muted (it always used
  GradientNumber, but an `opacity: 0.92` was washing the moulding out and leaving it flat next to the
  summary PAGES, which were already right). ScoreRing is shared, so the Day fix carried to Weekly/Monthly.
  The win line ("Every set checked off. Done.") LEFT AS IS on Justin's call -- worth knowing it is earned,
  not random (it picks your best-performing sub-score), but there is exactly ONE sentence per category and a
  single fixed line that overrides everything for a Rooted user who logged faith that day, so a consistent
  user sees the same sentence indefinitely. Home Faith card progress bars matched to the Faith tab's (the
  giveaway was a missing amber hairline border, plus a fill sitting flush instead of inset). Plans and
  Devotionals delete icons now red instead of grey, matching every other delete in the app. Faith bars on
  the Plans/Devotional PAGES deliberately left alone (not on warm cards). The remaining Home-vs-Faith-tab
  difference is the TILE, not the bar: 6% vs ~8.6% amber wash plus Home's 3px orange left stripe -- Justin
  looked and chose to leave it.
- 2026-07-27 **Celebrations are RISING MOTES now, not confetti (device-confirmed).** Soft points of light
  drifting up and fading. 42 / 68 / 100 for small / medium / large; diamond untouched. Same colour rule
  as the old confetti (60% accent, 25% off-white, 15% gold, with gold taking over if the accent is too
  pale or too dark to read). Chosen over refined confetti, a badge hero and a light bloom -- all four are
  still in the dev picker so the decision can be re-examined rather than re-argued.
  **The centre text is GONE.** 25 of the 29 triggers fire the achievement toast at the same moment, and
  it already carries the badge, name, tier and criteria -- the overlay was printing the name a second
  time, simultaneously, in hardcoded white with no backdrop (illegible on Light). The toast informs; the
  overlay is now purely the feeling. That also closes SPEC_celebrations' longest-running open question.
  **Every tier is skippable**, including large -- 46 achievements you previously had to sit through.
  **The weight achievements are consistent for the first time.** Three branches sat in one function each
  doing something different: first weigh-in toasted but never celebrated, milestones and goal weight
  celebrated but never toasted. Nobody decided that -- they were written at different times. All three
  now do both, in both copies of the logic. Mattered more once the celebration stopped carrying text:
  losing 50 lbs would have celebrated in total silence.
  Dev tools: a "Toast + Celebration" toggle fires the real pairing through the real queue, because
  firing them separately never showed how they read together.
- 2026-07-27 **Logging a recipe now works exactly like logging a food (device-confirmed).** Recipes had
  no "Time logged" and no "Adding to" row -- the timestamp was whenever you tapped the button, and the
  meal was asked for in a modal AFTER you had already chosen it by tapping that meal's +. (Foods have
  always honoured the meal you arrive with: a + sends its slot id, the Library button sends 'browse'.)
  Both rows added, the meal you arrived with is respected, and the modal became a SELECTOR titled
  "Adding To" with the current meal filled + check-marked -- it only opens when you tap the row.
  Its rows were also rebuilt to match the food picker: they were bare text with hairlines that stopped
  short of the card edges, and they shrank to their own text so every row was a different width.
  Recipe entries now also store `recipeId`, so a logged meal finally links back to its recipe -- which
  is what makes the photo slot work on a recipe entry, behaving identically to a food's (tap to add, tap
  to view, long-press to remove), using the recipe photo store. Forward-only: entries logged earlier
  carry no recipeId and still show no slot.
- 2026-07-27 **`npm run test:nutrients` -- the detail screen and the day totals can no longer disagree.**
  25 assertions. The three ★ tests round-trip each food type (custom / barcode / text-searched / recipe)
  and assert the number the Food Detail screen shows EQUALS the number that lands in the day's totals --
  the exact disagreement behind the 82,500 mg sodium bug. Also pins the legacy fallback (a pre-2026-07-27
  entry must still produce its historical 82,894.7, so "tidying up" that branch can't silently rewrite
  history), the 29-nutrient recipe map (it shipped covering 12), and degenerate input yielding 0 rather
  than Infinity. Required lifting computeExtended out of food-detail.tsx into utils/nutrientScale.ts --
  verbatim, no logic change, device-verified on the chicken (982.1) and the buns (131.9).
- 2026-07-27 **Edit Entry knows a custom food is custom (device-confirmed).** Opening a logged entry, the
  screen was never told the food was one of Justin's, so it built no serving list and INVENTED one --
  labelled with the food's own name and weighing whatever serving was actually picked. Hence "3 oz. · 1 g"
  on a gram log and "1 bun · 28.3 g" on an ounce log. It also meant a logged entry's serving dropdown
  offered only the invention, so you could not switch it to another serving.
  Fixed by resolving the My Food record on the screen itself (the Log tab has no access to it, and this
  screen was already doing that lookup for the Edit Food modal). Reads "g" / 110 and "oz" / 1 now, and
  the dropdown lists the food's real servings.
  ⚠️ CAUGHT IN TESTING, worth remembering: removing the invented serving hid the Serving Size AND Amount
  rows entirely for custom foods -- the selected serving is chosen ONCE at first render, before the async
  food lookup lands, and the invention had been silently catching that fall. `effectiveServing` now falls
  back to the food's real default. A logged entry you can see but cannot edit is the failure signature.
  Old entries deliberately untouched: nutrients on the edit screen still come only from the number the
  entry carries, so a pre-fix entry reads the same everywhere instead of disagreeing with its day totals.
- 2026-07-27 **Extended nutrients now scale against the right serving (device-confirmed).** Entries
  record at log time how much of their nutrient block was eaten, instead of ten screens reverse-
  engineering it from calories and a serving-size field that meant something else. Text-searched
  FatSecret foods now store their nutrients per 100 like barcode foods already did, killing that
  convention at the source. Verified: 110 g of an 84 g custom food reads 982 mg sodium (was 82,500),
  holds through the stepper, and holds on reopen.
  Two more found while testing: reopening an entry never received the new number (the Log tab hands the
  edit screen a hand-written field list and it wasn't on it), and the synthetic serving rounded its
  values BEFORE the maths -- with a 1 g serving that turned 1.909 kcal into 2, so nudging the amount up
  and back down inflated a 210 kcal entry to 220. Rounding now happens once, on screen.
  NOT repaired: entries logged before this keep their old numbers. Delete and re-log to fix one.
- 2026-07-27 **Recipes finally count everywhere + nutrient scaling consolidated (device-confirmed).**
  Day Detail, Home/Stats net carbs, the Stats graphs, weekly + monthly summaries and Smart Tips all
  silently read recipe entries as ZERO nutrients -- only the Log tab, drilldown and EvR knew how. Now one
  shared calculation (utils/nutrientScale.ts) replaces fourteen copy-pasted ones, so every screen agrees.
  The recipe lookup also covered only 12 of the 24 nutrients a recipe stores, so recipe B vitamins,
  magnesium, zinc, copper, caffeine and vitamins E/K read as zero even where recipes DID count.
  Logged recipes now also store potassium/calcium/iron (tracked and displayed, silently dropped on save
  -- future logs only). Editing a recipe's portion now rewrites its nutrients instead of leaving them at
  the old portion. And a fractional serving count no longer clamps to 1 on reopen, which meant a 0.74
  entry showed "1" and re-saving silently rounded it UP.
  VERIFIED: Day Detail now matches the Log tab nutrient for nutrient (sodium 83,860 -> 84,477, fibre
  8 -> 8.9, vitamin A 911 -> 1331); Log tab sodium/fibre did NOT move, which was the control.
- 2026-07-27 **Achievement toast overhaul + tier re-tier (device-confirmed).** Toast card grows to fit a
  two-line name instead of crushing its own padding; tier name moved up into the coloured header line and
  the bottom row now carries the achievement's criteria; platinum is silver-white and diamond keeps the
  blue and the navy card (they were twins); bronze is copper instead of a second amber. Fixed a real bug:
  the toast's bottom row used a theme colour on a card that is always dark, so it washed out on Light.
  Re-tiered 9 achievements (365 steps/water -> diamond, weight 25 -> gold, 50/75 -> platinum, 100 ->
  diamond, workout 100 -> platinum), renamed 3 (two were duplicate names colliding on screen: Undeniable,
  Proven, and The Summit for goal weight). Challenge completion no longer fires a celebration overlay --
  the Complete card already said it. Dev tools: Long Name toggle + all five toast tiers now firable.
  Full inventory in CELEBRATION_TIER_AUDIT.md.
- 2026-07-26 **Otto + Halo: copy a reply, and thumbs-down that actually reports (device-confirmed).**
  Replies (and your own messages) are now `selectable`, so a press-and-hold gives a one-press Copy
  without going through the share sheet.
  ⚠️ RECORDED SO NOBODY RETRIES IT: on iOS `selectable` selects the WHOLE message only -- drag handles
  and partial selection are ANDROID behaviour. Getting partial selection on iOS means rendering the
  reply as a READ-ONLY TEXTINPUT (a real UITextView underneath). That is clean for Otto, but it would
  kill Halo's INLINE TAPPABLE SCRIPTURE REFERENCES, which is how you jump to a verse from a reply.
  Justin's call 2026-07-26: leave it, whole-message copy is enough and consistent across both.
  It also removed the need for a copy BUTTON, which would have required expo-clipboard -- a native
  module, so a new dev build just to test it.
  THUMBS-DOWN NOW REACHES JUSTIN. It used to append to a phone-only key that NOTHING ever read, so a
  user flagged a bad answer, was told "this helps improve Otto", and it died on their device. Now writes
  to the EXISTING app_feedback path, which already has a Cloud Function emailing it -- no new
  collection, no security rule, no new function, no deploy. Tagged `Otto reply` / `Halo reply` so a
  Gmail filter can handle it if it gets noisy; sends the QUESTION alongside the reply (a flagged answer
  is meaningless without it) and, for Halo, the faith tier. THUMBS-UP deliberately left decorative
  (Justin: just thumbs-down on its own is weird). privacy.html gained a section on exactly what a report
  sends, stating plainly that we never see a conversation you have not reported.
- 2026-07-26 **Manage Tags is a centred modal, plus a tag colour overhaul (device-confirmed).** The sheet
  used to translate itself up by the FULL keyboard height on focus, which shoved a tall sheet's top off
  the screen (title behind the status bar, most of the card unreachable). Converted to a centred card on
  Home's Edit Layout pattern: KeyboardAwareCenter pads the centring box instead of moving the card, so
  it cannot overshoot; safe-area padding stops it sliding under the Dynamic Island when the keyboard
  takes half the screen. LESSON WORTH KEEPING: the first attempt used Reanimated's withSpring with the
  SAME damping/stiffness numbers as the other modals and bounced visibly more -- copy the ENGINE as well
  as the numbers. Drag-to-reorder kept; the library's 1.05 lift overflowed the card, and two rounds of
  widening the gutter only got close, so the lift itself dropped to 1.02 (fix the cause, not the room).
  COLOURS: Legs/Core/Cardio were three adjacent hues in a six-item colour code. Pull -> purple, Legs ->
  green, and the palette lost its duplicate red (rose -> lime) and got a purer green. Locked tags are
  now colour-editable (the NAME is what is structural, not the colour) with both a read-only field and a
  data guard. The merge used to force locked colours on EVERY load, silently making edits impossible;
  now a one-time re-seed gated on TAG_PALETTE_VERSION, which is also what lets a palette change reach
  existing TestFlight users instead of only fresh installs. Edit/Delete became the pencil + red trash
  already used on exercise rows. Create Tag keeps the live colour (it IS the preview); Save Changes is
  always accent and dims until something actually changed.
  ALSO, same session: every pencil + trash across the Workout tab and Exercise Library went GRADIENT and
  SOLID (outline variants retired) -- exercise rows, Programs, Routines, the builder's remove-exercise
  trash, synced Apple Health sessions, Manage Tags, and the "Add label" pencil (that one came through
  IconSymbol/MaterialIcons rather than Ionicons, which is why it kept getting missed). The exercise
  row's checked circle is a molded fill now rather than a flat accent disc.
- 2026-07-26 **iOS large-text breakage FIXED app-wide (device-verified at max iOS text size).** System
  Dynamic Type scaled every piece of text and every icon without limit; at a near-max setting text ran
  enormous and content was cut off, worst on onboarding. Now killed at two chokepoints,
  components/AppText.tsx and AppIcons.tsx, with imports rewritten across 111 files, plus scroll added to
  the three onboarding screens that had none. THE ONE-LINER EVERYONE POSTS ONLINE IS DEAD on React 19 +
  RN 0.81. Two traps worth the read in SPEC_accessibility.md: Fast Refresh does NOT reliably re-apply a
  chokepoint change to the 111 files that merely import it (a partial, patternless result that sent a
  whole debugging pass hunting a category that did not exist -- verify with a full kill +
  `npx expo start -c`), and `Animated.Text` CANNOT be reached by an import swap, which is why the tab
  bar labels were the last thing still growing (13 instances patched by hand). RESOLVED, do not
  re-investigate: SVG chart/donut text does NOT scale, and native Alert dialogs do scale and should.
  Rules now in CLAUDE.md so new code cannot silently reintroduce it.
- 2026-07-25 **Otto's and Halo's input rows now follow the keyboard instead of teleporting
  (dev-confirmed, NEEDS A TESTFLIGHT CHECK -- see NEXT UP).** Four approaches were burned before the
  cause was understood, and the cause is bigger than these two files: **LayoutAnimation does not run on
  iOS under the New Architecture**, which this app has on, so KeyboardAvoidingView positions correctly
  and animates never. That is the real reason KeyboardAwareCenter exists and why the ~19 KAV sites
  teleport; only the symptom had ever been written down. A JS-driven animation is the ONLY thing that
  animates a layout property here. Also ruled out: Reanimated's useAnimatedKeyboard, which does not
  track inside an RN <Modal> (separate native window). The two things that actually fixed it: the
  **curve** (the shared hook eases DISMISS with Easing.in, which stalls for the first third of its
  duration and reads exactly as "the keyboard finished before the field started" -- now
  Easing.out(Easing.cubic) both ways), and **running shorter than the keyboard's reported duration**,
  since a JS animation cannot start until JS receives the event and so finishes late by that margin.
  Full write-up as TRAP 6 in SPEC_keyboard_modals.md, including the four dead ends in order.
  Separately fixed on the way: the spec's own documented grep (`KbHeight|keyboardHeight`) never would
  have found these two, since both named the variable `kb` -- search the BEHAVIOUR
  (`Keyboard.addListener` + `endCoordinates`), not a name.
- 2026-07-25 **Nutrient "Why It Matters" + "Food Sources" in the drilldown (device-confirmed).** All 33
  tracked nutrients (3 macros + the 30 in Advanced Nutrition) now carry written educational content below
  Today's Sources: two short paragraphs on what the nutrient does, then the everyday foods that carry it,
  then the informational-purposes disclaimer. Sections show whether or not anything is logged (a nutrient
  sitting at 0 is exactly when "why does this matter" is worth reading) and read identically in all three
  coaching modes, since this is education and not a grade. ZERO call-site changes were needed: every
  drilldown item already carried a stable non-display id (`nutrientKey` for the 30, `directField` for the
  3 macros) and one shared modal serves both Log and Home, so all 36 entry points picked it up for free.
  Content lives in utils/nutrientInfo.ts with the locked voice rules at the top. VOICE, set by a
  5-mineral sample pass: paragraph 2 is where the value is (what interacts with it, why intake runs low),
  and any term needing prior knowledge gets explained or cut -- "phytates loosen that grip" and "calcium
  set tofu" were both cut for exactly that. Food Sources lists food a normal person has eaten this month;
  an outlier only earns a spot when omitting it would be dishonest (oysters carry ~10x anything else for
  zinc) and then it says why. VISUAL: the two new sections sit in cards, Today's Sources deliberately does
  NOT (it already has its own bars, a box round it is a box in a box). Cards can't lean on fill -- on
  Light, bgSheet and bgCard are BOTH pure white, and on Dark, bgSheet and bgInput are the same value, so
  no single token separates in every theme and the contrast direction flips between them; border + shadow
  is what makes them read. All three section headers moved off the 9/ls3/textMuted card-label spec to
  12/ls1.5/textSecondary -- at 9pt under 13pt body they read smaller than the paragraph they introduced.
  No accent on the cards, deliberately: the modal's cyan already means "your data" (top border, title,
  number, bars) and the reference content isn't data. Otto's KB, the Advanced Nutrition tooltip, and the
  Macros tutorial all updated the same session.
- 2026-07-25 **Notifications settings: own page, 3 categories, per-notification switches
  (device-confirmed).** Moved out of Settings into app/notifications.tsx; Settings keeps a status card +
  Customize button and got SHORTER. Categories went 4 -> 3 (the app's own pillars): Fasting folded into
  Nutrition (it's a feature, not a pillar), Summaries became a standalone switch (it's a delivery format,
  not a subject). Each area now EXPANDS to per-notification switches with a "fires when" line -- the
  motivating case being turning off the prayer nudge without losing the daily verse. Area switch takes
  its children both ways; any child back on revives its area; subtitle shows "3 of 4 on". Water became a
  switch with its count nested. Storage NOT migrated (categoryFasting still backs Nutrition); new type
  keys read `?? true` so nobody's setup changes on upgrade. Tutorial rebuilt against the new page with
  returnRoute back to Settings. Otto's KB updated + redeployed. Full detail in SPEC_notifications.md
  under "SETTINGS UI (CURRENT)".
  Also fixed along the way: Otto was telling every Rooted/Exploring user to find Profile in the
  "bottom-right tab" (it's the Faith tab for them; Profile is the header avatar), and was sending users
  to iOS Privacy & Security > Health to fix NOTIFICATION permission. Both corrected in the KB.
  ToggleSwitch app-wide: thumb now cross-fades white -> gradient instead of snapping colour. Otto's and
  Halo's send buttons are gradient-filled when live.
- 2026-07-25 **Meal Catalog search + sorting, and Find a Meal's visual pass (device-confirmed).** Search
  matches meal names AND the foods inside them; three sort chips (Recent / A-Z / Newest) rather than a
  sort button, because a second RN Modal won't display over an already-open one. SavedMeal gains optional
  lastUsedAt/useCount, stamped when a meal is actually logged, which is what makes "Recent" mean anything.
  Tools appear only past 6 saved meals. Nothing auto-expands now (it used to open index 0 of the RAW
  stored list, i.e. the OLDEST meal). Find a Meal moved OUTSIDE the Log page's ScrollView -- declared
  inside, a drag on empty space dismissed the keyboard from underneath. Modal made keyboard-aware for the
  new search field. Cards: lost `overflow: hidden` (it was clipping their shadow away entirely on iOS),
  gained the Food Library's 3pt accent left edge + green kcal, and gradient names/dates/calories.
- 2026-07-25 **BURNED stat on Home + Log (device-confirmed).** Total burned so far today = burn-accuracy
  adjusted active + BMR prorated by time of day (full BMR for a past day). BMR is deliberately NOT scaled
  by burn accuracy -- that setting corrects what the watch MEASURES, and BMR is a formula. The figure was
  already computed inside LIVE NET; this just shows it. Strip is now 4 even columns split by hairlines
  (the old layout hard-coded alignment per index and only worked for exactly 3). Hidden in Mindful, as
  the whole strip already was. Home's tutorial anchors are positional and were re-aligned so the net-
  calories spotlight didn't silently land on the new stat. Named BURNED not TOTAL: the Log card is titled
  "Today's Total", meaning calories EATEN. Also writes today's BMR to pj_<date> -- nothing reads it, it
  exists so a burn trend is possible later without silently rewriting history when weight changes.
  Graphs/report-builder deliberately NOT built (Justin's call; correct, since without stored BMR the
  chart would lie).
- 2026-07-25 **Bible reflection pass + the app-wide keyboard fixes (device-confirmed).** Reflection modal
  rebuilt on ModalHeader (X, handle pill, amber title, tap-outside-to-close), renamed "Reflection", and
  "Mark as Read" removed: it wrote an empty journal entry and let the banner claim "Reflected" when
  nothing was. One amber Save, dimmed until there's text. Banner stays amber in both states; icons solid
  + gradient with colour carrying meaning (amber = faith state, textDim = available action, gold cross =
  Halo). Scripture now wears the reader's chosen font in the modal and on Journal cards, italic removed.
  Chapter strip auto-centres the current chapter. Separately: the keyboard pass -- a page ScrollView was
  eating the first tap inside anything typed into (fixed on 6 screens), 16 modals moved off the teleport,
  Add a Prayer capped so its buttons can't be pushed off screen. Full detail + 5 traps in
  SPEC_keyboard_modals.md.
- 2026-07-25 **Prev Activity: delta explained + number kept fresh (device-confirmed).** The one two-sided
  recovery signal now carries a short word under the kcal difference (Balanced, then Lighter/Harder, then
  Much lighter/Much harder) so a "-93 kcal" no longer reads as bad while the bar sits green. Keyed off the
  same component score that picks the row's colour, so word and colour can never contradict. Identical in
  Mindful (descriptive, not a grade; Mindful only takes the neutral row colour). Also fixed the 614 vs 605
  mismatch: the live HealthKit figure is merged back into that day's pj_<date> record (raw, read-then-merge,
  existing records only) so the Recovery card and the trend graph converge. Drilldown copy + Otto's KB
  updated and redeployed. Weekly/Monthly/Day Score stay frozen by design; a few kcal can't move a bucket.
- 2026-07-25 **Food Library calorie truth: one shared label resolver (device-confirmed).** Every Library
  tab now shows a food's DEFAULT serving calories, a property of the food rather than of how it was
  logged or when it was starred. Killed a self-perpetuating loop where a Library card's number was fed
  back in as the food's authoritative calories, invented a serving to match itself and re-saved -- so a
  wrong value re-signed itself on every log and re-logging could never heal it (cottage cheese stuck at
  1 kcal, a favourited white bread reading 175 for a 41 g slice). New utils/foodLabel.ts + pj_food_label_cache;
  My Foods answer from the user's own record, FatSecret foods from one cached lookup. Favourites demoted to
  pointers. Edit Entry now reopens on the serving the entry was logged in (incl. plain g/oz/mL). Full
  post-mortem in the archive.
- 2026-07-24 **Save as Meal + Find a Meal / Meal Catalog (device-confirmed).** New "Save as Meal" action
  bundles an already-logged slot's checked items into a permanent, named meal (pj_saved_meals) -- unlike
  a Recipe, items stay SEPARATE editable entries when re-added, never blended into one line. "Repeat a
  Meal" renamed "Find a Meal" and gained a Meal Catalog tab alongside Recent, sharing the exact same
  expand-and-checklist behavior. Real gap fixed along the way: the picker used to be gated purely on
  slot history, hiding a saved meal from any slot (even brand new ones) that had never been repeated
  before -- now gated on history OR any saved meal. Find a Meal also now reachable from a slot that
  already has food logged (previously empty-slot only), so you can add more on top of what's there.
  Otto's KB + the in-app tooltip updated/deployed.
- 2026-07-24 **Recipe photos, same system food already has (device-confirmed).** Direct port of food's
  photo feature: recipe-builder.tsx (creator) gets add/replace/remove with a pending-photo flow for
  brand-new recipes (uploads once the recipe gets its id on save), recipe-log.tsx (the detail/log screen)
  gets a thumbnail with the same full-screen viewer. Deleting a recipe now purges its photo too. Along the
  way, fixed real pre-existing issues on recipe-log's totals card: missing top accent border, Calories
  wrongly colored green (should be neutral, matches food-detail's own convention), and an uneven 4-stat
  row (flex:1 columns let shorter digit counts throw off spacing -- switched to fixed 25% width, same fix
  day-detail.tsx's nutrient grid already uses). Also added a RECIPE TOTALS eyebrow to that card since
  every sibling card had one and it didn't. This closes out the whole meal-photo feature arc (Log tab +
  Day Detail + Recipes, all three now shipped).
- 2026-07-24 **Meal-slot photo, Day Detail thumbnails (device-confirmed).** Follow-on batch to the Log tab
  piece below. Any meal slot that has both logged food AND a photo shows a small 22x22 thumbnail next to
  the meal name in Day Detail's Meals section; tap for the same full-screen viewer. Slots with a photo but
  no logged food show nothing on Day Detail (Justin's explicit call -- Day Detail is a "what did I eat"
  summary, photo-only reminders are a Log tab concern). Only remaining piece of the meal-photo feature is
  the recipes photo port, still in NEXT UP.
- 2026-07-24 **Meal-slot photo, Log tab (device-confirmed).** One photo per meal slot per day, independent
  from the slot's logged food items (Clear all never touches the photo). Lives in the expanded meal
  section as a dashed camera box (empty) or thumbnail (has photo) in its own centered column, food-list
  actions in a second column beside it behind a hairline divider (divider only shows once the slot has
  items -- empty slots get just the standalone photo control). Tap thumbnail for full-screen view.
  Cloud-backed via utils/mealPhotos.ts (mirrors foodPhotos.ts) so photos survive reinstall. Bonus fixes
  found along the way: RepeatMealModal's flat "Add N items" button now uses PrimaryCTA, its checkboxes
  got the gradient-fill treatment. Day Detail thumbnails and the recipes photo port are follow-on batches,
  still in NEXT UP.
- 2026-07-24 **Flat progress-bar sweep, closed out.** HR Zone modal (shared by workout tab exercises +
  everywhere else it opens from) and the Stats tab's standalone Time in Zones card both swapped their flat
  per-zone-color fills for barFillGradient(r.color) -- same molded depth, zone color-coding untouched.
  With steps and stats cards already fixed separately, this closes the sweep that started with the water
  pace work: every progress bar in the app now uses the same real gradient treatment. Device-confirmed.
- 2026-07-24 **Dedicated reading-plan schedule page, device-confirmed.** Second half of the reading-plans
  pass. New app/reading-plan.tsx: full schedule for a plan grouped into weeks behind a "Week N" picker
  (plans run 21-397 days, a flat scroll wasn't reasonable), tap a day's passage to jump into the Bible,
  inline circle toggle to mark any day read/unread in any order (this is where the pace-flexibility we
  agreed on actually lives now). Plans page's "Continue", the Bible strip's passage tap, and the Faith tab
  card's plan tile all now open this page instead of jumping straight into the Bible. Caught mid-build:
  the general Otto companion was showing on this new route instead of Halo (AssistantOverlay's hide-list
  is a hardcoded route-segment set that a brand new screen isn't automatically part of). Also swept every
  reading-plan/devotional progress bar across the app (this page, Plans page, Faith tab card, Home's Faith
  Today card which got a bar + day count added back after being deliberately bar-less before) onto the
  real barFillGradient treatment used everywhere else, replacing flat fills nobody had caught until now.
- 2026-07-24 **Reading plans: completion-driven pacing, Restart, plan-complete moment, device-confirmed.**
  First half of the reading-plans pass. Fixed
  a real bug: "today's reading" was calendar-driven, so missing a few days silently skipped those
  readings instead of resuming where you left off -- now completion-driven like devotionals. Same
  IN PROGRESS/COMPLETED split + Restart as devotionals. Bible reader strip renamed "Today's Reading" ->
  "Next Reading" (no longer a calendar promise), drops a plan once complete instead of showing "Complete"
  forever, and finishing the LAST day now fires a distinct "Plan complete!" toast. Deleted the standalone
  "Reading Plans" Home card entirely -- the "Faith Today" card already combines reading plans and
  devotionals in one, mirroring the Faith tab; the standalone one was redundant and devotional-blind.
- 2026-07-24 **Devotional completion state, Restart, and button redesign, device-confirmed.** A finished
  devotional now moves to its own COMPLETED section on Plans (with Restart) instead of sitting in IN
  PROGRESS forever with a dead Continue button, and drops off both Home's and the Faith tab's own
  "Bible and Plans" card (two separate implementations, both had to be fixed). Plans/Devotionals column
  labels are now a persistent entry point into /plans regardless of the 3-active cap (Browse used to
  vanish there with nothing to replace it). Devotional day screen's 3 buttons unified into one CTA +
  two matching pills instead of three clashing styles. Confirmed same Browse-lockout gap exists on
  Reading Plans, deliberately left for the full reading-plans pass (NEXT UP).
- 2026-07-24 **Custom profile pictures, device-confirmed.** Plus badge on Profile's own avatar (own
  avatar stays inert there, no dead-end tap) opens an in-house Photo Options modal (ModalHeader, gradient
  icons/labels, ButtonShine, real house press-scale) -> Take Photo / Choose from Library / Remove Photo.
  Picking a photo routes to a dedicated full-screen crop step (pinch/drag inside a circular guide) before
  upload. Photo replaces initials on every tab header once set. Rough build (native ActionSheetIOS, dead
  crop gestures, mismatched crop preview, a layout-collapsing button regression) -- full story + the
  "STOP committing before I confirm" lesson in the archive.
- 2026-07-24 **Gratitude card: NRN can now add it to Home (Edit Layout, no Scripture shown), fixed 3
  hardcoded-amber spots that leaked faith styling onto Home for every user, added a grace-saver
  explainer to the tooltip.** Closes the 2026-07-19 "shown to NRN as-is" gap.
- 2026-07-24 **Rate Us + Feedback prompts, fully built and device-confirmed.** 9 real triggers, a shared
  30-day/3-total budget engine, two Otto notification-hub cards (Rate Us fallback + independent Feedback
  nudge). Full story (including the duplicate-entry-point lesson that ate most of the build time) in
  SPEC_rate_us_and_feedback.md.
- 2026-07-20 **WEB/KJV translation toggle added to Today's Message modal's gear icon**, on top of the shared VersePoolModal so Home's Faith Today card and the Faith tab pick it up automatically. Confirmed by Justin.
- 2026-07-20 **Restore gate stale-screen bug fixed.** Account-switch restore on a device that previously onboarded a different account was actually succeeding under the hood; the already-rendered screens just never knew to re-read the freshly-restored data. Fix: a plain "Account Restored, please close and reopen" alert on a genuine restore. Confirmed on Justin's phone; never any real risk to cloud data (`uploadAllLocal` was hard-gated on `syncReady` the whole time).
- 2026-07-20 **Firebase auth identity edge cases -- sign-in handling, Connected Accounts, contact email.** Built and device-tested: `sign-in.tsx` now catches `account-exists-with-different-credential` and guides the user to the right method; new Connected Accounts section in Settings > Account for linking/unlinking Apple + Google (with a "can't remove your last method" guard); preferred contact email picker for accounts with diverging linked emails. 2 test scenarios (new device + same provider, same or different email) deliberately left open, still in NEXT UP.
- 2026-07-23 **Water pace indicator on the Home + Log water cards.** The "expected by now" pace is now surfaced on the card without opening the modal: a short vertical PIN on the main water bar at the expected position, taller than the bar (with a thin light edge) so it stays visible when the fill passes it. Colour is NEUTRAL unless behind -- grey when on/ahead of pace, amber slightly behind, red well behind, always grey in Mindful (a green pin blended into the blue bar and clashed across accents; it now only takes a colour when it needs to nudge). Iterated live with Justin: started as a thin second sub-bar (read as a confusing redundant bar), became the pin; a header "PACE" legend was built then CUT (looked cramped by the gear, and the neutral-unless-behind colour makes the tick self-signalling -- the modal's "Expected Now" is the explanation one tap away). Also: both water modals' main bars got the molded barFillGradient touch-up. Under the hood, one shared helper (utils/waterPace.ts) now feeds both cards AND both modals, so they can't disagree -- and Log's modal now uses the day's REAL wake time (it was hardcoded to 6 AM; Home always used real). Pace math unchanged: linear wake->10 PM, expected = elapsed/window * goal. Device-confirmed by Justin. (NOTE: surfacing "expected" makes the pace curve more visible -- if it runs too aggressive early, that's the separate dad-notification item.)
- 2026-07-23 **EvR recovery "compare" card redesigned.** The two stacked bars (68 after hard / 76 after easy) read as noise -- 68 and 76 out of 100 are near-identical bar lengths, so the drop was invisible and the bars compared to nothing. Replaced with ONE shared 0-100 recovery track: a vertical pin for each score (accent = flagged condition, grey = baseline), the span between them shaded, 0/100 axis ends, and a compact "-8 pts" pill on the hero-number row (an earlier centered "8 PTS LOWER" banner was cut -- it competed with the orange recommendation line and just restated the numbers). Applies to both compare insights (recovery after hard vs easy days, after short vs full sleep); both are 0-100 so the scale is anchored to 100 (utils/smartTipsEngine.ts feeds them). The "define hard/easy day" idea was explicitly dropped (Justin: nobody hunts a tooltip for that). Device-confirmed by Justin.
- 2026-07-23 **Effort vs Results visual pass.** The EvR report viewer's cards missed the app's molded treatment: hero numbers (134g/145g, 68/76, 9.4lb/5lb, score + range values) were flat text and the progress bars were flat solid fills. Now every hero number renders through GradientNumber and every fill bar through the app-wide barFillGradient (utils/barGradient), matching the rest of the app. Done with two shared helpers (heroNum, barFill) across all six card variants (target/range/compare/score/goalbar/dots); the range card's marker/band left alone (it's a pin, not a fill). Unit suffix gets paddingBottom:6 to sit on the number's baseline (matches comparison-report.tsx; without it the unit dropped below the value -- caught + fixed on device). Device-confirmed by Justin. NOTE: the compare card's two recovery bars got the gradient too but its "double bar makes no sense" redesign is still open (NEXT UP item 4).
- 2026-07-23 **Recent library row showed per-gram calories after logging by weight.** Logging 18g of a FatSecret Swiss cheese (or 24mL of creamer) made the Recent list show "3 kcal / 0g / 0g" -- the food's per-1-gram value, not its serving. Cause: the logged entry stored its "label" number (the headline Recent shows) from the SELECTED logging unit, so picking the "g"/"mL" serving stamped a one-gram serving as the food's label. Fix: the stored label now always comes from the food's real DEFAULT serving, decoupled from whatever unit was logged (food-detail.tsx, the labelCal/labelProtein/labelCarbs/labelFat writer). Cosmetic only -- day totals/history were always correct; the sole consumer of the stored label is the Recent list. Old entries self-heal on re-log or age out of the 30-day window. Device-confirmed by Justin.
- 2026-07-22 **Barcode scan "SET" banner redesigned.** The loose text after a barcode scan is now a quiet bordered info banner: the centered "Tap SET on the correct item to confirm it for future scans" line, with "None match? Create & Set food" underneath rebuilt as a real bordered blue button (icon, ButtonShine, 44pt target, haptic). CUT before ship: a version that retired the tip after a few scans -- Justin never approved it and wants the tip to always show. Device-confirmed by Justin.
- 2026-07-22 **Explainers caught up to the two-control Food Detail.** Food logging TUTORIAL rewritten: the two stale steps that described typing into the removed Amount box now cover the Serving Size picker (pick a unit or a named serving) and the Amount stepper (how many); the now-duplicate third detail step was dropped. Otto's KB gained the merged serving picker, the removed Amount row, and the Set/Unset barcode button. Otto redeployed. Device-confirmed by Justin.
- 2026-07-22 **Food detail: the quantity controls collapsed from three to two, plus SET/UNSET barcode linking.** The screen asked "how much?" three ways -- a Serving Size picker, a Servings stepper, and an Amount box with its OWN second unit dropdown. The units moved INTO the serving list (Cronometer's model: named servings and plain units answer the same question, "what does one of this mean?"), so the Amount row is gone and the stepper is the only number. Picker rebuilt: centered floating card with handle pill, gradient title, X, top accent border, tap-outside to close; rows are cards matching the food library's search results, split BY WEIGHT (or By Volume) first then COMMON SERVINGS, each named serving carrying its own weight so it can be checked against the package ("15 chips · 28 g" against a bag reading "28g / about 12 chips"). SET/UNSET button in the header links a barcode straight from the food (blue SET / red UNSET, confirms before unsetting, asks before moving a barcode off another food). FIXED ALONG THE WAY: the picker didn't list the food's own serving (four branded foods looked like the app had no idea what their serving was -- the fetched FatSecret list was being thrown away except the default); the camera fired a scan per FRAME so one barcode produced a wall of toasts; the serving modal had no height cap or scroll, so a 15-serving food filled the screen with no way out but picking one; per-unit values were ROUNDED before being multiplied (1 g of a 37 g / 130 kcal bar stored as 4, so 37 g came back 148); picking a serving didn't count as a change, so a custom food showed "Nutrition for 1 g" at 130 kcal. Device-confirmed by Justin throughout. STILL OPEN: FatSecret contradicts itself on some foods (oat milk: search says 98 kcal, its own serving list says 117) and the app deliberately prefers the search number.
- 2026-07-22 **Create Food tutorial covers label scanning + %DV entry** (closes the last open item on the label-scan feature). New step spotlighting the Scan Nutrition Label button, deliberately explained rather than fired: a walkthrough can't open the camera and produce a real label, and faking a result would teach something untrue. Copy says nothing saves straight from the camera, there's a review screen, and unclear reads are marked amber. The Macros step now mentions the amount/percent boxes, since it was describing a form that no longer existed. Also fixed: the Calories & Serving Size step's spotlight was clipped -- that card outgrew the space between the bubble and the bottom bar when it gained the merged Serving Name field and unit dropdown -- now uses noDimOverlay, the same call the Macros step already made for the same reason. Device-confirmed by Justin.
- 2026-07-22 **Label scan: bilingual labels now read the printed numbers instead of back-calculating them.** On a real bilingual tortilla-chip bag every value was subtly wrong in a provable way -- carbs 19.3 (= 7% of 275) instead of the printed 18g, sodium 92 instead of 90, calcium 26 instead of 20, potassium 94 instead of 80, iron 0.4 borrowed from a neighbouring row's 2% -- because "Total Fat / Grasa Total 7g" arrives as ONE block, the name-to-number gap was too long for the pattern, and the only thing findable on the row was the %DV, so every number got derived backwards from it. Rows printing no %DV at all (Protein, Total Sugars, Trans Fat) simply came back empty. Fix: a nutrient's number may sit far from its name, but ONLY across a slash -- an English label has no slash there, so nothing about it changes. Same for "Includes / Incluye 0g Added Sugars", and the serving name drops the Spanish half when a slash precedes the first digit ("1/3 cup mix" untouched, since that slash follows one). 79/79 parser tests. Device-confirmed 3-for-3 by Justin, plus no regression on the English labels. LEFT ALONE deliberately: the serving NAME varies between scans ("1oz" vs "1oz (28glabout 12 chips)") depending on whether OCR reads the slash in "28g/about" as an l -- cosmetic, the field is editable, not worth the round.
- 2026-07-22 **%DV entry in Create Food + Edit Food** (SPEC_nutrition.md section 17, graduated from the backlog the same day Justin hit it: an oddly-shaped bottle wouldn't scan and its vitamins printed only a percentage with no mg/mcg, so there was no way to record them). Every nutrient with a published FDA daily value now has a merged single box: amount on the left, hairline divider, percent on the right, type either and the other fills in. The AMOUNT is still the only thing stored. ONE shared table: the scanner's `DV_REFERENCE` moved to `utils/nutrientDV.ts` and both the review card and the form read it, so they can never disagree. Protein/trans fat/poly/mono/sugar/sugar alcohols/caffeine get no percent box (no published DV -- inventing one would be fabricating data); Macros stay amount-only (3-across has no room, and labels always print grams there). Built once in the shared NutrientFieldsGrid so Create and Edit are identical by construction. Recipes deliberately excluded: their nutrition is summed from ingredients, there is nothing to type. ALSO FIXED: collapsible sections were measuring their height from a hidden OFF-SCREEN copy, where percentage-width cells lay out differently, so the last row of a section (Potassium, Vitamin K) was clipped -- now measured in place, which also self-corrects when content changes. Device-confirmed by Justin.
- 2026-07-22 **Label scan: dual-column labels fully handled, including "as prepared" variants.** A label's second column is now classified by ARITHMETIC, not wording: consistently the first column x servings-per-container means it's the redundant per-container column (ignored, since the app already computes it), anything else means a genuinely different food ("Granola with 1/2 Cup Fat Free Milk", pancake mix as-prepared) and the review card offers **As Packaged / As Prepared** pills that swap every number, captioned with the label's own wording. Only the selected column saves, because as-prepared is not a serving size of as-packaged (adding milk changes the ratios). HOW THE COLUMNS ARE FOUND -- two approaches failed first and both failure modes are now tested: a vertical boundary line couldn't be placed (a heading is wider than its column and starts further right, which left the granola's As Prepared protein empty on every scan), and pure left-to-right cell order was position-blind (when a faint per-serving %DV failed to OCR, the container column's number slid into its place -- Total Fat 8g showing 30% DV). The shipped version does both: rows that read cleanly teach the parser where each column sits, and those learned positions place the cells on rows that only read one, so a lone cell in column two's territory leaves column one EMPTY and flagged rather than wrong. 66/66 parser tests. Device-confirmed by Justin 3-for-3 on ice cream, granola, pancake box and Ghost can.
- 2026-07-22 **Label scan: dual-column labels, wording variants, and an attention banner.** Nutrient rows now stop at the first number column, so a "Per serving | Per container" label can't feed the container column's numbers into the food (real: Total Fat 8g carrying the container's 30% DV). The cut is found three ways, each with a guard: the column's own header (must sit in the right half, since a stray "per container" fragment at the left margin was blanking whole labels), the %DV bands, and -- when the header and faint %DV column both fail to OCR on a glossy pint -- the bands of every number on the label (4 bands = two columns, 2 = one, 3 = refuse to guess). Any cut that would discard most of the label is thrown out. WORDING SWEEP: Total Carb./Total Carbs, Includes/Including, Sat. Fat, Trans-Fat, Cholest., Vit. D, bare Fiber, Total Sugar. OCR letter-O read as zero, both standing alone ("Omcg") and inside a number ("1Og" -> 10g, which was eating Protein). REVIEW CARD: a tappable "N fields need a look" banner that opens the right section and scrolls to the first flagged field. 50/50 parser tests. Device-confirmed by Justin across a protein ice cream pint, pancake box, Ghost can and a granola label. KNOWN LIMIT, not a bug: glossy/curved cans still misread the odd value (a "1g" fiber read as "19"); the amber flag catches it, which is the point.
- 2026-07-22 **Label scan: review card rebuilt + four parser fixes.** The review card now lists EVERY supported field (grouped Calories & Macros / More Nutrition / Vitamins / Minerals, each with a "· N found" count), so a scan that missed Sodium no longer leaves it unreachable; sections auto-open when the scan sensed anything in them, an amber dot on the header means a flag can't hide inside a closed box, and a missing CORE field (calories/fat/carbs/protein) is itself amber with "Not found on the scan, type it in". Serving is editable at last (Serving Name + Amount + weight/volume picker + Servings Per Container), converting to the canonical base on confirm and keeping the confirmed unit as the food's display unit. Added a Retake button (the banner told users to retake and gave them no way to). PARSER: serving size no longer accepts a punctuation-only match (a bare ":" was short-circuiting the same-row search); curved-can row matching as a FALLBACK pass only, capped and refused when another row label sits closer (the iron/potassium regression test caught the first, looser attempt); nutrient names now word-boundary anchored and nothing below "INGREDIENTS:" is matched (a can's "Phosphoryl Choline" was producing a phantom 100mg choline); "Not a significant source of X, Y, Z" is read as a real 0 for those nutrients, found by stitching the label's text back in reading order rather than by geometry. Keyboard avoidance on the review card. 33/33 parser tests green. Device-confirmed by Justin on a Ghost Energy can + pancake box.
- 2026-07-22 **Serving-unit Piece 4c: log a recipe portion in any sibling unit.** The recipe log screen's By-weight box got the shared unit picker: a batch defined in lb can be logged as 8 oz (or a mL recipe in cups) and the typed amount converts back to the recipe's own unit before any math, so logging never redefines the recipe. Same-family units only. The prompt, the "Nutrition for X" line and the By weight toggle all follow the picked unit, and the diary entry carries displayUnit/displayAmount so the meal card reads "8 oz" instead of the converted number. Legacy "lbs"/"cups" recipes get the picker too -- that alias translation moved into utils/unitConversion.ts (`normalizeUnitKey`) so the builder and log screen share one source of truth. Device-confirmed by Justin. NOTE: recipes never needed a servingDisplayUnit like foods -- a recipe's stored unit IS its display unit (no canonical base underneath), so they already remembered.
- 2026-07-22 **Serving-unit Piece 4b: edit an ingredient's amount in the recipe builder** (was delete-and-re-add only). Tap the ingredient ROW (quiet dim pencil marks it as tappable; trash stays its own target) -> centered card with the amount + same-family unit picker; every nutrient rescales linearly (exact, not an estimate -- they were always a straight multiple of the amount) and the row keeps whatever unit was picked. Dim Save until there's a real change, light haptic on Cancel / medium on Save. ALSO FIXED IN THE SHARED PICKER (applies app-wide -- Create Food, Edit Food, logging, recipe total weight): the dropdown now measures the real keyboard height instead of only reserving room for a floating bottom bar, so it flips upward instead of opening into the keypad, and only flips when up is genuinely roomier. Device-confirmed by Justin.
- 2026-07-22 **Serving-unit Piece 4a: recipe builder joins the unit system, plus two stale-screen fixes.** Recipe builder's Total Finished Weight dropped its hand-rolled dropdown for the shared 2-column Weight/Volume picker, moved from its own dialect (lbs/cups) to the app-wide keys with legacy spellings read gracefully, and converts within a family on switch; recipe-log's "How many ___?" word list, By weight toggle, and total-weight line all follow. Fixed ingredients always being stamped "g" (food-detail was reading a vestigial unit state, so a 240 mL milk logged as 240 g) and inline-created custom foods being labeled with their serving NAME instead of a unit. STALE-SCREEN FIXES: the recipe page now re-reads the recipe on focus (edit + save used to land you back on the pre-edit version, reading as a save that didn't take), and food-detail refreshes in place after a food edit instead of bouncing the user off the screen -- including the stored absolute cal/macros, which are what a custom food actually displays (a logged entry's own numbers are deliberately left alone). Device-confirmed by Justin.
- 2026-07-22 **Serving-unit redesign Piece 3b: volume support in EditFoodModal + foods now remember the unit they were built in.** Edit Food's primary Amount got the same 2-column Weight/Volume picker as Create Food and stopped hardcoding grams (a mL food now opens as mL, not a number mislabeled "g"); within-family converts, cross-family flips the canonical base, and legacy non-measurement units ("container"/"serving") fall back to grams for display and flip to a real base only when the user deliberately picks a unit. NEW `servingDisplayUnit` field (display only, never math, ignored if it leaves the base's family): a juice built as "1 Cup" is greeted as 1 Cup on food detail, logging, and Edit instead of 236.59 mL, with per-entry displayUnit still winning when editing an existing log. Also swept lowercase "ml"/"l" leaks through unitLabel (row placeholders, Create Food's "Serving (mL)" header, food-detail Amount label + avg readout, auto-generated serving labels, diary entry names). Device-confirmed by Justin. STILL OPEN: recipe builder picker; legacy audit.
- 2026-07-22 **Serving-unit redesign Piece 3a: volume support in Create Food + 2-column Weight/Volume picker.** Create Food's primary Amount now offers weight (g/kg/oz/lb) AND volume (mL/L/cup/tbsp/tsp/fl oz) in one 2-column picker (headers "Weight"/"Volume"); within-family converts live, cross-family keeps the number and flips the canonical base (g<->ml). Diary entries now store their true base unit + serving name, fixing edit-entry of a volume (mL) food (was showing amount 0 / "240g", now shows "240 mL" and the "1 Cup" serving name). cup kept at 236.6 mL (Justin: whatever's easiest). Device-confirmed by Justin. STILL OPEN: same volume picker in EditFoodModal (the food modal, currently weight-only); recipe builder; legacy audit.
- 2026-07-22 **Serving-unit redesign Piece 2: family-aware weight/volume dropdown on the diary logging screen (food-detail).** Amount field now has a g/kg/oz/lb (or mL/L/cup/tbsp/tsp/fl oz for volume foods) picker merged into one unified box; logs remember the unit entered or the food's native unit (displayUnit/displayAmount) so the meal card + edit reopen read "11 oz"/"240 mL", grams stays canonical for all math/totals; switching a logged entry's unit undims Update Entry and switching back to g clears it; mL/L capitalization via unitLabel; EditFoodModal Save now guards against an empty Amount (fixes the empty-amount garbage-macros bug). Device-confirmed by Justin. Recipe builder still on its own follow-up.
- 2026-07-22 **Serving-unit redesign Piece 1: EditFoodModal now mirrors Create Food** (boxed Basic Info + Serving sections, Serving/Calories moved up above the nutrient grid, merged "Serving Name" free-text field, g/kg/oz/lb weight dropdown on Amount converting to canonical grams). Non-destructive: no legacy food's numbers/units rewritten. Device-confirmed by Justin. Photo button intentionally not added (kept existing entry points). Pieces 2 (logging-screen weight dropdown) + 3 (legacy migration) still open.
- 2026-07-22 **UnitPickerButton dropdown now flips upward when there's no room below (measures own screen position, 175px bottom inset clears the Cancel/Save Food bar) and cascades options in on open; added hairline dividers between rows.** Component-only fix, applies everywhere the unit picker is used. Device-confirmed by Justin.
- 2026-07-19 **WEB (World English Bible) added as a second translation, WEB is now primary/default, KJV
  secondary.** Reader, Today's Message, Gratitude card, Favorites, custom saved verses, the verse-pool
  manager, and Halo's scripture citations all now live-fetch the real wording in whichever translation is
  selected -- device-confirmed by Justin, "whatever's selected should change literally everything" is the
  locked standard. Fixed 3 real bugs found along the way: WEB's parser was silently dropping every poetic
  passage (most of Isaiah/Psalms/Proverbs/the prophets -- was only a paragraph-text vs line-text type
  check); Home's daily verse only ever resolved once per app session so a translation switch never reached
  it; the notification scheduler's "today's verse" was reading a stale rotation format and silently always
  null. Also replaced 3 onboarding verses that turned out to be an unverified paraphrase (one read close
  enough to NIV's copyrighted phrasing to be a real risk) with verified WEB text. STILL OPEN: devotional
  reflections directly quote KJV-style wording in the written commentary -- see NEXT UP, this is the
  active in-progress item.
- 2026-07-19 **Otto (Companion FAB) now glides instead of teleporting** between his tab-bar and pushed-
  screen resting spots -- device-confirmed.
- 2026-07-19 **Navigation haptic delay fixed, device-confirmed on TestFlight** -- buzz now fires instantly
  on tap everywhere instead of waiting on the destination screen. Also batched 4 screens' day-by-day history
  scans (Achievements/Settings/Add Food/Profile) into single reads. Broader "why do some screens still feel
  slow" investigation PARKED -- see NEXT UP.
- 2026-07-18 **Progress-bar gradient treatment, device-confirmed.** New `utils/barGradient.ts` (same
  molded lift/sink recipe as GradientTitle/GradientNumber, tuned stronger since bars are only 6-8px tall)
  wired into every flat-fill bar: Home's water/steps/macro bars + calorie/macro bars on the Log tab.
  Ring/donut version filed as its own follow-on in NEXT UP, not bundled into this pass.
- 2026-07-18 **Anthropic API key rotated, exposure closed.** The pre-07-01 client-bundled key (live since
  07-01 with no confirmed abuse, $50/mo cap) is fully revoked -- both legacy keys ("ProjectJ" and
  "projectj-faith") deleted from the Anthropic console after confirming Otto, Halo, and the AI meal
  estimator all work on the new key. New key is `goodforge-prod`, 1-year expiration, set via
  `firebase functions:secrets:set ANTHROPIC_API_KEY` + redeployed to aiProxy/appCompanion/faithCompanion.
  Next rotation reminder filed under Infrastructure backlog (~2027-07-18).
- 2026-07-18 **What's New Patch 4 drafted** (data/whatsNew.ts): GoodForge rename, the visual refresh look,
  and a 10-item fixes list led with the real one -- editing a food from a logged entry could silently blank
  extended nutrition fields (fiber/sodium/vitamins) on save. Copy locked with Justin; device-verify pending.
- 2026-07-18 **App renamed to GoodForge.** Verified available (App Store search + App Store Connect name-field
  save), full code + legal-doc rename pass done, 8 Cloud Functions redeployed. See the LAUNCH BLOCKERS entry
  for exactly what changed vs. what's deliberately left as the old identifier (bundle ID, Firebase project).
  Fresh EAS build still needed for iOS permission-prompt strings to show on-device.
- 2026-07-18 **Visual Refresh track closed out.** Surface, Voice, and Card Stagger passes all confirmed done
  app-wide; Warm + Blush reviewed on-device, no issues; card shadows done on every page + all onboarding
  screens (modals stay parked, Justin's call); number-face stragglers (REST DAY heading, IFCard "LAST MEAL",
  Profile save-bar) fixed; the slide-up-sheets item closed as not-a-bug (Journal category picker + Stats
  graph creator's "Choose data type" step both stay bottom sheets on purpose). Full detail in the archive.
- 2026-07-18 **Primary button rollout (PrimaryCTA sweep) confirmed done app-wide.**
- 2026-07-07 **Custom Reports Slice 1 shipped** -- reports hub (list/new/delete), report screen (date-range
  chips + block picker + 3 starter blocks: Weight trend, Nutrition headline, Macro split), live in Stats.
  Beta-open to all testers. Remaining block-library growth/export/templates tracked in NEXT UP.
- 2026-07-18 **Stats tab section-order flash fixed, device-confirmed.** Any section the user had dragged
  into a custom order (e.g. Body/Calendar) briefly rendered in the hardcoded DEFAULT order on every tab
  focus, then visibly snapped to the real saved order -- `loadStatsCards()` was buried at the tail of a
  60+-sequential-AsyncStorage-read chain (a day-by-day calendar loop + a weight-lookup loop), slow enough
  on the dev-build JS thread to be very visible. First attempt (gate the whole section list on that same
  chain) was worse -- multiple seconds of blank screen, reverted same session. Real fix: pulled the card-
  order load into its own small, independent `useFocusEffect`, un-gated by `runAfterInteractions` and by
  the slow chain, so it resolves in 1-2 fast reads and the list draws once, already correct.
- 2026-07-18 **(i) / (?) / gear icon gradient sweep, app-wide.** TooltipIcon is a single shared component,
  so gradienting it once covers every (i) icon in the app. The 6 header (?) icons (all 5 tabs + Settings)
  and the "HOW TO MEASURE" button icon got the same treatment -- all already accent-colored, so no color
  change, same low-risk pattern as the rest of the rollout. Gear icons (Home x4, Stats, Log x2, Faith,
  StatsGraphCard, FaithTodayCard) got it too, but colors were deliberately LEFT AS-IS (grey stays grey,
  amber stays amber) -- this is what un-parks the gear-icon item from 2026-07-18: switching to accent was
  the risk that got it parked ("a quiet settings affordance starting to look like a CTA"), so this sidesteps
  it entirely by never touching color, only adding the wash.
- 2026-07-18 **Four device-confirmed fixes:** Stats > At a Glance Weight Change was reading a totally
  disconnected period variable (rewired to `periodData`, now moves correctly with 7D/30D/90D/180D/YTD);
  workout achievement trophies (workout_first...365, both the unlock check and the progress-bar copy)
  now require a checked exercise, not just an assigned one -- fixes the inflated count AND naturally
  excludes Settings > Import Workout History backfills from ever counting, confirmed a fresh import
  can't move a new or existing user's progress; momentum "All In" stuck at 0/90 was a real UTC-vs-local
  date-key bug in the progress-display streak calc (same class as the 2026-07-03 fix, this spot was
  missed) -- now reads correctly; EvR loading skeleton cards now carry the same `marginBottom: 12` gap
  the real cards use.
- 2026-07-18 **Reports gradient pass, device pending verify. Closes the gradient rollout.** Turned out to
  be ~14 shared renderer components behind the ~55 block library, not 55 bespoke designs -- gradiented all
  of them (row titles + values across TopFoods, FoodLog, Records, WorkoutHistory, CaloriesByMeal,
  DayExtremes, ExerciseFrequency, SleepStages, BodyMeasurements, AchievementsEarned, ChallengeHistory,
  StatTiles, MacroSplit, BlockCard's header value) plus Report/Template names and "Start from a template."
  LineTrend's chart axis labels are SVG text, not RN Text, so they're excluded -- different rendering path,
  not worth a one-off build. Also: Duration pills and the block-library "+ Add" buttons got the active/
  shine touch-up, and a real bug got fixed -- the header pencil (rename) focused a TextInput that only
  existed once a report had its first block, so it silently did nothing on every brand-new report. Added
  an always-visible name field for the empty state, same ref/handlers.
- 2026-07-18 **Onboarding gradient pass, all 6 steps, device pending verify.** Every step title now
  GradientTitle at one consistent 36px (was 36/36/36/44/40/40 -- Steps 4-6 also had a 6-16px stray gap
  under the STEP X OF 6 eyebrow, now matched to 8 everywhere). Steps 1-2 were running the generic app blue
  instead of the Balanced mode accent Your Style opens on -- repinned both to Balanced (#1a44c2) end to
  end (background glow, progress bar, back button, pills, CTA). Steps 4-6 titles shortened to fit one
  line instead of hard-wrapping (was producing a visible per-line gradient seam): "Your Faith Journey",
  "Smarter Tracking", step 6 unchanged copy. All Set's mode headline shortened per mode (Discipline/
  Balanced/Mindful) and its 78px top offset corrected to 72 to match Steps 1-3. List-row titles gradiented
  grey/secondary throughout (Style survey questions, Your Style macro presets + card headers, Faith
  Journey cards, Apple Health + Notifications item rows, All Set tips). This closes the onboarding piece
  of the app-wide gradient rollout -- only Reports remains.
- 2026-07-18 **Challenges + Challenge Create gradient pass, device pending verify.** GradientNumber on
  the Stats tab Challenges card title + status line, the Challenges page's active-challenge title, both
  hero comparison numbers (beat-type you/them rows, custom weight, custom per-day), "No active challenge,"
  and Past Challenge titles. New Challenge button (challenges.tsx, was flat solid fill) now uses
  PrimaryCTA. Challenge Create: type-card titles gradiented, and ButtonShine added to every selected pill
  that was missing it (challenge type cards, metric pills, Compare Against, Duration incl. Custom, Start).
- 2026-07-18 **Recipe Log gradient pass, device pending verify.** GradientNumber applied to ingredient
  names, per-ingredient calories, extended nutrition facts, and both macro rows (top Recipe Info card +
  bottom Amount/Nutrition card). Per-ingredient protein/carbs/fat badges under the name stay grey
  (`theme.textMuted`), matching the rest of the app's per-row macro convention -- only the colored dots
  next to them carry macro color. By-serving/by-weight toggle pill left untouched, no decision made yet.
- 2026-07-18 **Recipe Builder: Total Finished Weight unit dropdown no longer opens off-screen.** Was
  always anchored below the button with no bounds check, so low on the form it ran off the bottom edge
  with no scroll. Now measures space below vs. the dropdown's fixed height and opens upward instead when
  there isn't room.
- 2026-07-18 **FAB icon/label shine, app-wide, device-verified.** Every FAB with a speed-dial expand
  menu (found via a full-project grep on the shared style fingerprint, so nothing was missed) now has
  ButtonShine on both the pill-label button and the circle-icon button, for every option: Log tab (new,
  see below), Add Food's own FAB (+ a new 4th "Barcode" option, matching the Log tab one), Workout tab,
  Workout Library, Stats tab, Bible/Faith auto-scroll speed picker.
- 2026-07-18 **Log tab FAB, new.** Multiple entry points into logging (Create Food, Create Recipe, Barcode,
  Add to Meal -- bottom to top, most-used closest to the thumb per Justin's call), same speed-dial pattern
  as Workout Library / Add Food's own FAB. Create Food and Barcode deep-link into Add Food's existing
  modal/scanner via two new params (`openCreate`, `openScanner`) using the same mount-effect pattern the
  tutorial system already relies on. Add to Meal reuses the existing "Library" browse flow (`meal: 'browse'`)
  verbatim -- no new code needed there.
- 2026-07-18 **Otto + Halo icon touch-up, device-verified.** Header icon row spacing fixed on both (was
  `gap: 2`, house standard confirmed at `gap: 8` off Profile/Stats headers). Both avatar circles (header
  brand dot + the one next to every message bubble) got the shine treatment -- they were flat solid fills,
  same fix as every other solid-fill circle this session. Halo's cross was rendering in a near-black tone
  (`CROSS_DARK`) on both avatars; moved to the warm-white `#fff4dd` that Halo's own FAB already uses
  (components/CompanionFAB.tsx), added as a new local `CROSS_LIGHT` const -- the send-button arrow still
  correctly uses the dark tone, untouched.
- 2026-07-18 **AI Meal Estimator gradient pass + Food Detail's donut calorie number + Journal's remaining
  misses, device-verified.** AI Estimator: Log tab entry card retitled ("Eating out?" read as unintentionally
  sexual, now "AI Meal Estimate" + a rewritten subtitle, sized to match meal-title headers), every food name
  gradient (flagged rows, "What We Estimated," editable line items, Recent Estimates modal), "Recent
  Estimates Today" trigger gradient, "Possibly Not Included" items capitalized (were all-lowercase), Portion
  Size + Scale This Item pills get the shine treatment, WHAT WE ESTIMATED / PORTION SIZE labels bumped a
  size (off-card labels, same treatment as Profile/Stats). Meal Name stays a flat editable TextInput,
  matching the established can't-gradient-a-live-input rule. Food Detail: the calorie number inside the
  macro ring was on the deprecated hardcoded Bebas font at 16px flat black -- now the real hero-number face,
  bolder, gradient. Journal: entry titles + New Entry category rows now gradient (colored per-category,
  matching the pill beside them), filter pills get shine, written reflection body text moved off pure black
  onto textSecondary (prose, not a value, so no gradient). Also fixed the HR Zones modal (zone names +
  durations gradient, kept grey per Justin's correction; debrief headline's tint left alone) and gave the
  Workout tab's day scroller the same active-shine treatment as every other selector this session.
  >> PROCESS NOTE (see [[feedback_never_default_to_accent_color]]): accent blue got defaulted onto new
  gradient text THREE times this session before this rule stuck -- Sleep & Recovery labels, the AI
  Estimator batch, and again on HR Zones' zone names/durations even after the second correction. Every
  gradient color choice now defaults to textSecondary/grey unless Justin explicitly asks for something else.
- 2026-07-18 **Sleep & Recovery gradient pass, device-verified.** Every colored value (hero duration/score,
  Core/Deep/REM/Awake boxes, Sleep Score Trend avg, Sleep Metrics rows incl. deltas, Recovery hero status
  word, Today's Recovery rows incl. Blood Oxygen, Recovery Trend avg) plus every category label (box labels,
  Today's Recovery row labels, Sleep Stages legend, Sleep Metrics row labels) now gradient. Category-label
  color went through a correction: first pass used accentBlueRaw, Justin found it didn't fit ("doesn't feel
  right, make them grey"), moved to theme.textSecondary for all 4 row-label spots (Today's Recovery x2 modes,
  Blood Oxygen, Sleep Metrics) -- the stage-colored labels (box labels, Sleep Stages legend) were correct
  as-shipped and untouched. Mindful mode's Recovery hero explicitly brought to PARITY with the other coaching
  modes per Justin's call -- it was rendering flat/neutral, which read as "Mindful = no color" but the actual
  rule is "Mindful = no judgment color," so it now gets the identical gradient treatment using its existing
  single-tone accent (never switches to red/amber/green). BUG FIX while in there: Recovery Trend's avg number
  was hardcoded to always render in the "good" green regardless of the actual average -- now runs through the
  same recoveryZone() thresholds as the main hero score. GradientNumber gained an optional `numberOfLines`
  pass-through (needed once row labels went gradient, to stop long labels like "Prev. Activity" from wrapping
  in a narrow column).
  >> PROCESS NOTE: this entry got written to the roadmap once already, framed as "pending device verify,"
  BEFORE Justin had actually looked at it -- and the label-color choice turned out wrong. Justin corrected:
  don't write shipped/done entries ahead of his on-device confirmation, even hedged ones. Wait for the
  explicit thumbs-up, then document.
- 2026-07-18 **Profile gradient/number pass, device-verified (Light + Dark).** Weight/BMR/TDEE/Target/Projected/To Go all gradient now, shine added to Male/Female + Activity Level rows + Weight Pace pills, Activity Level selected-text color fixed to accent (was black), both "informational purposes" disclaimers darkened (textDim -> textMuted), Name/Height/Birthday bolder, section headers bumped a size. Same section-header size bump also applied to Stats' CollapsibleSection (13 -> 14px, no color change -- Stats already deliberately avoids accent on these labels because of the bottom glow, see the comment at stats.tsx CollapsibleSection).
- 2026-07-18 **Halo + Otto chat redesign alignment.** Halo (Faith companion) was running the exact same code
  as Otto -- generic accent wash + hardcoded accentBlue user-bubble + black brand name + a hardcoded amber
  REPLY bubble -- with no real Faith branch anywhere. First pass used raw `theme.accentAmber` (full
  strength) for the wash at Otto's same 0.55 opacity, which came out as a solid orange slab (Justin
  screenshot) since every other wash token, incl. Otto's, is a pre-muted pastel, not a raw accent; dropped
  to 0.25 to compensate. Also found Halo's own reply bubble was hardcoded amber the whole time (predates
  this pass) -- fine against the old barely-there background, but blended into the now-amber wash, so it's
  now neutral gray matching Otto's `assistantBubble` exactly. Final state: muted-amber wash + amber user-
  message bubble + amber gradient name, but Halo's OWN words render in the same neutral bubble Otto uses.
  Otto unchanged aesthetically (confirmed good) but got the same gradient-name + `HeaderIconButton` treatment
  on all 3 of his top-right icons (bell/refresh/close), incl. swapping the outline bell for solid per the
  header-icon standard. Justin flagged the icon boxes still feel slightly off but couldn't pin down why on a
  first look -- parked, not chased further this session.
- 2026-07-18 **Send Feedback modal shine + BUG FIX: Settings > Goals floating save bar had no frost.** The
  bar set `backgroundColor: chromeFill` directly with no BlurView underneath -- chromeFill is a translucent
  frost meant to sit OVER a blur (per theme.tsx's own note), not stand alone, so on Light/Slate the bar read
  as see-through with scroll content bleeding through (Justin screenshot, 2026-07-18). Fixed by copying
  profile.tsx's proven BlurView + chromeFill-overlay recipe verbatim. Also: Send Feedback's 3 type pills +
  Send button got ButtonShine, and the Otto notification panel's per-card titles (+ group category label)
  are now gradient.
- 2026-07-18 **Settings page gradient pass** (MembershipCard's "You're a Supporter"/"Support the Mission" --
  shared with Profile so both pages get it free; all 12 borderLeftWidth-accent-line sub-section titles
  across the page in one sweep: Fitness/Nutrition Goals, Coaching Mode, Faith Journey, Active Calorie
  Accuracy, Heart Rate Zones, Workout History Import, Definitions, Tips & Guides, Tutorials, Prayer,
  Feedback; Quiet Hours/How Many Per Day/Water Reminders titles + their time boxes; the 5 Advanced
  notification titles + their time boxes; the 3 macro goal computed values (grams-in-ratio / kcal-in-fixed)
  + both Total rows -- the % and gram INPUT boxes themselves stay flat, can't gradient a live TextInput's
  value without breaking editability, no precedent for it anywhere in the app; Vacation Mode's calendar
  month header, +/- stepper icons via a new local icon-gradient helper, the day count, and both duration
  date-range lines; ButtonShine added to every selected pill/tile on the page that was flat-tinted before
  (Burn Accuracy, HR Zone model, Workout Import range, Daily Cap, notification category pills, Water Count,
  Weight Frequency, IF Window lead time, Streak Protection offset).
- 2026-07-17 **Faith tab gradient pass** (Bible and Plans card incl. amber color fix on plan/devotional
  names, Gratitude Streak Card's flame + hero number using a new local icon-gradient helper + AnimatedNumber's
  built-in `renderValue` hook -- week dots intentionally left flat, too small to read as gradient; Prayer
  page's "Need prayer? Ask us"; every Plans-page reading plan + devotional title; Devotional page title,
  both bottom buttons, plus fixed their genuinely random vertical spacing to an even 12px; Today's Message
  curated-verses toggle recolored blue-to-amber via a new optional `accent` prop on the shared ToggleSwitch,
  every other toggle in the app is unaffected). Skipped gradienting the devotional reflection QUESTION on
  purpose -- those are full sentences that wrap 2-3 lines, the exact banding case reverted on EvR earlier.
- 2026-07-17 **Stats tab gradient pass** (At a Glance, Comparison incl. preset chip shine + G/oz baseline
  fix, Day/Weekly/Monthly Summaries on both the Stats-tab cards and the 3 dedicated summary pages incl. the
  shared hero score donut, the archive + inline calendars, Trends bottom-row stats, Records' 4 hero tiles,
  Streaks numbers, HR Zones, Body Measurements card/page/history + About Body Fat % and Card Fields modal
  workups, every Achievement name + the 4 Daily Goal tiles). Reports intentionally pinned/skipped -- Justin
  wants a separate pass on that one later, it is 1118 lines of distinct block types.
- 2026-07-17 **Day Detail modal gradient pass** (basically every value: Day at a Glance, Sleep, Recovery,
  Workout, per-meal food names/calories, all 6 Advanced Nutrition categories, journal entry titles, the
  date header) plus the Home + Log water-log entries lists (+/- oz), Weight modal (starting weight +
  history), and the Macros modal's 4 preset cards (icon + name).
- 2026-07-17 **Workout Library gradient pass** (exercise/program/routine list names + 1-line safeguard,
  trophy+PRs header button, All PRs modal) and Workout tab's exercise names (gradient while active, flat
  once checked off). Also fixed a real, app-wide **ModalHeader bug**: any modal wrapping its content
  container in `alignItems: 'center'` collapsed the shared title to a sliver, since `ModalHeader`'s own
  root View had no explicit width and inherited shrink-to-fit sizing instead of stretch -- found via
  recipe-log's "Add to Which Meal?" picker rendering with no visible title at all. Fixed at the component
  level (`alignSelf: 'stretch', width: '100%'` on ModalHeader's root), protecting every other modal that
  uses it, not just this one call site.
- 2026-07-17 **Tooltip system gradient + amber-for-Faith fix, then a full title/modal gradient sweep
  across the app** (Bible, Journal, Settings, Workout + Workout Library, Add Food, Log, Home, Mission,
  What's New, Diagnostic Report insight cards, and ~10 standalone modals -- Day Summary, Prayer Request,
  Add a Prayer, Body Measurements' How to Measure, Summary Ready, Manage Streaks, BibleStartGuide,
  NotificationPanel, both disclaimer modals). Real bugs found and fixed along the way: Journal's New Entry
  handle didn't close the sheet at all (no handler wired up), Workout's rest/hold timer chips sat behind
  the tab bar (stale pre-refresh offset) and one had a `flex:1`-on-GradientNumber bug that made its number
  invisible, add-food's "Use a Saved Food" tray was translucent + doubled-up top border (now opaque,
  matches View All Achievements), and the IF card's Window time was overflowing off-screen (fixed the row
  layout) plus its duration-preset pills were rendering a bespoke purple text token used nowhere else in
  the app. Established rule from this pass: the gradient technique bands visibly across 2+ line wraps, so
  it's title/number/short-label only -- never applied to a sentence that can wrap. Full story in archive.
- 2026-07-17 **Log tab numbers pass (Section 2)** -- IF card's hero times, Jump to Date's month name,
  Nutrition Goals' 6 presets (icon + label), Food Library's food name (added a 1-line safeguard first) +
  calorie amount, AI Estimate's per-item and total calorie/macro numbers (food item names deliberately
  skipped, per Justin's call, to avoid the truncation tradeoff), New/Edit Recipe's full Total Nutrition
  card (every value including extended nutrients), and Food Detail / Edit Entry (same screen, two modes)
  -- main food name, 3 macro values, and the Logged/Last Logged/Avg Serving boxes. Full story in archive.
- 2026-07-17 **Title accent-gradient fill shipped app-wide** (every page/modal/tab title) -- new
  `GradientTitle` component, six tuning rounds on device (diagonal->vertical, 2-stop->3-stop, luminance
  scaling, lift/dark split, Yellow-specific floor), Yellow dropped from Blush's accent list after proving
  the mustard problem wasn't the gradient at all. Header "?" icon gradient still open. Full story in archive.
- 2026-07-17 **Add Food's food list had zero bottom clearance, Otto's disc sat on the last row/FatSecret
  footer.** One screen, not two -- it's titled "Food Library" in browse mode and "Add to [Meal]" when
  logging to a slot. Fixed with the same `insets.bottom + 96` pattern already used on Achievements/Prayer.
- 2026-07-17 **All six tabs now cascade on first open, tab-mount stutter fully closed.** Started as one
  TestFlight complaint, ended up touching Workout, Log, Stats, Faith, Profile, and Home -- each gated
  behind its own loaded-state (or given a straight cascade where no gate was needed) and revealing its
  content as one staggered wave instead of popping in. Caught and fixed two real bugs along the way (a
  false "No exercises yet" / "No data yet" flash, and a hook-order crash), plus killed a redundant Profile
  section. Tab-switch fade itself: left as-is, Justin's call -- the original complaint was the mount, not
  the fade. Full story in the archive.
- 2026-07-17 **Profile's Water Presets section REMOVED** -- redundant with the water gear icon on Home/Log,
  which already fully edits the same `pj_profile.waterPresets` value; Justin had been on the fence on this
  living on Profile for a while. Removed the JSX only -- the `waterPresets` field stays untouched in
  Profile's type/initial-state/load-merge, since `saveProfile` writes the WHOLE profile object with no
  read-then-merge; dropping the field from state would have silently erased Home/Log's saved presets on
  the next Profile save. Otto's knowledge base + its markdown mirror + tutorial_system_spec.md all updated
  same session, appCompanion redeployed. Not added to Settings (Justin's call, agreed): already reachable
  from two contextual spots, a third path just adds sync surface for a low-frequency setting.
- 2026-07-17 **THE BUTTON-TEXTURE THREAD IS CLOSED (both halves): chip/icon-button top shine AND the molded
  PrimaryCTA rollout.** Verified in code 2026-07-17, not in the roadmap's own bookkeeping: ButtonShine is in
  38 code files, PrimaryCTA in 41. The roadmap had been lying on both for a day-plus -- the shine item listed
  a "REMAINING" line sitting directly above the "GROUP 2 IS DONE" line that had already swept those same
  screens, and the molded item still claimed "~4 CTAs, ~13 remain" after the 07-16 mold sweep. Two dead
  sub-items also cleared: the PrimaryCTA row-height bug (faceStyle handles it at the call site; no sighting
  since -- the glow wrapper still stretches while the face keeps its natural height, so if it EVER recurs fix
  it inside the component, but do not go hunting) and the "no circular PrimaryCTA variant" (the round FABs --
  "+" discs, Otto, Halo -- got `components/FabDome.tsx` instead, which is the better answer). Stragglers get
  caught by eye during the gradient pass; Justin's call, and the catalog greps were wrong 4x for 4x the cost.
- 2026-07-16 **Onboarding All Set -- THE ONBOARDING RE-SKIN IS COMPLETE (all 6 steps + sign-in + All Set).**
  Ground + glow in the mode colour, frosted top + footer, molded PrimaryCTAs ("LET'S GO" / "WE'LL SET IT UP
  FOR YOU" -> mixed case), headline textShadow killed, subtext + tip bodies to Type.voice off textMuted, tips
  card onto the theme shadow. "Set it up myself" stays an OUTLINE on purpose -- two molded buttons stacked
  and neither reads as THE action.
  >> **THE MODE ICON IS GONE** (MODE_ICON barbell/leaf/heart + its 68px box). Justin: "remove that stupid
  leaf icon". It read as clip art and cost real height on the one screen that should feel like ARRIVING, not
  like another form. The mode already speaks via the accent colour + its own headline.
  >> **OTTO NOW LEADS THE TIPS CARD.** He self-introduces with a one-time callout on Home
  (components/AssistantOverlay.tsx: "Hey, I'm Otto"), but a user who never taps him never learns what he is
  -- naming him here is what makes that callout land. Copy deliberately does NOT promise "anything, anytime":
  free accounts have an AI cap. The old tips 1 + 2 ("Stuck on anything?" -> (i)/(?) and "Need a refresher?"
  -> Settings > Help) were the SAME tip twice (both "where to look things up") and merged into one row.
  >> ⚠️ **CompanionFAB.tsx IS *HALO*, NOT OTTO** -- the FAITH companion (gold disc + cross, hidden entirely
  for Not Right Now). Otto is `components/AssistantOverlay.tsx` + AssistantFAB/AssistantChat, bottom-LEFT,
  never faith-gated. Do not confuse them again.
  >> Explainer sync CHECKED (rule: same session): tooltipRegistry.ts, data/tutorials.ts and Otto's KB
  (functions/src/assistantAppKnowledge.ts) never described the Commitment screen or the step count -- the
  only hits are the WORD "commitment" in unrelated copy. Nothing went stale, nothing to redeploy.
- 2026-07-16 **Onboarding steps 5 + 6 (Apple Health, Notifications).** Ground + glow in the MODE's colour,
  frosted top + footer, molded PrimaryCTAs with real disabled states (both were all-caps slabs faded to 0.7
  while "connecting"), titles' textShadows killed, subtitles to Type.voice 15, cards off hardcoded black onto
  the theme shadow, and every `textDim` line raised -- incl. "Maybe later", which is one of only TWO ways off
  each screen, and Apple Health's read-only line (the reassurance that earns the permission).
  >> HEADER ICONS NOW FLOAT TOP-RIGHT (heart, bell). Stacked above the title they cost ~75px of height for
  one decoration and pushed the card onto the footer; a ROW with the title steals width and forces the title
  down to 34, which breaks **the one thing every screen in this flow shares: the title's size and left edge**
  (Justin caught that -- "every page's header title is in the same spot and now we're changing it"). The
  corner is dead space beside a short first line, so the icon rides there free. Use this for any future
  header icon. The bell RINGS (9deg decaying swing + a 2.4s rest; wider reads as sliding, no rest reads as a
  fire alarm) -- same idea as the existing BeatingHeart.
  >> Step label standardised to 9px/ls3 on ALL screens (I had bumped 4 + 5 to 11). Rule: SECTION names grew
  to 11 because you hunt for them mid-scroll; the STEP label sits in the same spot on every screen and never
  needs it.
  >> Notifications: the two small-print paragraphs under the card merged into ONE line (two sizes, two
  centred blocks, two halves of the same thought). **The "Weekly and monthly recaps" row is HONEST -- checked
  services/notifications.ts: pj_weekly_summary fires Sunday, pj_monthly_summary on the 1st, per-mode copy,
  deep-linked, gated on categorySummaries. Justin suspected it was never built; it is.**
- 2026-07-16 **Onboarding step 4 (Faith Journey) polished INSIDE its own dark world.** It is the only dark
  screen in an all-light flow (and does not match the app's own light+amber faith pages either) -- KEPT
  dark deliberately: it is the one moment of gravity, and embers rising read as incense. Frosted top + footer
  hand-built DARK (theme.chromeFill/tint="light" would lay two milky bars across the dark room), molded amber
  PrimaryCTA with a real disabled state (was a hand-dimmed 0.3 slab), subtitle to Type.voice 15/66% (was 13px
  Onest at 38% -- the interface face, whispering), and every dim value raised: unselected card copy 28% -> 50%,
  the "change this anytime" note 20% -> 45% (invisible).
  >> **THE EMBERS HAD NO FIRE.** The screen was DARKEST at the bottom and 26 embers rose out of pure black --
  the only screen in the app running "light rising from below" upside down. Added an amber glow along the
  bottom edge: now they come off something.
  >> SHINE ON THE SELECTED CARD: Justin pushed, I built it, he called it -- too much. The shine system's own
  rule already said so ("SELECTORS get selected/unselected STATES, not gloss") and the card already BREATHES
  (2s pulsing amber border). Selected is now an OPAQUE amber fill (was amber at SEVEN PERCENT -- the border
  was doing all the work) + that pulse. Note left in the file: do not re-add.
  >> The disclaimer line fell under the footer / off-screen depending on the pick -- a FIXED frame holding
  content that changes size (the verse only appears once you choose, and the three verses differ in length).
  Scrolling was rejected ("not enough to justify it"), so it now fits on a tight budget: title 52 -> 44, card
  padding 18 -> 14, tighter gaps + verse block. **Worst case is Not Right Now (2 Corinthians, the longest
  verse); a longer verse than that breaks it again.**
  >> LEFT ALONE: dead `verse`/`verse2`/`ref` fields on FAITH_OPTIONS that nothing renders (a separate VERSES
  map does the work) and that contradict each other -- Rooted pairs the Jeremiah text with the Colossians
  ref. A trap for whoever edits verses next.
- 2026-07-16 **THE COACHING MODE NOW COLOURS THE FLOW, LIVE + Commitment CUT + the step count made honest.**
  Tap Discipline on Your Style and the page repaints orange on the spot (glow, title, bar, pills, graph,
  calorie number, disclaimer modal, CTA); Mindful -> green; and Apple Health, Notifications and All Set
  carry it. FAITH JOURNEY IS EXEMPT BY JUSTIN'S CALL -- it keeps its amber; faith identity outranks mode.
  >> I PUSHED BACK ON THIS AND WAS WRONG. I argued a mode-coloured flow "teaches a lie the app doesn't
  keep" -- from memory of CLAUDE.md, without opening the code. all-set.tsx ALREADY ends the flow with
  setAccent() derived from styleMode, so the mode colour IS the accent the user walks away with. The
  recolour is a live preview of their app, not a costume. **Justin's instinct beat my reasoning-from-memory
  twice in one hour** (see the 'green' trap below). Read the code first.
  >> THE 'green' TRAP, DO NOT "FIX" IT: in the light theme the accent whose ID is `'green'` is LABELLED
  "Blue" (#1a44c2). all-set granting Balanced accentId 'green' is CORRECT. I called it a bug off the ID.
  Colours now live in `utils/modeAccent.ts` with this documented. Fixed on the way: the mode cards and
  all-set were painting hand-picked LOOKALIKES (balanced #2563eb vs the real #1a44c2, mindful #059669 vs
  #0d9268) -- the colour you tapped was a near-miss of the colour you got.
  >> PREVIEW COULD NOT SHOW IT: Your Style's preview branch returns before the pj_settings write, so
  downstream screens read the OLD stored mode and stayed blue. Fixed with an in-memory sessionStyleMode set
  on Continue in both modes and preferred over storage downstream (preview still writes NOTHING). Also
  fixed the Mindful COPY on Notifications, wrong in preview for the same reason.
  >> **COMMITMENT SCREEN CUT.** Corny (three vows all opening "I will" -- a wedding-vow cadence) and, being
  Discipline-ONLY, it broke the counter: Balanced/Mindful went step 3 -> 5 and never saw a 4. Flow is now a
  uniform 6 steps. Faith Journey and Apple Health were ALSO still saying "of 8" with bars on a different
  scale (faith: "5 of 8" at 70%) -- neither number was true. All six now honest: 17/33/50/67/83/100%.
  >> Your Style also got: the targets disclaimer (inline line + first-use modal on a 700ms delay so it
  stops landing mid-transition), bottom padding over the CTA, and "I'm Ready" killed for plain "Continue".
- 2026-07-16 **Onboarding screen 3 (Your Style) + the frosted top bar on steps 1-3.** Ground + glow, frosted
  footer, PrimaryCTA mixed case, opaque+shine selected states (the 3 mode cards keep their OWN colours),
  9 lifestyle/training boxes bumped 12/10 -> 13/11, macro ratios colour-coded P/C/F, pace pills out of a
  hidden horizontal scroller into a 3x3 grid, step relabeled 4-of-8 -> 3-of-7, every dim label off textDim,
  section names 9px/ls3 -> 11px/ls2 (they dissolved into the page when scrolled).
  >> **THE PROJECTION GRAPH WAS LYING.** The engine is a flat deficit -- a STRAIGHT line -- and the chart
  drew an ease-out bezier: a plunge flattening into a plateau the math never predicted. Rebuilt as THE FAN:
  every pace drawn from the same origin to the same goal weight, alternatives as hairlines, yours solid, so
  slope = pace and the x-axis is pinned to the gentlest pace's clock. Dead space became the trade-off itself.
  Weight gridlines + dated x labels; NO vertical rules (you read a VALUE off a weight rule, only a POSITION
  off a time one -- the label already gives it, the rules were furniture). Goal date is now the card's
  HEADER with a rule under it: as loose SVG text it read as floating because it WAS floating, and every
  in-plot position collided with either a gridline, "Today", or a tick.
  >> Also: Done bar over the decimal-pad (the one iOS keyboard with no return key -- both weight fields were
  dead ends). Footer stays DOWN when the keyboard opens; riding it put Continue over the field being typed.
  >> GOTCHAS BANKED: an InputAccessoryView binds to ONE input -- two fields sharing a nativeID means the
  second silently gets nothing, so one ID per field. `{value} LBS BY` inside SvgText is TWO text runs and
  textAnchor="end" anchors each independently -> glyphs stack into mush; interpolate before it reaches
  SvgText. letterSpacing was NOT the cause (a wasted fix).
- 2026-07-16 **THE PAGE SWEEP -- EVERY PAGE IN THE APP.** Tab by tab, Justin's order, pages only (modals
  excluded by his call). Each screen got the glow + real per-theme card shadows. LOG: add-food, food-detail
  (incl. Edit Entry), recipe-builder, recipe-log, ai-meal-estimator. WORKOUT: workout-library (which IS
  "Add to Today" -- same file, different title in select mode; the tab pushes nowhere else). STATS: day/
  weekly/monthly summary, the EvR pair, the reports pair, challenges, challenge-create, comparison-report.
  FAITH: prayer, devotional (bible + plans already had the amber glow). SETTINGS: support, whats-new,
  adaptive-target, mission, tutorials, definitions.
  >> STRUCTURAL FIXES FOUND ON THE WAY (not paint):
  - **The REPORT is now a document.** Its blocks were cards floating on a mystery slab; the slab was an
    EXPORT ARTIFACT (a `bgPrimary` wrapper painted so the share-image had a solid background) that was
    invisible only because the page used to be the same colour. Justin: "why are achievements earned and
    challenge history their own separate cards? this is disgusting." Now ONE white document card, blocks are
    SECTIONS with hairline rules, disclaimer inside. The export gets a real document instead of a screenshot
    of boxes.
  - **Two pinned "save bars" that were not save bars.** Reports' New Report and Challenge Create's Start
    Challenge both wore the floating-save-bar chrome (opaque block + top border) permanently -- that pattern
    is for a contextual save that animates in when there are unsaved changes. Both are create actions with
    nothing pending. Moved INTO the scroll; the glued block and the Otto collision died together. (Justin
    on the FAB alternative: "stupid to have a fab for literally one thing. 2 clicks for no reason.")
  - **AI estimator: "Possibly not included" onto a card.** It was the only naked content on a page made of
    cards -- and it is the AI telling you what it MISSED, i.e. the thing you most need to read before
    logging. Darkening the text would have treated the symptom.
  - **Recipe Log:** ingredients onto a card; the amount input MERGED into the nutrition card (they were one
    interaction split across two surfaces -- you type an amount, the thing below tells you what it IS, and
    the answer's own title just echoes the question back). Macro row was top-aligned with Calories at 32px
    and the macros at 22, so the small numbers floated high -> bottom-aligned, shared baseline.
  - **Sleep gear Save** was a flat green slab with NO dim state -- and its handler's first line is
    `if(!bed||!wake) return`, so with a time missing it looked live, took the tap, fired a haptic and did
    nothing. Molded + disabled.
  - **"End challenge" was unfindable** (Justin: "took me forever how to see how to cancel a challenge") --
    the only way to cancel, rendered in textDim, the dimmest token in the app, unstyled. Now red + semibold.
  - **Otto clearance** on recipe-log, weekly, monthly, comparison, report (content clears the FAB, never the
    reverse -- Otto is bottom-left on EVERY screen, so moving him on one page breaks the other thirty).
  >> Also: opaque selected states wherever a control sits on the page (challenge-create's 9 pills, the
  estimator's portion chips, recipe-log's toggle, report's Done Adding Blocks); red trash cans; molded
  Got it buttons; Recovery purple + the recovery coach sparkle off the GREEN status colour (green means
  "good" -- a neutral AI marker wearing it implied your recovery was fine regardless of what the coach said).
  >> SYNCED-WORKOUTS DID NOT NEED ANY OF THIS -- it is a dev tool behind the 7-tap Dev Tools section, and I
  polished it because it showed up in a grep and I never asked what it was. Anything under Dev Tools is out
  of scope; Settings' whole dev section got the same wasted treatment.
- 2026-07-16 **THE CARD SHADOWS WERE NEVER RENDERING. APP-WIDE. HALF-FIXED -- SEE NEXT UP.** Root cause:
  a shadow and `overflow:'hidden'` on the SAME view. iOS masksToBounds clips the view's own shadow, so the
  shadow silently does not exist at any opacity. `components/GradientCard.tsx` ALREADY carried the rule in
  its header ("Never put overflow:'hidden' on the card (kills the shadow)") and it had been violated
  everywhere. Consequence: since the visual refresh, NO Home/Log/Workout/Stats card has had a shadow, while
  the whole design leans on "cards float on SHADOW not value-contrast" -- Justin spent weeks tuning ground,
  glow, halftone and grain to buy depth that was being deleted. Also means every cardShadow/cardShadowOpacity
  token was NEVER visually validated. FIXED: Settings (shadow -> a `sectionShadow` wrapper; the face keeps
  overflow for the collapse clip) + all 13 HOME cards. 11 of those needed no wrapper at all -- their only
  reason for overflow was the 130px corner watermark, so a new self-clipping `CardWatermark` (in
  GradientCard, same trick as ButtonShine/FabDome) clips the icon and the card keeps its shadow. The 2
  carousels (Sleep, Coach Insight tips) got the wrapper -- Justin's call, and correct: the shadow rides the
  static parent, the carousel clips inside it. Coach tips card was ALSO on a hardcoded black @0.12 -> theme
  token. Device-verified 5 themes: Light/Slate/Warm/Blush all read right. DARK CANNOT: its shadow is black
  on a near-black page -- unfixable by any number, and unnecessary (its cards have real value contrast). If
  Dark ever wants depth the tool is a light TOP rim, not a shadow. Warm/Blush cardShadowOpacity 0.18/0.16 ->
  0.30 (cream-on-cream had no value edge). ALSO FIXED, same session: Log's water card, Stats' 4 cards,
  Workout's REST DAY + SUPERSET group, Faith's Bible-and-Plans + Prayer cards, GratitudeStreakCard,
  MembershipCard (Profile + Settings). NOT DONE: the modals + the stack screens, see NEXT UP.
  >> **FIVE WAYS A SHADOW GOES INVISIBLE. All five found on 2026-07-16.** (1) overflow:'hidden' on the same
  view. (2) overflow:'hidden' on a PARENT (journal) -- a clip eats its children's shadows too. (3) shadowColor
  + shadowOpacity set but NO shadowOffset/shadowRadius (log's AI-estimator card) -- iOS then draws a
  zero-radius shadow at zero offset, hidden exactly behind the card. (4) offset 0,0 (the faith cards) -- a
  HALO, not a lift; it rings the card and elevates nothing. (5) **the shadow was simply never written**
  (synced-workouts, body-measurement-log, food-detail's nutritionCard, ai-meal-estimator's 4 cards). #5 is
  the one that matters most: nothing is broken, so NOTHING finds it -- not a grep for overflow, not a grep
  for '#000'. Those cards read fine for months because Light's OLD grey ground (#e3e6ee) gave a white card
  enough value contrast to survive without one; brightening the ground to #f2f3f7 took that away.
  >> SO: **there is no search that proves this work is done.** The only reliable check is opening a screen
  and asking "does every card here have a theme shadow?". Justin has caught several after I called it
  complete (Gratitude, the earned badges, the log-measurements cards, the Promise card). Expect more.
  >> TWO MORE WAYS A SHADOW GOES INVISIBLE, both found the same session: (a) Log's AI-estimator card set
  shadowColor + shadowOpacity but NO shadowOffset/shadowRadius/elevation -- iOS then draws a zero-radius
  shadow at zero offset, i.e. hidden exactly behind the card. It was styled fully inline and never inherited
  those from styles.card. (b) A shadow with offset 0,0 (Faith's cards) is a HALO, not a lift -- it rings the
  card and elevates nothing, which is why Today's Message still read flat after the fog was dialled out.
  >> ROOT PATTERN -- and the reason this will happen again: EVERY card hand-rolls its own shadow (5 props,
  copied per card, dozens of times). That is why we found FOUR different failure modes in one session:
  hardcoded black, wrong opacity, missing offset/radius, clipped away. `components/GradientCard.tsx` is
  the canonical card and even STATES the no-overflow rule in its header -- but of the 12 files that touch
  it, nearly all import only `CardWash` and hand-roll the body. GradientCard's OWN shadow is hardcoded
  '#000' @0.12, so migrating to it today would make cards WORSE. `components/IFCard.tsx` had already
  diagnosed and correctly fixed this bug on its own (its comment: "rounded corners or cast a shadow, never
  both"). The knowledge existed in the codebase twice and cards kept getting built broken anyway. Backlog
  item filed: centralize the card shadow.
- 2026-07-16 LIGHT: THE BRIGHT-GROUND FALLOUT. Brightening Light's ground (#e3e6ee -> #f2f3f7, see the
  SURFACE PASS entry) fixed the pages and quietly erased everything sitting ON them, because the app leaned
  on value contrast it no longer had. Two fixes: (1) `bgInput`/`bgInset` #f5f5fa -> **#e9ecf3**. Those are
  ONE shared paint behind every text field, option row, stat tile and pace pill -- and #f5f5fa vs the
  #f2f3f7 ground is the same colour to the eye, so all of them dissolved (worst at the TOP of a page, where
  the bottom glow has faded and the ground is brightest). It was also BACKWARDS: an input is a WELL and must
  read as carved INTO the page (darker); #f5f5fa was LIGHTER, which is what a raised object does. Every
  other theme already had its inset darker than its ground -- Light was the outlier. (2) `borderInput`
  0.12 -> **0.20**: with almost no fill difference left, the outline was carrying these boxes alone and at
  12% black it could not. Profile's 3 estimate tiles + the Projected box had NO border at all (fill only) ->
  given the standard 0.5 outline. Light only; the other 4 themes untouched.
  >> THE FILL WAS REVERTED the same day (#e9ecf3 -> back to #f5f5fa) and the round-trip IS the lesson: the
  deepening was only ever compensating for a border too weak to be seen. Once the border was fixed, the dark
  fill was redundant AND wrong -- on a page made of white cards, "slightly darker than the ground" also reads
  as "obviously darker than every card around it", so an input became a grey HOLE punched in the page
  (Justin, on the AI estimator's Meal Name field). **If these ever go faint again, reach for the BORDER, not
  the fill.** The borderInput 0.20 bump stayed.
- 2026-07-16 **THE RULE THAT MAKES THE GLOW SAFE** (earned the hard way, ~6 separate failures). Every single
  "the glow broke this" report today -- the faith sort chips, Profile's fields, the achievements disclaimer,
  the estimator's portion pills + its "Possibly not included" list -- was NOT a glow problem. Each was
  CONTENT SITTING NAKED ON THE PAGE, or a control that was see-through. The glow only exposed what was
  already the weakest thing on the screen. Two rules, and no screen needs a glow exception:
    1. **Text content goes on a CARD.** The page is atmosphere, not a reading surface.
    2. **Controls get an OPAQUE fill** (accentBlueBgOpaque / accentAmberBgOpaque / bgCard). A control has to
       be a solid object you can press, not a tint over a glow.
  Corollary Justin tested directly: the glow looked FINE on add-food / food-detail / recipe-builder, which
  are forms too -- because they are covered in cards, so the glow only shows in the gutters. It failed on the
  AI estimator, which had naked content low on the page. It is not "forms vs not"; it is naked vs carded.
  When a screen fights the glow, the screen is telling you something is naked that should not be.
- 2026-07-16 Home weight card "LOG" button touched up (Justin gym-find): the NUMBER face (Type.num, built
  for data values) was doing button-label duty in shouty caps with letterSpacing -- same straggler class as
  Profile's save bar -> Interface bold, mixed-case "Log". Fill moved off `theme.bgSelected` (the SELECTION
  token -- theme.tsx's own note says a button is not selected) onto the house tinted recipe + ButtonShine.
  Dim/disabled state kept. Workout's inline "Add Exercise" got a NEUTRAL card shadow (0.7x opacity, tight
  2/6 blur): tier-2 tinted buttons carry no shadow app-wide, but beside the molded View Summary at equal
  height "one floats, one is glued down" read as inconsistency, not hierarchy (Justin). Deliberate exception
  -- the ranking now comes from solid+accent-glow vs tinted+quiet-shadow, not depth vs none.
- 2026-07-16 FAITH CARD FOG (Dark). Both faith cards (Home's FaithTodayCard + the Faith tab's Today's
  Message) wore an amber halo at shadowOpacity **0.85** with offset 0,0 -- radiating evenly on all four
  sides, so the card's edge dissolved instead of ending. Invisible-ish on the pale themes; on Dark a fog.
  Worst on the Faith tab's card, which SKIPS the warm wash on Dark and so had only the halo to define it.
  Diagnosis: the halo was doing two jobs (say "faith", draw the edge) and was bad at the second. Now 0.32
  (in line with real card shadows) + a 1px amber border (rgba(212,134,10,0.45)) draws the edge on both.
  Also fixed: ReadingPlansCard's 130px book watermark sat in a bare absoluteFill box with NO overflow and
  NO radius -- it spilled straight past the rounded corner -> CardWatermark; its hardcoded black shadow ->
  theme token.
- 2026-07-16 SURFACE PASS (partial) + LIGHT GROUND BUG. Prayer/Bible/Plans/Devotional (amber glow) +
  Settings (accent) converted off the old top-down gradient to the flat ground + BackgroundLayers. FOUND ON
  THE WAY: **Light's `gradientEnd` was still the PRE-refresh grey #e3e6ee** while bgPrimary had been
  brightened to #f2f3f7 -- and gradientEnd is the token the flat ground actually paints, so every Light
  screen (all 6 tabs included) was painting the old grey. The two are meant to match. Card-dense screens hid
  it; the sparse faith pages exposed it. Light `glowStrength` 0.60 -> 0.45 (tuned against the old grey; on
  the brighter ground it drowned anything sitting on the page, not on a card). New `accentAmberBgOpaque`
  token (the amber twin of accentBlueBgOpaque) for faith controls that sit ON the page inside the amber
  glow: the Plans sort chips (selected was a 14% amber wash over amber = mud; unselected were literally
  'transparent') and Devotional's "Reflect with Halo".
- 2026-07-16 COACH VOICE PASS. The voice face was on HOME ONLY (6 lines). Now every surface where the coach
  SPEAKS wears it: Sleep + Recovery coaches, Day/Weekly/Monthly Coach Insight, the EvR report (insight box +
  each card's claim/insight/lever -- but NOT the proof, which is a number and stays on the data face), and
  Otto + Halo's reply bubbles (the USER's bubbles stay interface -- that contrast is the point). All four
  Coach Insight boxes dropped their italic to match Home's (and a fake italic on a face with no italic cut is
  how the Fontshare bug bites).
- 2026-07-16 ROUND FAB DOMES + fixes. All 10 circle FABs got the home-button dome (crown gloss -> soft dark
  foot) via a new self-clipping `components/FabDome.tsx`; Halo's is hand-built in SVG from the same 4 stops
  (keep in sync BY EYE). The "+" FAB accent DISAGREED app-wide: stats/journal/body-measurements were on
  accentBlueRaw (near-fluorescent on Blush+Yellow, swallowing the white "+") vs accentBlue elsewhere -> all
  accentBlue; body-measurements' 58px disc -> 56. Prayer's "+" wore the PAGE gold (#d4860a) next to Halo's
  #e8a020 -> now imports HALO_GOLD like bible.tsx. Warm + Blush `tabBarInactive` were a light tan / pale rose
  on their own pale bars (unreadable) -> each theme's textMuted, same root as the Slate hidden-icons fix.
  Water custom-amount modal: 9px muted caps label -> a real 20px Clash accent title; flat tinted Add -> molded
  PrimaryCTA with a dim/disabled state (it had none).
- 2026-07-16 ROUND FAB DOME PASS -- all 10 circle FABs. New `components/FabDome.tsx` carries the home tab-bar
  button's recipe (crown gloss -> neutral middle -> soft dark foot) to the 8 "+" discs (Workout, Stats, Add
  Food, Workout Library, Bible auto-scroll, Prayer add, Journal new-entry, Body Measurements) + Otto. Halo is
  drawn in SVG so her dome is hand-built from the SAME 4 stops (keep in sync BY EYE -- noted in both files).
  SELF-CLIPPING, not overflow:'hidden': these FABs wear their shadow on the disc itself and masksToBounds
  would kill it (the home button can only clip because its glow sits on a wrapper). Fixed on the way: the "+"
  FAB accent DISAGREED across the app -- stats/journal/body-measurements were on accentBlueRaw (near-
  fluorescent on Blush+Yellow, swallowing the white "+") while workout/add-food/library/Otto were on the
  button-safe accentBlue; all now accentBlue. Body Measurements' disc was 58px, the lone odd size -> 56.
  Deliberately untouched: the FAB expand-menu pills (stay flat) + empty-state tinted icon circles (not
  buttons). Also: Prayer's "+" wore the PAGE gold (#d4860a) next to Halo's #e8a020 and the two never matched
  side by side -> now imports HALO_GOLD like bible.tsx (Halo's gold = the one source of truth for a faith
  FAB). Prayer's black drop shadow LEFT ALONE (Halo has a breath-glow instead, so they still differ there --
  Justin's call, revisit if it reads heavy). Device-verified on Light/cyan: all 10 domes look right.
  STILL PENDING: the other 4 themes x accents.
- 2026-07-16 FLAT-BUTTON MOLD SWEEP (round 1) + fixes. Molded the flat solid-accent buttons found by reading
  (not grep-guessing): Stats "Add to Stats" (both spots), Workout tab "Load to N Days" (the TWIN of the
  library one), Day Score "I Understand". "Add Food modal Save" turned out a DEAD unused style (no live
  button). Also this session: the (i) TooltipModal title moved off the number font to Clash; Otto Notifications
  "Done" -> molded; Log Measurements page: "How to measure" restyled to the tinted View-All-Achievements button
  + added top padding + registered the save bar so Otto lifts above it, then bumped bottom padding so Otto
  clears the Body Fat card. HONEST GAP (see NEXT UP): the flat-button sweep only covered the main tabs +
  Add Food + Day Score; the deeper stack screens were NOT exhaustively scanned yet.
- 2026-07-16 GUIDED TOURS (Toolkit) popup converted to the standard ModalHeader: dropped the redundant
  "___ TOOLKIT" eyebrow, killed the top dead space, title now on Clash (was the number face), gained the
  standard handle + X. Faith tab's copy now wears AMBER (title, play icons, top edge) like the rest of Faith;
  other tabs stay accent. Removed dead TAB_LABELS + old header styles. (ToolkitSheet.tsx.) This closes one of
  the hand-rolled modals from the modal-header scan.
- 2026-07-16 STYLE/SETTINGS/PRAYER button + font sweep (Justin gym-pass findings). Coaching-mode switch popup:
  title moved off the number face to Clash + "I'm In"/"Switch" is now molded PrimaryCTA. Settings Goals save
  bar: background now the frosted chrome (Light; other themes unchanged, no blur yet -- flag), "Save Goals" ->
  molded PrimaryCTA, "Cancel" off the shouty caps to mixed-case interface. Vacation "Start Vacation" -> molded.
  Prayer Request "Send" + Add Prayer "Add/Save" -> molded amber. Prayer Action popup: added a Prayer/Answered
  Prayer header, boxed the floating prayer quote, "God answered this" -> molded (warmer/lighter gold #d4860a not
  the dark brown accentAmber, slightly shorter -- Justin's pushback).
- 2026-07-16 FAITH "BIBLE AND PLANS" CARD -- Browse buttons unified. The two columns showed different
  affordances side by side (empty column = boxed shined amber button; under-cap column = flat "+ Browse" text
  link), which read sloppy. Now BOTH render the same boxed + shined amber pill with a "+" icon (PlansColumn in
  faith.tsx), matching the "Find something to read" button above. Dead browseLink/browseLinkText styles removed.
  DECISION (same review): Coach Insight "INSIGHT" pill stays FLAT -- it's a status label (tone-colored:
  INSIGHT/POSITIVE/URGENT/PATTERN), not independently tappable (the whole card opens EvR), so shining it would
  break "shine = tappable" and compete with the card's real CTA. Justin agreed.
- 2026-07-16 GYM AUDIT, button touchups (2 items). (5) Assign Tags modal (workout.tsx) CONFIRM was still a
  GREEN tinted button -> molded PrimaryCTA "Confirm" (green now means success/goal only). (6) Load Routine
  day-picker (workout-library.tsx) "LOAD TO N DAYS" was a flat painted solid-accent slab -> molded PrimaryCTA
  "Load to N Day(s)", mixed case like every other button. Both keep their disabled/conditional logic + toast.
  NOTE flagged, not touched: the Assign Tags modal is still a hand-rolled centered card w/ fade animation (not
  the ModalHeader + spring standard) -- belongs to the separate ModalHeader sweep.
- 2026-07-16 GYM AUDIT, FAB batch (4 items). (1+2) Otto FAB padding: sleep.tsx + achievements.tsx scroll
  paddingBottom -> `insets.bottom + 96` so the bottom-left disc stops covering the last card (achievements was
  a flat 40 with no inset). (3+4) Halo FAB added to the faith pages that lacked it: plans.tsx + prayer.tsx get
  the standard CompanionFAB + CompanionChat (general Halo; on prayer it sits bottom-left, bottom-aligned with
  the gold Add FAB on the right); devotional.tsx already had a MANAGED per-day Halo thread but no floating FAB,
  so a CompanionFAB now reopens that same thread (option A, Justin's call). Otto is already hidden on all three
  via AssistantOverlay's HIDE_SEGMENTS, so no double-FAB. Halo's tier gate still hides it for Not Right Now.
- 2026-07-15 [DATA-LOSS BUG, FIXED] **Edit Food from the Edit Entry route zeroed 26 nutrients.** Log > a
  logged entry > Edit Entry > Edit opened the Edit Food modal with every extended field BLANK, and Save
  wrote `parseFloat('') || 0` into all of them -- fiber, sodium, cholesterol, vitamins, minerals, silently
  wiped on a real saved food. CAUSE: the Edit button shows on `food.isMyFood`, but the modal fills from
  `food.myFoodData`, and those DISAGREE -- only add-food.tsx attaches myFoodData (via a myFoods.find
  lookup). Cals + the 3 macros survived because they alone have an `|| src.existingCal` fallback; the 26
  extended fields have none. The SAVE had the same fault (`_source.myFoodData || _source` fell through to
  the entry, so the row match ran against the wrong id). FIX: food-detail resolves the My Food itself
  (`resolvedMyFood`, same lookup add-food does) and both the load and the save use it. Read-only, no writes
  added. Justin found it with two screenshots after I told him it was "not a bug, just a scroll" -- I had
  read the field list in code and never checked whether it gets FILLED.
  >> ROOT PATTERN: DUPLICATED MODALS. There are TWO Edit Food modals (add-food + food-detail), TWO Add
  Exercise (workout tab + workout-library), TWO Jump to Date (log + day-detail), TWO Create Custom Streak
  (real + tutorial replica). Every one cost a round tonight, and this one cost real data: one copy got
  myFoodData wired, the other did not. Cross-reference comments are now on each pair. The REAL fix is to
  de-duplicate -- Justin asked "cant we just delete the broken one and point to the correct one?" and that
  is the right question; it needs a proper diff of the two, not a guess.
- 2026-07-15 FAITH IS AMBER, END TO END. Faith tab header + Prayer + Plans + Devotional + BIBLE (all 49 of
  its accent refs) now wear amber; faith MODALS already did. `ScreenHeader`'s `color` prop now drives the
  BACK CHEVRON as well as the title (it was title-only, which is why amber titles sat over cyan chevrons);
  6 screens were passing `color={accentBlueRaw}` = the DEFAULT, i.e. no-ops, and those props were removed
  so their chevrons keep the button-safe accentBlue (on Blush+Yellow the raw value is #ffe600 -- invisible).
  `HeaderIconButton` gained optional color/bg/border (defaults unchanged). Bible's scroll FAB now imports
  Halo's GOLD instead of theme.accentAmber (they disagreed side by side; bible.tsx had its own hand-copied
  '#e8a020' too). SKIPPED: Journal (has non-faith content, Justin's call) + Mission (opened from Settings/
  Sign-in, it is the APP's mission page; amber would flag it as the religious page).
- 2026-07-15 THE FAITH TAB WAS PURPLE. The whole tab read "so many fonts/colours" and it was ONE wrong HUE:
  all three cool text tokens are purple on Light (textMuted #6666aa, textDim #9999bb, textSecondary
  #4a4a6a), and every label on a warm amber card used them. Fixed with a 3-rung WARM INK LADDER in
  faith.tsx (`faithInk` / `faithInkBody` / `faithInkMuted`), mirrored + `faith`-gated in
  GratitudeStreakCard so HOME IS UNTOUCHED. The middle rung is the point: with only ink+muted, body text
  had to pick a headline colour (prayers -> dark, read heavy) or a label colour (the verse -> cool navy).
  Also: Faith CARDS now match normal cards on Light/Slate (bgCardFaithGlass was cream @0.62 while normal
  cards went opaque 0.82 in the Light refresh -- Dark/Warm/Blush already matched, which is exactly the 3
  themes Justin liked); Browse buttons off a near-white fill (the one case gloss truly cannot show);
  "None yet" -> "No devotionals yet"; both verse REFS now amber (one was purple); Lora rule settled =
  SCRIPTURE ONLY, and a Bible book name ("Proverbs 16") counts, a plan name ("The Gospels") does not.
- 2026-07-15 BODY-BUTTON SHINE, group 2 first pass: workout-library (Fill from Preset, Load Program, Load
  Routine, USE) + add-food/food-detail (Retry, Use a Saved Food, Create Food for this Barcode, Add x2, Edit,
  -/+ serving steppers, Replace). Skipped-with-reasons list + the honest re-run of the catalog (~23 real
  candidates left, NOT the 92 I first quoted) live in the NEXT UP item. Also KILLED a rule I had written the
  same morning: "shine scales with area" predicted full-width buttons would go plastic; workout-library's
  full-width Load Program/Load Routine took the default gloss and Justin liked them. Plastic comes from
  REPETITION, not width -- it was DON'T-OVER-GLAZE in disguise.
- 2026-07-15 STACK-SCREEN HEADER SQUARES -> HeaderIconButton (catalog sweep group 1). Bible's hand-rolled
  header (star/book/gear) + Add Food's two (sparkles/barcode) now use the shared component, so stack screens
  stop disagreeing with the tabs. Bible's back chevron DE-BOXED (ScreenHeader's rule: a tinted box reads as
  an ACTION, Back is the way out) and its "?" pulled out of its box (bare icon, not a tappable square). Add
  Food's were hand-built 38x38 w/ 22-24px icons -> now the standard 32 box. Also shined: Bible's Mark Read
  pill, the Achievements EARNED badge (a non-tappable badge -- "shine = tappable" knowingly bent, Justin's
  call). Barcode is the ONE deliberate exception to filled-only + 14px: filled bars merge to a grate at 14,
  so it stays `barcode-outline` at 18 (box still 32). Verified: Bible + Add Food tutorials still land (refs
  moved onto wrapper Views).
- 2026-07-15 REPEAT-A-MEAL MOVED INTO THE TRAY (started as "shine + DE-NEON", became a placement fix). The
  Repeat/Pick-a-Day pills got the house tinted recipe + ButtonShine, but the real problem was that a fresh
  morning put 2 pills on every empty slot (~10 buttons yelling) and the repeat SHORTCUT out-shouted the `+`
  that is the row's actual primary action. Pills now live in the EXPANDED slot; the collapsed row carries a
  muted "Expand to repeat a meal" scent line in the blank subtitle slot. Tooltip + tutorial (3 modes) + Otto
  KB updated & redeployed; What's New left alone (historical note, Justin's call). Full detail in archive.
- 2026-07-15 WORKOUT-TAB SURFACES. HR Zones (x2) + Tags got ButtonShine. Day-scroller shadow REGRESSION fixed
  (those tiles borrow card shadow tokens; our Light cardShadowOpacity 0.20->0.30 bump + a 0-radius hard shadow
  made them look harshly outlined -> now cardShadowOpacity*0.5 + shadowRadius 5 + offset y2 = soft float).
  Effort tiles (1-10): subtle gloss on the SELECTED (solid-fill) tile only. Added `solid` flag to ButtonShine
  -- solid-colour fills (same in both themes) carry a real reflection on Dark (0.40) instead of the tinted-
  button softening (0.14) that was starving them. OPEN on workout tab: day-scroller selected/unselected STATE
  redesign held for Justin's eyes (shadow fix may be enough).
- 2026-07-15 BUTTON TOP-SHINE (tier-2 tinted buttons). New `ButtonShine` primitive (white crown gloss, inset
  1px self-clipping so NO overflow:hidden -> no clipped top corners; softer on Dark unless `solid`) +
  `HeaderIconButton` component. Rolled to: all 5 tab-header icon-squares, Library pills (Log/Workout), `+ Log`,
  the 8 water quick-add buttons, and (this session) HR Zones/Tags + the selected effort tile. Established the
  3-TIER button system: MOLDED (solid PrimaryCTA) / SHINED tinted (tier-2, ButtonShine) / FLAT (passive).
  Learned: white BEVEL top-border vanishes on light bg (reads "cut off") -> border stays accent on all 4
  sides, shine does the top-light; shine near its width limit on very wide buttons (watch for "glass strip");
  gloss is invisible on white/near-white FILLS (selectors' unselected states) -- but NOT on a 10% accent tint:
  that mis-read cost a round on 07-15 (the header squares use the tint recipe and shine fine). OPEN rollout:
  the nuanced IF selector + tappable at-a-glance tiles (design as SELECTORS not buttons),
  the day-scroller/effort SELECTOR-TILE state pass, and a catalog sweep for scattered tinted buttons (bible,
  food library, reports, achievements, stack headers).
- 2026-07-15 HOME-CIRCLE REDESIGN. Tab bar home button: ACTIVE = accent circle + white house icon; INACTIVE
  = white (bgCard) circle + accent-coloured house icon (the colour-swap, reads clean on the frosted-white
  bar -- no dark-scrim dim). BOTH states get a GENTLE dome: one full-width crown-gloss -> soft dark-foot
  gradient (NOT a clipped specular oval, which read as a "pill"). Rejected on the way: glossy orb (strong
  mould + 0.60 specular + lift = out of place in a flat app). This dome/top-shine recipe is the template for
  the CHIP / ICON-BUTTON TOP SHINE pass next.
- 2026-07-15 SLATE CHROME + STATS HIERARCHY + TEXTURE TUNING. Slate got the frosted chrome (chromeFill
  rgba(233,239,248,0.45), kept low/glassy so it reads steel not white) + readable inactive tab icons
  (tabBarInactive #5a7088, fixes the "navy icons hidden" complaint). Stats collapsible sections: subtitle
  bumped to textSecondary + uiMedium (was faint textMuted/regular), section headers 11->13 bold-caps to
  restore hierarchy, hairline divider 55->88 alpha. Background texture: halftone dots 0.14->0.20 and now
  ACCENT-COLOURED (was textPrimary ink -- experiment, Justin approved; revert to textPrimary if ever gaudy
  on Dark/bold accents), film grain eased 0.03->0.02 light / 0.022->0.015 dark. OPEN still: Profile subtexts
  (same faint-muted pattern as Stats had), broader Slate text-contrast audit.
- 2026-07-15 LIGHT THEME REFRESH + UNIFIED FROSTED CHROME. Light stopped looking grey: brighter neutral ground
  (#e3e6ee -> #f2f3f7), pure-white opaque cards, stronger navy card shadow (0.20 -> 0.30) so cards float on
  SHADOW not value-contrast. New per-theme `glowStrength` token (Light 0.60, others 0.40) uncorks the shared-
  constant compromise. New per-theme `chromeFill` token applied to the tab bar AND all 6 tab headers so top +
  bottom chrome read as one frosted-glass surface (Light rgba(255,255,255,0.65); others 'transparent' =
  unchanged). `tabBarInactive` token fixes faint inactive tab icons (Light #9999bb -> #6666aa) -- same root as
  the Slate hidden-icon complaint. Day Detail HISTORY badge now a small centered pill. Light-only; other 4
  themes untouched. OPEN: home-circle restyle + extend frosted chrome/icon-contrast to Slate.
- 2026-07-13 MONETIZATION / "SUPPORT THE MISSION" **COMPLETE + DEVICE-VERIFIED.** The whole track: RevenueCat
  purchases (subscribe monthly/annual, monthly->annual upgrade, tips, restore), Supporter gates, the membership
  card with REAL dates (and "Ends on" not "Renews on" once cancelled), the gold system (SupporterFoil = the one
  source of gold), the gold app icon + gold splash + lapse guard, the thank-you webhook, Otto's free-user nudge,
  and SERVER-SIDE Supporter truth (Firestore as a cache, RevenueCat as the truth, so the AI caps can't be
  spoofed by a modified client). All 11 testers granted a free year. Three real bugs caught on the way: an
  out-of-order webhook that could have killed a paying subscriber's access; a lapse guard that only ran if the
  user happened to open Settings; and a promotional grant that emailed a fake $0 tip AND would have silently
  given granted testers free-tier AI caps. Detail: SPEC_monetization.md. Launch steps: LAUNCH_CHECKLIST.md.
- 2026-07-13 WHAT'S NEW Patch 3 written (Supporter, Repeat a Meal, weight history, fixes) + the page's patches
  are now COLLAPSIBLE (newest open, older collapsed) + the Supporter card wears the real gold foil hallmark.
- 2026-07-13 CALORIE FLOOR **TRACK CLOSED.** Core shipped 2026-07-08; the two remaining follow-ons turned out to
  be already done (pace granularity 0.25/0.75 shipped in Patch 2; the onboarding activity/training-frequency
  wording shipped 2026-07-10). The third ("activity nudge") was never specified and is redundant: the modal
  already has an adjust-activity button. Nothing left.
- 2026-07-13 GOLD APP ICON shipped: alternate iOS icon (Supporter-only toggle in Settings > Appearance), a
  pointer row on the Support membership card, the perk row now shows BOTH marks (badge + icon), the in-app launch
  splash follows the icon, and a lapse guard puts a lapsed Supporter back on the default. Made in CODE (a gradient
  map over the source's luminance), not by hand.
- 2026-07-12 [BUG FIX] EvR/home Coach Insight was rendering the deterministic FALLBACK instead of the AI voice.
  ROOT CAUSE: the coach tip's client-side timeout was 8s, too tight for the aiProxy round trip (Firebase cold
  starts + a large uncached rulebook prompt), so it timed out CLIENT-side and fell back even though the Anthropic
  call SUCCEEDED server-side. Fixed by raising it to 20s (utils/coachAI.ts), matching the feed voicer. NOTE: an
  EvR report SNAPSHOTS its insight at generation, so an old report never updates -- generate a new one to test.
- 2026-07-13 APPLE WORKOUTS IN THE EXERCISE LIBRARY **CONFIRMED BUILT** (the roadmap still said "build after the
  gym list" -- it was already done). workout-library.tsx groups Apple-synced sessions into browse entries with
  editable labels, per-key history, and sorting (utils/syncedWorkouts).
- 2026-07-12 MONETIZATION: RevenueCat purchase flow DEVICE-VERIFIED end to end (sandbox sub, tip, restore, and the
  LOCKED state all confirmed; a tip correctly does NOT grant the entitlement) + the THANK-YOU WEBHOOK shipped
  (functions/src/revenueCatWebhook.ts: emails Justin the buyer's name/email on a new Supporter or a tip, token-
  guarded, sandbox-flagged; all three paths verified). Also: EvR locked cards redesigned (WHOLE card frosted, topic
  chip, quiet per-card "Unlock ->"), purchase buttons got spinner/pending states, the Support CTA went premium, the
  Stats card buttons moved off the solid-blue slab onto the house tinted recipe, and the "SUPPORTER" gate CHIP was
  removed app-wide in favor of a lock icon (it read as a status badge you'd earned, not a requirement). REMAINING on
  the track: live priceString on the Support screen + the fuller Supporter-state screen (plan/member-since/renews-on),
  then the LAUNCH-ONLY reverts. Full detail + the pinned tester-entitlement sequence: SPEC_monetization.md.
- 2026-07-10 [BUG FIX, data-cosmetic] Over-precise gram weight in food-entry NAMES (e.g. "Italian Style
  Meatballs (113.33304999999999g)" from logging 1.3333 servings). Two-part fix: (1) DISPLAY: the Log tab meal
  rows now round the parsed gram/oz label via the shared utils/repeatMeal.tidyFoodName (>=3-decimal numbers ->
  1 decimal), which cleans EXISTING ugly entries too; (2) UPSTREAM: food-detail.tsx name-build rounds the
  gram/oz amount to <=1 decimal before storing, so NEW entries are clean (loggedAmount stays precise -> edit
  math unaffected). Pure JS, tsc clean (no new errors). Was the parked Food & Log backlog bug.
- 2026-07-10 WEIGHT HISTORY + STARTING WEIGHT SHIPPED (gear on the home Weight card; all 5 slices; device +
  8-check dev self-test verified; Otto deployed). Editable weigh-in history (edit/delete per day + back-dated
  "add a past weigh-in", today-or-earlier), starting weight = earliest weigh-in (tap to correct; an earlier add
  becomes the new start), read-then-merge on pj_<date>.weight so food/water are never touched, plausibility
  guard, Firebase sync, milestone recompute that GRANTS but never revokes badges, Mindful-neutral. Explainers:
  new 'weight_card' tooltip + card (i) + Otto KB. utils/weightHistory + 32 unit tests (npm run test:weight).
  Dev self-test in Settings is DEV-ONLY (added to REVERT BEFORE LAUNCH). Full post-mortem in archive; spec
  SPEC_weight_history.md.
- 2026-07-10 ONBOARDING training-frequency wording (dad feedback): screen 4 subline now reads "How often you
  actually train these days, not what you're aiming for. You can change it in your Profile anytime." (was "How
  often you do structured workouts"). Kills the aspirational-answer trap that inflated TDEE (training freq adds
  up to +400 cal/day). Copy-only, your-style.tsx. Lifestyle Activity + Profile field left as-is (decided out).
- 2026-07-10 [BUG FIX] Home Weight card "Total Lost" contradicted "vs Yesterday" (commit aea7aec). It computed
  earliestWeight - today, so a GAIN showed a negative number under a static "Total Lost" label (opposite sign
  from the +N vs-Yesterday stat) -- dad gained 187->188 but saw "-1 Total Lost". Now the label flips Total
  Lost/Total Gained by direction + shows the magnitude (agrees with vs Yesterday); Mindful = neutral "Total
  Change". Baseline unchanged (earliest LOGGED weigh-in; the earliest-vs-onboarding-starting-weight baseline is
  a separate open design question, NOT a bug). index.tsx, pure JS, tsc clean.
- 2026-07-10 REPEAT A MEAL + per-meal CLEAR ALL SHIPPED + device-verified (commit 016315d, pure JS). Re-log a
  previous day's meal-slot entries into the viewed day by exact-cloning (no saved object; photos/macros/extended
  nutrition carry verbatim, AI items safe). White-outline pills on empty slots ("Repeat Yesterday · N kcal"
  one-tap + "Pick a Day" picker), live-macro accordion modal w/ crossfade, destination always = launch slot.
  Clear all = quiet red link to wipe a whole meal in one confirm. utils/repeatMeal + 30 tests; explainers +
  Otto KB all updated/deployed. Full post-mortem in archive. Spec: SPEC_repeat_meal.md.
- 2026-07-10 WORKOUT TIMER RELOCATION + polish (Cengiz feedback: the full-width rest banner blocked
  scrolling/tapping between sets). Rest + hold timers now live in a compact TWO-ROW chip docked between the
  Otto and "+" FABs (left/right:90 clears both 56px discs; time+buttons row over a full-width centered
  label; fade in/out via Reanimated; thin 1px accent border -- blue rest / green hold; bigger Done). Also
  fixed: hold Done haptic (was silent -> Medium); double-timer overlap (a live hold owns the single slot so
  checking another set no longer stacks a rest; tapping the holding set's own check circle now acts as Done
  and logs the ACTUAL elapsed hold, so an accidental circle-tap does the right thing); edit-exercise TIME
  sync (option C -- editing a time exercise applies the new duration to un-done sets, silent when uniform,
  prompts "Apply to all?" only when un-done sets differ, finished sets never touched). Cut the hold +15
  (you don't tap mid-hold). Dev-verified (fade/haptics/layout/double-timer/prompt). OPEN TAILS: (a) 5-theme
  x accent audit (tested Light/cyan only); (b) release/TestFlight feel-verify; (c) PARKED optional -- a
  countdown hold could roll into overtime instead of auto-ending at the target (removes any need for +15).
- 2026-07-10 [PERF BUG FIX, dev-verified] Add-exercise cold-remounted the whole Workout tab. Picking a
  library exercise did router.push('/(tabs)/workout', {pendingExercise}) -> a PUSH spawned a brand-new
  Workout screen every time (full cold mount: June-carousel flash, empty exercises, default avatar, 5-10s
  first hydrate on release, and STACKED/leaked instances that slowed the app until a force-kill). router.
  navigate didn't dedupe to the existing tab either (still remounted). Fix = hand the exercise off via a
  pj_pending_exercise storage slot + router.back() (pops the library, reveals the still-mounted workout
  screen -> ZERO remount); the tab reads+clears the slot on focus to open the add modal. Same handoff
  pattern as recipe ingredients. Pure JS. Dev-verified (flash gone, exercises/avatar/carousel all persist).
  STILL OPEN (separate, smaller): the ~1s delay before the library screen itself opens; the focus-reload
  firing 11 setStates on every focus. Test on the next TestFlight build for the real speed feel.
- 2026-07-08 WORKOUT UNITS + TIME TRACKING (Cengiz feedback) SHIPPED, all 8 steps, HEAD 6e15e85. Per-exercise lb/kg (inline LBS-dropdown + Add/Edit modal, PR engine compares in kg / displays the unit lifted, volume tile splits Lbs/Kg) + Reps->Time holds (clock-style M:SS input, SetEntry.durationSec, HOLD-mode timer pill on the rest-timer foundation, hold presets flipped to Time) + longest-hold PR (PRRecord.bestDuration, duration = trophy / weight = context). Fully additive to pj_workout_state (missing unit = lb, missing type = reps, nothing converted). OPEN TAILS: (a) device-eyeball the newest time-box right-fill + blinking-cursor change (6e15e85), (b) explainer freshness for the TIME half (tooltip/tutorials/Otto KB). Full post-mortem in archive; spec SPEC_workout_units_and_time.md.
- 2026-07-08 RECOVERY "Prev. Activity" display fix (device-verified): the Day Summary + weekly/monthly summaries showed the RAW prior-day active calories (e.g. 832) instead of the burn-accuracy-adjusted value (666 at 80%) the recovery SCORE actually uses, so it disagreed with the day's own detail. Now all three multiply by burnAccuracyPct. SCORE was never affected (actScore is a ratio; both sides already adjusted). Sleep hub + home card were already correct (they read the adjusted score-result value). Day Summary is live; existing weekly/monthly snapshots need force-regenerate to update.
- 2026-07-08 NUTRITION under-logged gate (Day Score, item #8): a day with food but implausibly few calories (consumed < 50% BMR, or < 500 when BMR unknown) is under-LOGGED not genuinely low, so Nutrition now DROPS (dash) instead of scoring a fake clean calorie hit (Megan's 350-cal/915-target day scored 55/55). Skipped when diet excluded / no food. Weekly+monthly inherit it free (they null-guard). DAYSCORE_VERSION 4->5 so history recomputes once. Explainer line on both Day Summary surfaces (shared mode-aware copy) + a "This was my full day" override (per-day dietLogComplete flag, read-then-merge, recompute in place) that scores the day honestly if the user asserts it was complete. Dev tool "Seed/Remove under-logged test day" (writes only to an empty in-window date). Device-verified end-to-end. Mirrors Smart Tips' existing 0.5*BMR filter.
- 2026-07-08 AI ESTIMATOR FAVORITES fix (device-verified): favoriting an AI meal saved cal but 0 P/C/F (favorite-save read only FatSecret-shaped data, not the estimator's flat macros) AND re-logging silently name-matched a FatSecret product, snapping serving/macros/micros onto a meal the AI never produced them for (TWO name-search doors: openFoodDetail at nav time + food-detail's own resolveServings effect after mount). Now AI favorites stay pure to their estimate: real cals + big 3, no enrichment, gated on a persisted aiEstimated flag. Recents already excluded AI by design; My Foods save was already fine; non-AI stale-food name-search recovery untouched. ALSO shipped same session: AI foods now render as "1 serving" (not a bogus "Amount (g): 100"/"1g") by riding the existing serving-only recipe path -- one isServingOnly flag gated on aiEstimated feeds the synthetic serving + display/save branches, so non-AI foods are byte-for-byte unchanged; favorites get a 1-serving existing-value basis via mapFav. AND food-detail's save was dropping the aiEstimated flag, so a re-logged AI favorite lost its badge + serving display + name-search immunity -- now preserved on save. All device-verified (edit-entry + favorite re-log + serving stepper math + non-AI regression).
- 2026-07-07 CARDIO PRs in the View Summary recap (parity with lift PRs). Per-DRAWER records (activity type + indoor/outdoor, never lumped): today's best distance + duration vs the prior all-time best for that drawer -> lines in the SAME amber trophy block as lifts ("Outdoor Walking: New furthest 2.10 mi / New longest 42:15"), header counts lift + cardio. Bar = "beats prior best" so it's idempotent + self-healing (delete from Health -> recomputes). Calories excluded (noise). Apple-synced only (manual cardio lacks per-session history). New utils/syncedWorkouts.detectCardioPRs; detection on Finish via cached fetchSyncedWorkouts(365). ALSO: date (with year) added to the library RECORDS tiles ("SET" sub-row mirroring the AVG format). personal_records tooltip + Otto KB taught cardio records (deployed). Best pace + calories-as-PR PARKED with running (SPEC_apple_workout_library.md). Pure JS; device verify pending.
- 2026-07-07 SYNCED WORKOUTS perf + naming: (a) stale-while-revalidate cache (pj_synced_workout_cache, device-local raw sessions) so the Library's Apple entries paint on first frame instead of popping in after each native queryWorkoutSamples; (b) the Workout tab now labels Apple entries via syncedGroupLabel like the Library, so walk/run/cycle/swim/row split Indoor/Outdoor + a guarded retro-cleanup relabels existing bare-default entries in place (name is display-only for Apple cardio -- no PR/summary/dedup keys off it). Pure JS. Committed 4ffe93a.
- 2026-07-07 GYM LIST (Items 1-5 all shipped) + extras. (1) Modal keyboard overrun: Add/Edit Exercise + workout-library Add modals now height-cap the card between the safe-area top and the keyboard (internal ScrollView + flexShrink) so the top never crosses the Dynamic Island and Cancel/Save stay scroll-reachable; name fields got autoCorrect/spellCheck off (kills the autocorrect-highlight bleed); stats streak modal didn't overrun (just handle-to-top + double-dash copy fix). (2) Recipe Edit Entry: extended nutrients now forwarded from the entry's flat fields (food-detail already displayed them; log.tsx wasn't passing them) -- fixes old + new; serving-only recipes (no total weight) drop the bogus "Amount (g):100" for a working Servings stepper (nominal 1-serving unit, rescales nutrition, preserves "(N servings)" name on save), weight recipes still show real grams. (3) Library-food tap loading state (row dim + spinner while openFoodDetail awaits FatSecret). (4) Food library tabs reset scroll to top on switch. (5) Recipe ingredient hand-off: builder clears the shared pj_pending_ingredient slot on first focus so an abandoned add can't leak into the next recipe. EXTRAS: inline Add Exercise button beside View Summary (one row); FAB text-label pills got the 2px bgPrimary ring app-wide (14 pills / 5 files). All device-verified.
- 2026-07-05 Halo knows the reading plans + devotionals (discuss + recommend): Halo can now see the full catalog and (a) discuss any plan/devotional accurately when asked (what it covers, length, fit) and (b) proactively offer ONE when it genuinely fits a conversation, done SPARINGLY, engage-first, once per convo, tier-aware (lighter for Exploring), only real titles, "Need a word right now" set flagged for acute distress. Built the OTTO way (self-syncing, NOT hand-maintained): CompanionChat.tsx builds a compact catalog from the LIVE READING_PLANS + DEVOTIONALS data and sends it with every message; faithCompanion accepts it (6k cap) and buildSystemPrompt appends the static discuss/recommend RULES + the injected catalog (absent-catalog = old behavior, so version skew is safe). Rides in the cached system prompt (identical per app version). Deployed. Client is pure JS (reload). Tier-1 only: recs are verbal, NOT yet tappable pills (possible Tier-2 later). Optional future: include enrolled-state so Halo can say "pick Anxiety and Peace back up."
- 2026-07-05 [BUG FIX] Active-cal goal false pop (burn-accuracy race): the home active-cal goal could fire against UNADJUSTED calories because burnAccuracyPct defaults to 100 and loads async, and the goal-check effect neither waited for it nor depended on it (so an early HealthKit read at the default 100% fired the goal, then the display recalculated to the real 80%-adjusted number, e.g. raw 525 -> shows 420 but the 500 goal already popped). Fix: added a burnAccuracyLoaded flag (a bare value of 100 is ambiguous: real vs not-loaded), gate ONLY the active-cal goal check on it, and add burnAccuracyPct + the flag to the effect deps so it re-evaluates once the real value lands. Steps/water/exercise untouched. Already-banked false hits are NOT auto-reversed (the parked goal-un-cross problem). Possible parallel issue in the historical goal-day scan flagged for a separate look. Pure JS.
- 2026-07-05 Halo chat aesthetic port (matches Otto): Halo's chat now carries the same treatment as Otto's pass: theme gradient wash behind the chat (0.55 opacity, clipped to the rounded panel), MountFade fade+slide-up entrance on every bubble, STAGGERED typing dots (was a unison pulse), and an identity avatar left of Halo's messages (her GOLD CROSS, mirroring her header badge, the faithful translation of Otto's sparkle) with the old redundant gold left-bar dropped. Her bubbles stay gold-tinted (her identity). tsc clean. Pure JS.
- 2026-07-05 Achievement pop-on-action (workout + sleep): workout badges (First Workout, program/routine milestones) and sleep badges now pop the INSTANT you earn them instead of waiting for the next app-open. Added a force bypass to the once-per-day gate on checkWorkoutAchievements / checkSleepAchievements (mirrors the nutrition/momentum pattern), passed ONLY at genuine action sites: add/edit exercise + load program + save routine, and manual sleep save. App-open sleep sync + dev-tool checks stay unforced. Unlock is idempotent so a forced re-run can't double-pop. Food + streak badges already worked this way; this brings the last two in line. Pure JS.
- 2026-07-05 View All Achievements button (Stats): full-width VIEW ALL ACHIEVEMENTS button at the bottom of the Records section (trophy icon, accent-blue style, routes to /achievements) so the page isn't only reachable via the buried header trophy. Pure JS.
- 2026-07-05 Apple Health permissions via Otto: in-app "Manage in Settings" hotlink was KILLED (Linking.openSettings only reaches the app's generic iOS page, which has no Health row; iOS exposes no deep-link into the Health data-access screen). Resolved instead by fixing Otto's KB to give the correct manual route (Settings > Privacy & Security > Health > Project J, then toggle data types) and never point at the app's iOS page or the in-app Health section. Deployed.
- 2026-07-05 DECISION (card gradient wash): rollout stays PAUSED where it is. Gradients are applied where Justin wants them (home + summary surfaces via GradientCard) and the look is approved as-is. Do NOT roll it out further and do NOT touch existing gradient code. Removed from the active high-priority queue so it stops resurfacing as "what's next."
- 2026-07-05 EvR saved-reports list cleanup (quick win): the SAVED REPORTS list on the Effort vs Results screen rendered all up-to-15 reports as full rows (long scroll). Now shows the current + 3 recent loose, then a dropdown ROW ("N older reports" + chevron, styled like a report row for consistency w/ the Summaries dropdowns) that expands/collapses the rest. Chose a dropdown over month/week buckets deliberately: EvR reports are on-demand, deduped 1/day, capped at 15 and recency-matters, so month grouping would fragment into 1-report buckets and bury the newest. Storage was already 15-capped; display-only. Pure JS.
- 2026-07-05 Bedtime "Worth watching" contradiction fixed: the Bedtime metric status was computed on the FULL bedtime stdev (>60 min -> Variable) while the card DISPLAYS a trimmed 10th-90th percentile range, so one 2 AM night (already trimmed out of the shown range) could still flip the status to "Worth watching" -- a tight range with a scary badge. Now consistency is judged on the SAME trimmed span the card shows (bedHi - bedLo): <=60 min Consistent, <=120 Mostly steady, >120 Variable. Aligned the sleep-coach "steadier schedule" nudge to the same trimmed span + >120 threshold (was full stdev >60) so the coach can't contradict the row either. Removed the now-dead full-stdev computes. Tooltip "Bedtime consistency" is conceptual (no threshold cited) so it stayed accurate. Pure JS. (Bonus: no longer nags over a single late night -- a pattern flags, not one slip.)
- 2026-07-05 Summaries producer (Otto hub): when checkAndGenerateWeeklySummary / checkAndGenerateMonthly actually produces a fresh summary, it now drops a 'summary_ready' hub notification deep-linking to it (weekly = calendar/blue -> /weekly-summary; monthly = stats-chart/purple -> /monthly-summary; stable id per period so no dupes; silent on an empty week/month). Category + route-tap already existed in the hub. Dev seed ("Add sample notifications") gains a solo summary card to eyeball it today (real trigger only fires Sunday 5am+ / 1st 5am+). Awaiting real-trigger verify (Sunday/1st).
- 2026-07-05 Notification hub polish (2 quick wins): (1) solo (non-stacked) notification cards now cast the same shadow the collapsed group cards do, so they float instead of sitting flat (nested cards inside an expanded group stay flat on purpose); (2) Day Summaries archive month-grouping -- once past 8 weeks, weeks collapse under Month headers (newest month open, older collapsed); under 8 weeks stays a flat week list. Device-verified 2026-07-05 (shadows + threshold).
- 2026-07-05 Daily Goals card count fix: the card was showing the lossy real-time tally (pj_goal_hit_counts) that misses backfilled/edited days and never decrements, so it disagreed with the badge progress bars (water 34 vs 35, steps 10 vs 23). Now the card's COUNT comes from the shared historical recount (utils/achievementProgress.loadProgressValues, same source as the badge bars + Otto) so they can't diverge; extended that scan to also count active-cal + exercise-min goal-days (Home-screen thresholds; active falls back to caloriesBurned, exercise via effectiveExerciseMinutes). Tally kept only for the "Last earned" date label. Device-verified 2026-07-05. KNOWN MINOR (left on purpose): the transient goal-hit celebration toast still uses the live tally count, so it can flash 1 off the card; not chased (transient, not the persistent display).
- 2026-07-05 Otto chat aesthetic pass: the chat modal was the app's one flat-white surface, now on the theme gradient (rendered at 0.55 opacity over the sheet so it's a gentle wash, not the full page gradient; theme-safe softening). Plus staggered "typing" dots (were fading in unison), a fade+slide-up entrance on every bubble (MountFade), and a small Otto sparkle avatar left of his messages (dropped the redundant teal left-bar). Also fixed Otto refusing workout-ideas questions ("what's a good chest workout" -> "outside my wheelhouse"): training/exercise suggestions are explicitly IN his scope, so the system prompt now tells him to answer with real movements then bridge to building a routine in the Workout Library (deployed). (Markdown-strip on replies shipped earlier w/ dataset #6.) Device-verified 2026-07-05. Gradient is a one-number opacity dial if it needs nudging.
- 2026-07-05 Otto journal + prayer (on-demand dataset #7, LAST in the thread): new utils/companionJournal.ts attaches, ONLY on an explicit journal / reflection / gratitude / prayer question (deliberately NOT hooked to whole-day recall, so private content never leaks into "what did I do on X"), the user's own reflections (pj_bible_reflections: recent ~15 entries = date + category + title + ~240-char excerpt) + prayers (pj_prayers: active + answered w/ dates). PRIVACY-handled: faith-tier gated (a "Not Right Now" user gets prayers + faith journal categories withheld, personal journal only); entries excerpted not dumped; KB tells Otto to treat it gently/warmly, summarize themes not recite, never invent an entry, point to the Journal/Prayer screen for full text, and answered prayers are a tender moment. KB taught, deployed, wired into AssistantChat. Isolated tsc clean. Device-verified 2026-07-05. >>> This COMPLETES the Otto on-demand data thread (PRs, per-lift trend, recent workouts, food, sleep, body, achievements, journal/prayer). Only later-optional add: full per-metric streak tiles (needs the Stats streak engine extracted first).
- 2026-07-05 Otto achievements (on-demand dataset #6): new utils/companionAchievements.ts attaches, on achievement / badge / earned / goal-day messages, the user's ACTUAL earned set (pj_achievements, grouped by category + dates + ×count) AND live progress toward every badge family. Progress comes from the Achievements screen's OWN scan, extracted VERBATIM into new shared utils/achievementProgress.loadProgressValues (screen now imports it too = one source of truth), so Otto's "23 of 50 step-goal days" equals the screen's progress bar exactly. Flips the old KB rule ("you do NOT have their achievement data") -> Otto now answers "what have I earned" AND "how close am I to X" precisely. Device-verified 2026-07-05 (Well Worn "23 of 50, 27 more" correct). Scoped OUT: full per-metric streak tiles (Stats > Streaks = 200+ lines un-exported inline logic; logging streak already in snapshot, KB routes rest there). DELIBERATELY dropped the Daily Goals live-tally from Otto: it's a lossy real-time counter that lags the recount (water 34 vs 35, steps 10 vs 23), so Otto uses the recount everywhere (matches the badge bars); the tally/recount mismatch on the Achievements SCREEN is a separate app bug now in NEXT UP. Also fixed: Otto replies now strip stray markdown (**bold**/`code`) client-side in AssistantChat (Haiku ignored the plain-text instruction). KB rewritten, deployed, wired in. Isolated tsc clean. Remaining on-demand thread: journal/prayer entries (PRIVACY-sensitive)
- 2026-07-05 Otto body measurements (on-demand dataset #5): new utils/companionBody.ts attaches, on measurement / body-part / body-fat messages, the user's actual logged tape measurements from pj_body_measurements. Tier 1 CURRENT = each logged field's most-recent value (in their unit) + how long ago + "may be out of date" >30d + delta since first entry, plus latest Navy BF%. Tier 2 HISTORY = each session newest-first (date + field count + BF%). Uses the Body Measurements screen's OWN helpers so numbers match Stats > BODY exactly. Deliberately NOT weight (snapshot already has weight) and NOT hooked to isDayRecall (measurements are sparse, not daily). Trigger = field/measurement/BF word + ask/possessive. Full history (bounded 24 sessions / 4k chars), not 30-day windowed. KB taught (BODY MEASUREMENTS HISTORY entry under Stats > BODY), deployed, wired into AssistantChat. Isolated tsc clean. Device-verified 2026-07-05. Remaining on-demand thread: achievements/streak detail -> journal/prayer (privacy)
- 2026-07-05 Otto sleep + recovery history (on-demand dataset #4): new utils/companionSleep.ts attaches, on sleep/recovery or whole-day-recall messages, the user's actual logged nights last 30 days. Tier 1 = per-night line (sleep score, duration, deep sleep, + recovery score / HRV / RHR when present) via stitched loadWindowDays (matches app). Tier 2 = full stage breakdown (deep/REM/core) + all recovery signals (HRV/RHR/Resp/SpO2) for a NAMED night, from the raw day record. Reuses shared isDayRecall + resolveNamedDays (now exported from companionFood). Wearable-aware (explains missing watch data warmly). KB taught, deployed, wired into AssistantChat. Snapshot already has last night + 7-night avgs, so this fills a SPECIFIC past night / night-by-night trend. Device-verified 2026-07-05 (specific night, single metric, named-night stages, HRV, week trend all correct); fixed one bug: "last night" wasn't resolved to a date by the shared resolveNamedDays, so stage detail didn't attach for "sleep stages last night" -> now maps last night/tonight to today's wake-day record in the sleep builder. Remaining on-demand thread: body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 Otto food log history (on-demand dataset #3): new utils/companionFood.ts attaches, only on food / whole-day-recall messages, the user's ACTUAL logged nutrition. Tier 1 = per-day TOTALS last 30 days (calories, P/C/F, fiber/sugar/sodium, water), pulled via STITCHED loadWindowDays (offsets 0/14/28 -- its internal window is only 14) so numbers are IDENTICAL to the app's exclusion-aware math. Tier 2 = ITEMIZED foods per meal, only for a day the user NAMES (resolveNamedDays parses yesterday/today, weekday, "June 24", "6/24", "the 24th"); the only gated piece b/c food names are unbounded text. Oldest-first char-budget trim, [this week] marked, today partial. Snapshot already has today + 7d avgs, so this is for a SPECIFIC past day / day-by-day trend. Day-recall detector extracted to shared companionWorkouts.isDayRecall (both workouts + food hook into "what did I do on X"). KB teaches the block + routes past-day lookups to the LOG TAB date picker first (Stats/Home calendar backup). Wired into AssistantChat, deployed. ACCURACY FIXES (device-verified 2026-07-05): (1) carbs now shown NET (total - fiber - sugarAlcohols) when the user's showNetCarbs setting is on, so they match the Log tab's Today's Total card (was showing gross e.g. 225 vs card's 219); (2) itemized food list now attaches ONLY on a "what did I eat / foods / for lunch" LIST intent, not on a totals question -- fixes both a token-waste AND a Haiku bug where, given the item list, it re-summed and mis-stated the day total (said 1929 vs real 1899); (3) KB + block tell Otto to QUOTE the daily-line total verbatim, never re-add items, and answer a single-nutrient day question cleanly (no 7d-avg / "no itemized data" clutter). All 4 retests passed. Remaining on-demand thread: sleep history -> body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 Otto recent workouts (on-demand dataset #2): when a message is about recent training (what did I do yesterday / on July 2 / last chest day / on Monday, how a session went, "how many squat sets this week", frequency counts), utils/companionWorkouts.ts attaches a compact summary of the user's ACTUAL logged sessions over the last 30 days (newest first): per day = focus label + each lift's completed sets & top set + any cardio/walk/class/custom, days in the current week marked [this week]. Cardio & everything logged included (not lifts-only). Bounded by TIME + a ~7k-char budget trimmed OLDEST-first (no session cap -- 3-4x/day loggers never lose this week / yesterday). Wired into AssistantChat alongside the PR block; KB taught + deployed. INTENT filter is the whole game (took several passes): it now fires on the full "what did I do on [date]" phrasing, verb-less conversational FOLLOW-UPS ("what about July 2", "and July 3?", "how about Monday"), and short/bare date msgs -- earlier misses were all the filter silently dropping the message (never a data/builder bug). Bare whole-day "what did I do on X" answers the TRAINING from the block + points to Calendar for the rest (meals/sleep), and this is the shared day-recall hook future datasets plug into. KNOWN LATENT GAP (not yet fixed): the builder's lift branch needs manual done sets, so an Apple STRENGTH/CORE/FUNCTIONAL session (non-cardio, auto-checked, no manual sets) would be skipped -- fix = include any checked/completed exercise even w/o sets; do when a strength session actually exists to test against. Remaining on-demand thread: food log history -> sleep -> body measurements -> achievements/streak -> journal/prayer (privacy)
- 2026-07-05 AI-estimator mic HIDDEN: voice dictation was cut, so removed the "coming soon" mic button from ai-meal-estimator.tsx (description field now full-width, no dead half-feature shipping to testers)
- 2026-07-05 Otto workout history (on-demand, per-lift trend / meat-on-the-bone dataset #1): when the user NAMES a lift in a lift question, the conditional PR injection also attaches that lift's RECENT SESSIONS (last 8 top sets, newest first, via liftSessionHistory) so Otto can describe how it's trending ("185 -> 195 -> 205 over your last three benches"). Bounded to the named lift(s). KB updated + deployed. Next in this on-demand thread: recent-workouts B ("what did I do last chest day"), then food log / sleep / body / achievements / journal
- 2026-07-05 Otto PR data (conditional injection): Otto can now answer "what's my bench PR" with the real number. New utils/companionPRs.ts detects a PR question (generic PR words OR any of the user's own lift names/typo-tolerant) and, ONLY then, attaches the user's FULL history-backed PR list (heaviest set + est 1-rep max per lift, ghost-filtered) to that one request's data snapshot; costs nothing on unrelated messages. Otto does the fuzzy lift-name matching itself. Also attaches the user's full REAL-exercise list (live UNION of pj_exercise_library + every exercise in their programs/weekly template + PR'd lifts, re-read each message so custom / routine-quick-add / renamed exercises are always current) so Otto distinguishes a real lift with no PR yet ("Cable Press") from a made-up name ("Push Button") instead of implying it exists. KB guard updated. Deployed. Pattern to reuse for the other on-demand datasets
- 2026-07-05 Faith aesthetic pass: dropped the cream/eggshell CARD wash on the Faith tab cards (Gratitude, Bible & Plans, Prayer) + the Plans page card -> theme.bgCard so they match the rest of the app. WARM theme keeps its cream (needed so cards lift off its warm page); dark was already = bgCard (no visible change). Every amber accent stays (borders/icons/buttons/prayer boxes/verse ref). Today's Message + Faith Hub home base color untouched. Prayer page left as-is on purpose (its only cream IS the amber prayer boxes, which stay). Also removed the amber top-gradient on the Faith home card on DARK only (it muddied the top). Warm-theme + full 5-theme device audit still pending
- 2026-07-04 PR home polish: (1) ghost-PR fix: All PRs + per-lift Records now only show records backed by SURVIVING logged history, so a PR from a deleted workout no longer lingers (non-destructive display gate); (2) All-PRs card redesign to two value tiles (heaviest set / est 1-rep max) with date up in the header, tighter cards, taller scroll; same two-tile style mirrored in the detail Records section; (3) Otto route: added pr_home route key + client trigger + prompt so Otto's "where are my PRs" reply now shows a tappable pill to the All PRs list (deployed)
- 2026-07-04 PR HOME (records Piece B): Exercise Library gets a "PRs" button (top-right) opening an ALL PRs modal (per-lift heaviest set + est 1-rep max + date, sort Recent/A-Z/Z-A, tap a card into that lift); each lift's detail modal gets a "Records & History" section (records + session-by-session history, empty state when none). New utils/liftPR.liftSessionHistory + tests (26 total pass). Otto "New PR" card now deep-links here (openPRs param); Otto KB updated + deployed. Modals mirror the existing workout-library modal pattern exactly. Otto still does NOT get the user's actual PR numbers (see follow-up)
- 2026-07-04 PR wording + explainer (records #2): recap + Otto card reworded ("New heaviest set: 140 lb × 5" / "New estimated 1-rep max: 163 lb", identical in ALL modes, Otto card now 3 clean lines); new 'personal_records' tooltipRegistry entry (auto-lands in glossary) + (i) on the recap trophy card; Otto KB taught PRs/1-rep max (deployed). New standing rule in CLAUDE.md: every behavior change updates Otto's KB too
- 2026-07-04 PR revoke + honesty (records follow-up #1): PRs now DERIVE from logged history (new pure engine utils/liftPR.ts, 21 unit tests) instead of ratcheting-and-sticking, so unchecking/editing/deleting a set (or deleting the exercise) recomputes the lift's best and rolls back a record it no longer earns. "up from" now shows the true prior best (not a same-session intermediate). A protected floor keeps records with no surviving logged history (dev seed / deleted-program PRs). "View Summary" no longer computes PRs (one writer). Device smoke-test PASSED
- 2026-07-04 Otto PR producer (records, Piece A): lift PRs now bank the moment a qualifying SET is checked (not gated behind View Summary; partial sessions count) -> real "New PR" hub card (grouped, Mindful-aware) + recap trophy reads recorded day-hits. New pj_workout_state.prHitsByDay field (additive). Dev tool: "Seed lift PR baselines". Tests 1-3 PASSED on device
- 2026-07-04 Nutrition-achievement mis-timing fix: reverted the #2 force on the NUTRITION check (calorie-goal achievements only count COMPLETED days, so a same-day log can never complete one; forcing it popped legit past-day badges mid-meal). Momentum force kept. NOTE: nutrition check always scores history vs your CURRENT calorie/pace target, so changing your weight pace reshuffles the count (by design)
- 2026-07-04 Achievement pop-on-action timing fix: momentum + nutrition checks take a force flag that skips the once/day gate; food-detail AND recipe-log pass it after a log, so a same-day threshold pops now instead of a day late (idempotent, app-open unchanged)
- 2026-07-04 Bug fixes from Adaptive Target entry point work: adaptive-target.tsx bg (theme.bg typo -> theme.bgPrimary) + missing Stack.Screen headerShown:false (was showing double/raw-filename header); black title/header text -> dimmer tokens (matches app-wide header convention); Sleep Goal wheel picker now re-syncs to the saved value on Cancel; Settings > Goals floating save bar padding no longer cut off by home-indicator curve; Otto FAB now animates up to clear any screen's floating save bar (Settings Goals + Profile) instead of sitting under/blocking it -- new utils/floatingBar.ts signal
- 2026-07-04 Adaptive Target permanent entry point: "Check My Target" row in Settings > Goals, next to Auto-Adjust toggle, pushes to /adaptive-target for a live read of current status
- 2026-07-04 Notification-hub explainers: panel (i) tooltip + full interactive tour (modal-scoped spotlight inside Otto); Adaptive TDEE glossary tooltip + (i) on the Your Target screen
- 2026-07-04 Defect F: non-wearer coaching pivot (getWearState/isLikelyWearer + Recovery-tab whole-screen empty state)
- 2026-07-04 Adaptive TDEE (wearable Phase 2): scale-based real-burn estimate + suggested calorie target, weekly-gated, suggest-by-default via Otto hub
- 2026-07-04 Otto notification hub Phase 1: badge + bell + panel, achievement + daily-goal producers
- 2026-07-03 Otto knowledge base v2 FULL (deployed); UTC->local achievement-gate fix; Apple-cardio timestamp fallback; AI-estimator mic interim toast
- 2026-07-01 Security: all direct third-party API calls moved behind Cloud Functions (Anthropic proxy + FatSecret proxy)
- 2026-06-29 HR-zone bar snap-back fix; splash-flash fix; protein-pattern card copy; water delete/edit + bar-length + goal-hit fixes (pending fresh-build verify below)
- 2026-06-17 Recovery home card SHIPPED: two-face Sleep/Recovery carousel on the home screen (auto-cycles, homeRecoveryScore + activeSleepFace, write-once compute that mirrors the recovery freeze). This closes the "Recovery home card" high-priority track. Detail in git/archive.
- 2026-06-15 Metric drill-down system SHIPPED (Recovery first): tap any metric -> focused MetricDrilldownModal (what-it-is / how-calculated / what-affects / how-to-improve + per-metric 7/30d trend mini-graph); metricDrilldowns registry, wired on sleep + home + log. Closes the "Metric drill-down" track for the Recovery/sleep metrics. Detail in git/archive.
- 2026-06 (older shipped work: At a Glance makeover, empty-state audit + presence helper, wearable Phase 0/1, Today's Message overhaul, sleep-stages graph, comparison presets, reinstall auto-restore, etc.) -> see archive

---

## ⏭️ NEXT UP (THE single ranked work queue -- READ THIS TOP-DOWN whenever Justin asks "what's next")
Ranking IS the priority: [NOW] items are committed, do them first. Below them: active tracks, then QUICK
WINS. Items graduate UP here from the backlog sections so good ideas don't rot down there. When something
ships it leaves this list. Always offer at least one QUICK WIN when Justin asks what's next, and pull a
stale backlog item up now and then. The launch gates further down (REVERT BEFORE LAUNCH, LAUNCH BLOCKERS)
are separate pre-submission checklists, NOT part of this menu.
- 🧷 **SPAWNED BY THE OTTO / MONETIZATION / LIMITS PUSH -- THESE GO AT THE TOP.** Standing rule set by Justin
  2026-08-01: **anything that comes out of this push gets added to the TOP of NEXT UP, not the bottom.** They
  are side-findings, deliberately NOT folded into plan item C (none of them are about caps, and folding them
  in would mean C could not close until unrelated work shipped).
  • **[NEEDS A SPEC] A REAL data export.** The perks table sells "data export" as a Supporter perk and that
    row is technically already satisfied -- the only export in the app shares a REPORT as an IMAGE
    (`app/report.tsx`) and Reports are already Supporter-gated. But "you can share a picture of a report" is
    thin for a feature list. A true export -- the user's own logged data in a file they own (food log,
    workouts, weight, sleep) -- **does not exist at all**.
    ⚠️ Worth checking whether data portability is something the App Store or privacy rules EXPECT rather than
    a nice-to-have; nobody has confirmed either way, so do not assume it is optional.
    ⚠️ Do NOT gate the other three share-sheet uses while doing this: sharing a Bible verse and sharing a
    message out of either AI chat are not data export, and paywalling the verse share would be a bad look.
  • **[QUICK WIN] Colour the macro values in the Macros modal cards.** Each preset card shows "35P · 35C ·
    30F" as a dim secondary line. Justin's call: put them in the MACRO COLOURS (`theme.macroProtein` etc,
    already tokenised and already used this way in Settings > Goals), **normal weight, NOT dim**. Coloured
    VALUES, not dots -- five cards x three dots is fifteen new elements in a small modal for no gain.
    ⚠️ Watch two things: colour pulls those numbers forward and they sit UNDER the preset name, so check the
    name still reads as primary; and whatever the SELECTED card's active state does (accent fill or tinted
    border), the coloured text must stay readable on top of it. All five themes.
  • **[QUICK WIN] Macros modal should have its number fields inline, like Nutrition Goals does.** Nutrition
    Goals puts its editable fields right under the preset grid; Macros punts you to "Fine-tune in Settings >
    Goals". Making them consistent means macro editing happens where the presets are.
  • **[QUICK WIN] No way to EDIT a saved meal in the Meal Catalog.** The Meal Catalog (second tab in the Find
    a Meal modal, `RepeatMealModal.tsx`) lets you log a saved meal and DELETE one, but there is no edit and no
    rename. Rename is the obvious minimum; editing which items are in the meal is the fuller version.
    ⚠️ **Copy dependency:** the saved-meals wall modals deliberately say "log and keep" where the custom-foods
    and recipes ones say "log, EDIT and keep", precisely because editing does not exist. If this ships, update
    those two strings in SPEC_monetization.md -> WHAT THE USER SEES AT A CAP.
  ⚠️ The two macro-modal items above and item C's Custom-card work all touch the SAME modal. Sequence them;
  do not let three separate passes collide in one file.
- [ONLY THE QUOTA-COUNTER FEEL IS LEFT -- the cap change itself SHIPPED 2026-07-29, see RECENTLY SHIPPED]
  **Watch how the "5 messages left today" counter feels on Halo now that free is 10.** Both chats reveal the
  counter at 5 remaining (QUOTA_VISIBLE_AT = 5, AssistantChat.tsx + CompanionChat.tsx, kept in sync). The
  TRIGGER did not change -- but at a cap of 25 that landed 80% of the way through, and at 10 it lands at the
  HALFWAY point. Otto was already 10, so this is Halo-only.
  Justin's call: fine as long as it appears with 5 left. NOT a bug, do not "fix" it blind.
  ⚠️ The only reason it is worth watching at all is TONE, not maths: a countdown halfway through a help chat
  is nothing, but a countdown halfway through someone working out something heavy with Halo is the one place
  in the app where it can read as a hand on the shoulder pushing them toward the door. If it ever feels that
  way, drop it to 3 for Halo only. Judge it on device; do not reason about it from here.
- 🗺️ **THE PLAN (set 2026-07-29). READ THIS BEFORE PICKING UP ANYTHING BELOW.** Everything here ships
  BEFORE launch -- Justin's call, emphatically. There is no v1/v2 and no phase 2. Do NOT put version
  numbers, phases or time estimates in front of him; he decides what waits.
  ⚠️ NOTHING IS BUILT YET. Every item is spec-or-discuss first. He was clear: *"it needs to be specced and
  discussed and fully alligned before we fucking do it."* That applies to all of it, not just the routing.

  **A. ✅ COMPLETE 2026-07-30 -- ALL 6 OPEN OTTO ITEMS RESOLVED, plus the undereating-safeguard decision.**
     All of it was discussion, no code, exactly as intended. Full detail lives in SPEC_otto.md; the summaries
     below are pointers, not the source of truth. **B is now unblocked on this side** (it still waits on D).
     ➡️ Item A also SPAWNED new work: plan items **I**, **J** and **K**, three constraints on **E**, a hard
     prerequisite on **F** (allergies), a missing saved-meals cap in **C**, and a correction to **G**.
     Full detail in SPEC_otto.md -> OPEN ITEMS. Summary:
     1. ✅ RESOLVED 2026-07-30 -- **HARD GATE LOCKED.** Free users are never sent the snapshot or the 5
        gated attachments (PRs, workouts, food history, sleep, body measurements). Profile/goals, the
        exercise-name list, achievements and journal/prayers STAY FREE. Verified nothing else consumes the
        snapshot. Full write-up (7 attachments, 4 traps + the lapsed-Supporter one, free-tier voice, build
        notes for B, solo-tester test plan) is in SPEC_otto.md.
     2. ✅ RESOLVED 2026-07-30 -- **artifacts SURVIVE permanently**, on both downgrade paths (taste ending
        AND a Supporter cancelling). Nothing Otto built is ever removed, hidden or locked. The real output
        was splitting the caps: CONTENT (recipes / saved meals / custom foods) is grandfathered over-cap;
        LAYOUT (meal slots, stats cards) reverts to the free cap with the extras dormant. Meal-slot history
        was verified safe in code (entries store a slot ID; `slotNameCache` never shrinks; the app already
        ships this exact behaviour on manual slot deletion). Full detail in SPEC_otto.md.
        ⚠️ The exercise-library cap was deliberately held for question 3.
     3. ✅ RESOLVED 2026-07-30 -- **Otto may create exercises, but ONLY when the user asks, and never
        silently.** Asked for a routine with no movement named, he builds from the pool. Three-layer
        duplicate check (code-level name match, Otto suggests near matches, USER is the tiebreaker).
        The offer to add one is SUPPORTER-ONLY (otherwise he walks a free user into his own wall). He fills
        muscles (validated against the 22 real keys), instructions, tags and default sets/reps/rest, but
        NEVER a weight. Marked with one quiet line in the exercise detail: "Muscle map and steps added by
        Otto." Full detail in SPEC_otto.md.
        ➡️ Spawned THREE new plan items: **I** (exercise editor), **J** (expand the pool), **K** (lift-name
        aliases), plus three constraints on **E**.
     4. ✅ RESOLVED 2026-07-30 -- **the pitch rules.** Attribution ("on the free plan") in EVERY decline and
        it is NOT a pitch. Two triggers only: the user asks for more, OR their third wall in a conversation,
        with the APP counting the walls. Caps: one per conversation, three per rolling 7 days; the day-8 and
        lapsed explanations do not count. Entitled users are never SENT the pitch rules at all (structural,
        not willpower). ⚠️ Two build pitfalls recorded: `isSupporter()` returns false on lookup FAILURE so a
        Supporter could be pitched (pitching must default to silence and needs a third "unknown" state), and
        tier-dependent instructions must live in the VOLATILE prompt block or they split the cache and make
        Otto more expensive. Full detail in SPEC_otto.md.
     5. ✅ RESOLVED 2026-07-30 -- **meal-builder food matching.** MEAL builder, not a meal PLAN builder.
        Hard-gated from free. Candidates = favourites + logged 5+ times in 30 days; an inline chat GRID asks
        what they actually have (which is the only thing that solves "I ran out"); generics fill gaps and are
        marked as stand-ins; the CARD handles swaps so picking products costs no messages. Meal size derived,
        never asked. ⚠️ Allergies/dietary restrictions are a HARD PREREQUISITE and need a profile field.
        Full detail in SPEC_otto.md.
     6. ✅ RESOLVED 2026-07-30 -- **NEITHER becomes an Otto capability.** Both were about DOING something to
        the user's data, and Otto can only say things. **Protein timing badge: CUT** and deleted from the
        backlog (the 2-hour post-workout window is a dated idea; total daily protein matters far more, so a
        badge would reward something that is not true). **Calorie periodization: stays in the backlog as a
        FEATURE** -- its value is the app changing the daily target, and Otto can already talk about it today
        with zero build.
     PLUS ✅ RESOLVED 2026-07-30 -- the undereating safeguard: **BOTH, split by job.** Detection is
     APP-SIDE (deterministic, works on both tiers, hands Otto a one-line flag rather than reopening the
     data pipes). Otto is the ONLY voice -- no card, no notification -- and **he never speaks first**; he
     raises it only when the conversation already went near food, energy or the scale. Fires on GROSS
     intake (not net) under the modal line on 4+ of 7 QUALIFYING days (empty / excluded / vacation days do
     not qualify; minimum 5-7 logged days of history). Never asserts undereating, asks a question. Fixed
     app-supplied sentence + improvised lead-in. Full detail in SPEC_otto.md.
     ⚠️ Still needs a HOME in this plan (it is app-side code now, and it is NOT part of G): fold into B or
     give it its own letter.

  **B. OTTO FREE/PAID SPLIT** -- direction locked in SPEC_otto.md, prompt/KB work, small once A is done.
     ✅ **THE DATA GATE IS BUILT + DEVICE-VERIFIED 2026-07-31** (batch 2). Free users no longer receive their
     snapshot, PRs, workout history, food history, sleep or body measurements; achievements, journal/prayers
     and the exercise-name list still come through. Enforced on BOTH the client and the server. Full build
     record in SPEC_otto.md -> OPEN ITEMS -> item 1.
     ✅ **THE PITCH RULES ARE BUILT + DEVICE-VERIFIED 2026-08-01** (batch 3, commit f091d8c). Wall counting,
     the weekly budget, the once-per-conversation cap and the pitch itself all work. ⚠️ Read SPEC_otto.md
     open item 4 before touching any of it: **the instruction rides on the user's MESSAGE, not the system
     prompt**, and the label "PITCH REQUIRED" is duplicated across three files that must move together.
     Either mistake stops the pitch silently, with no error and no log line.
     ✅ **THE 2-EXERCISE CAP IS BUILT + DEVICE-VERIFIED 2026-08-01** (commits d29d9f9, cd4105b). ⚠️ Read
     SPEC_otto.md before touching it: the instruction is appended to the USER'S MESSAGE, not the system
     prompt, and moving it back silently loosens the cap.
     ✅ **THE DAY DETAIL JUMP BUTTON IS BUILT + DEVICE-VERIFIED 2026-08-01** (d9200fa, a12349f, 9eea7af).
     Opens as a CENTERED MODAL over the chat, never navigates. The APP resolves the date, not Otto. Full
     build record + the three bugs device-testing caught in SPEC_otto.md.
     ✅ **THE 30-DAY SUPPRESSION IS BUILT + DEVICE-VERIFIED 2026-08-01** (5bbde41). An explicit no (including
     "I can't afford it") silences the unprompted pitch for 30 days; if they ASK, he still answers in full.
     ⚠️ The watch instruction rides on the USER'S MESSAGE and only after he has pitched in that conversation
     (3/6 in the stable prompt vs 11/11 on the message). Build record in SPEC_otto.md.
     ✅ **THE PER-MODE DECLINE PASS: CLOSED 2026-08-01, NO VARIANTS NEEDED** -- a decision, not an omission.
     Mindful forbids calorie deficit maths, weight-loss framing and prescribed calorie/macro numbers; nothing
     in the free/paid work contains any of those (sets and reps are TRAINING numbers, and a price is not a
     macro). Justin's call on the one real question: a Mindful user still gets pitched, because that mode is
     about intimidating numbers, not about hiding that a paid tier exists. Reasoning in SPEC_otto.md.
     ➡️ **ITEM B IS COMPLETE.** Everything in it is built and device-verified. The one accepted leak (a third
     movement named on "back, bis, core and cardio") is logged above.
     🟡 **NEW, FOUND 2026-08-01, NOT URGENT BUT DO NOT LOSE IT: Otto points at days that predate the app.**
     Asked "what did I do the day after my birthday", he correctly worked out September 6, was honest that
     he could not see it, then said Day Detail "will show you everything you logged that day". It will not:
     that date is ~8 months before the app existed. He cannot know a day is empty because he cannot see the
     data. ➡️ **The fix is to tell him the EARLIEST date this user has data for**, so he can say "you started
     logging in May, there is nothing on September 6" instead of sending someone to a blank screen. It fixes
     the whole class (last Christmas, last January, any pre-install date).
     ⚠️ **The real victim is a BRAND-NEW USER**, not Justin: someone who installs today and asks "what did I
     do last week" gets pointed at empty days for their entire first week. That is a worse first impression
     than one odd birthday answer, which is the only reason this is written down rather than shrugged off.
     🟡 **ONE KNOWN LEAK, ACCEPTED 2026-08-01, DELIBERATELY LOGGED HERE SO IT IS NOT LOST.** The shape
     "back, bis, core and cardio" still names a third movement about 2 times in 3 (a passing "planks or
     carries for core", no sets or reps). Three-group and two-group asks are clean 3/3. Justin's call: accept
     for now, revisit if it grates in real use. ⚠️ **Do NOT restart with prompt wording -- six rounds already
     hit diminishing returns.** The next step is a deterministic counter that matches replies against the
     exercise library to MEASURE how often it happens for real users, then decide with numbers. Full
     reasoning in SPEC_otto.md -> KNOWN LEAK, ACCEPTED FOR NOW.
     ⚠️ `DEV_UNLIMITED_UIDS` currently holds Justin's uid for testing and MUST be emptied at launch, and the
     `[pitch]` diagnostic log line must come out (both on the REVERT BEFORE LAUNCH list).
  **C. NON-AI WALLS / PAYWALLS / LIMITS** -- ✅ **EVERY NUMBER LOCKED 2026-08-01** (walked one by one).
     ➡️ **SPEC_monetization.md -> NON-AI SUPPORTER PERKS IS THE SOURCE OF TRUTH. Do not read the numbers off
     this roadmap entry.** That table now also carries the per-row reasoning and the downgrade category.
     Free: custom foods 20, saved meals 5, recipes 5, **saved routines 5**, **saved programs 3**, exercise
     library 15, meal slots 5 (4 defaults + 1), stats cards 7 defaults + 1, macro/nutrition goals
     presets-only, no data export. Five grandfather on downgrade; meal slots + stats cards revert.
     ⚠️ **THREE THINGS WERE MISSING FROM THE OLD TABLE ENTIRELY** (saved meals, routines, programs) and two
     numbers were wrong. Anyone building from the pre-2026-08-01 table would take a meal slot away from every
     free user and cut the Stats tab to one graph.
     ⚠️ **ROUTINES != PROGRAMS.** A routine is a saved set of EXERCISES. A program is a saved 7-DAY SCHEDULE
     and carries NO exercises. The weekly template is the ONE live week (loading a program replaces it) and
     is not cappable. Otto had NOTHING about programs in his knowledge and invented rep ranges and
     progressions when asked -- fixed 2026-08-01.
     ✅ **PIECE 2 (what the user SEES at a cap) IS LOCKED 2026-08-01.** Full detail in SPEC_monetization.md
     -> "WHAT THE USER SEES AT A CAP". Headline: the ENTRY POINT goes dim with a lock (never the Save button
     at the end of a builder -- Justin: "dont make users do all the work just to not be able to save it"),
     it stays pressable, and EVERY tap opens the MODAL with a Support the Mission jump. **No toast, no
     seen-state, no first-time logic** (revised 2026-08-01 -- the modal-once-then-toast version is kept in the
     spec as a written-up FALLBACK, not deleted, in case every-time reads as too much on device).
     ⚠️ Do NOT touch `Toast.tsx` (2200ms hardcoded, no
     tap action, shared by ~40 toasts). ⚠️ Unknown membership = NOT dim, ever. ⚠️ The cap is on CREATING
     only -- editing/deleting/opening what you already have is never blocked. ⚠️ The tutorial's path into a
     creator must never be capped. ⚠️ Custom foods have SIX user-facing doors (traced in code); every capped
     feature needs its doors counted before build.
     ✅ **THE WALL COPY IS WRITTEN AND APPROVED for all EIGHT capped things** (2026-08-01) -- two modals each,
     at-cap and over-cap, in SPEC_monetization.md -> THE COPY. ⚠️ Meal slots promise **8**, not unlimited.
     ⚠️ The two REVERT over-cap modals are provisional until piece 4 settles what dormant looks like.
     ✅ **CUSTOM MACRO + NUTRITION GOALS: THE RULES ARE LOCKED** (2026-08-01). Grandfathered on downgrade --
     keep them, cannot edit them, cannot author new ones; presets stay free as the escape hatch. ⚠️ **Their
     custom values must be STORED SEPARATELY from the live goals** or picking a preset destroys them forever
     (the one-way door). Macros modal gains a fifth preset-sized "Custom" card centred under the 2x2, and the
     "Pick a preset to replace them" line goes. Nutrition Goals already HAS its Custom card; there the gate is
     the card plus READ-ONLY fields (two doors -- the tile and any field tap both unlock custom).
     ⚠️ The macro gate lives on the controls INSIDE Settings > Goals, not on the "Fine-tune" link.
     ✅ **PIECE 2 IS COMPLETE 2026-08-01.** All 16 cap modals + both goals walls are written and approved.
     ⚠️ **THE LOCK IS THE FLAT GOLD LOCK the app already uses on Reports/Comparison (`GOLD_BASE`), NEVER
     FOIL** -- foil means "you have this", a lock means "you could have this", and foil turns to mush at icon
     size. ✅ **DATA EXPORT NEEDED NO COPY**: the only export lives inside Reports, which is already
     Supporter-gated, so that perks row is already true today. A REAL data export does not exist and is now
     its own item in QUICK WINS/NEW below.
     ⏭️ **NEXT PIECE OF C: piece 3, does the user see a cap COMING.** Justin's opening proposal, carried over
     from the piece 2 discussion: put the count in the SUCCESS toast that already fires on create ("Food
     saved" etc), which have an empty second line already available. ⚠️ Flag to carry in: at a cap of 20 that
     is useful, but at a cap of 5 saved meals it fires on the first one and meters a free user from day one --
     same tone problem as the Halo counter. Pieces 4-6 after: what "dormant" means concretely, how the two
     downgrade categories behave, and where the caps get enforced across the different features.
     ⚠️ **THE LAYOUT CAPS ARE "DEFAULTS PLUS ONE", NOT RAW TOTALS (Justin, 2026-07-31). Read either as a bare
     total and you cull the defaults, which was never the intent.**
     • **MEAL SLOTS: 5, corrected from 4.** `DEFAULT_MEAL_SLOTS` is 4 (Morning, Lunch, Dinner, Snacks), so a
       cap of 4 gave a free user nothing of their own -- they could never add a single slot.
     • **STATS CARDS: the 7 default GRAPH cards plus 1 of your own.** "Stats cards 1" reads as one card TOTAL,
       which would strip the Stats tab back to a single graph. The system cards (At a Glance, Trends, Records,
       Streaks, Challenges, Body, Calendar, Reports) are not part of this cap at all.
     ⚠️ **A SHIPPED MODAL ALREADY PROMISES THE DORMANCY BEHAVIOUR (2026-07-31).** The 7-day taste step-down
     notice (`components/FirstWeekEndedModal.tsx`) tells users their extra meal slots and stats cards "go back
     to the free layout" and that the extras are "saved and waiting if you come back". That is a promise the
     app cannot currently keep -- NOTHING in item C is built. Whoever picks C up is honouring existing copy,
     not inventing behaviour. The onboarding block in `all-set.tsx` makes the same kind of promise.
     ➡️ **NEW 2026-07-30: SAVED MEALS, cap 5 free.** `pj_saved_meals` (utils/savedMeals.ts + the Repeat Meal
     modal) is a real shipped feature that was MISSING from this cap list entirely. Justin's call: 5, same
     over-cap logic as recipes. (A worry that 5 hides the catalog search box was checked and dropped: the
     search/sort tools appear at 6+ but every saved meal always shows from the first one, so a free user
     sees all their meals and just never gets a search box they would not need.)
     ⚠️ This is also where Otto's meal builder (F) writes: a meal he builds lands in the saved meals catalog
     and counts against the cap. Otto only ever creates a saved CUSTOM FOOD on an explicit request -- never
     as a side effect of building a meal (the AI estimator already sets this precedent: it writes a one-off
     day entry with the nutrition baked in and never mints a saved food).
     Organising rule:
     **LIMIT, don't paywall** -- cap CREATION, never access to data someone already logged.
     ⚠️ **"NO DESIGN NEEDED" IS NOT QUITE TRUE (added 2026-07-30).** The NUMBERS are locked; the MESSAGING
     is not, and nothing is built -- there are no caps, counters or gates anywhere in the app today.
     Undecided: does a user see a running count as they approach a cap, or only find out when they hit it?
     Toast, inline line, or a disabled button? Same pattern everywhere, or per feature?
     ➡️ **Justin leans a TOAST** (2026-07-30): easy, and universal across all five caps.
     ⚠️ Two things to square with that when C is picked up: a toast only fires AFTER the tap, so it warns
     nobody in advance; and the build standard's dim/inactive button rule suggests the Add button should
     already be disabled at the cap, with the toast explaining WHY on tap. The only existing precedent in
     the app is the AI chats' "5 messages left today" counter (QUOTA_VISIBLE_AT = 5).
     ➡️ **DOWNGRADE RULE, decided 2026-07-30 with item A question 2. TWO CATEGORIES, do not treat them the
     same (they briefly were, and it was wrong):**
     • **CONTENT they log with (recipes, saved meals, custom foods) = GRANDFATHERED.** Someone who ends the
       free week or cancels while holding MORE than the free cap KEEPS ALL OF IT, usable. Only NEW creation
       is blocked until they are back under.
     • **LAYOUT limits (meal slots 8->4, stats cards 4->1) = REVERT to the free cap.** Extras go DORMANT,
       top of the user's own order survives. Nothing is deleted; everything returns on resubscribe.
     • **TIMING:** capabilities drop the instant the entitlement ends; LAYOUT changes wait for the next local
       day boundary, so nothing ever vanishes off a screen mid-day. See SPEC_otto.md + SPEC_monetization.md.
  **D. 7-DAY TASTE** -- ✅ **FULLY AGREED 2026-07-31** (all ten parts walked and checked against the real code
     and the RevenueCat API), **still NOT built** apart from the onboarding announcement. Detail in
     SPEC_monetization.md. ⚠️ HARD DEPENDENCY of B: free Otto is only acceptable *because* users get the taste
     first. B should not ship without it.
     KEY OUTCOMES: the grant is the same REST API the app already calls; `end_time_ms` lets the week end at
     LOCAL MIDNIGHT on day 7; identity is safe (sign-in always precedes onboarding, and the RevenueCat id IS
     the Firebase uid); the new-Supporter email is already guarded against promo grants. The announcement is
     BUILT on `all-set.tsx` but is UNGATED and names builders that do not exist, so it must not reach
     TestFlight until D, B, E and F are real.
     ✅ **BUILT AND DEVICE-VERIFIED 2026-07-31**, in four batches: the server-side grant + revoke callables,
     the claim on the final onboarding tap with a prompt retry (proven with airplane mode), the "already had
     their week" record, the taste wording on all three membership surfaces, and the step-down modal.
     ⚠️ **DO NOT SHIP TO TESTFLIGHT UNTIL B AND C ARE DONE.** The taste itself works, but most of what it
     ANNOUNCES does not exist yet: item C is not built (no caps, nothing goes dormant, extra meal slots and
     stats cards do not revert) and item B is not built (Otto still does everything for everyone). Both the
     onboarding block and the step-down modal are promising behaviour those two items have to deliver.
  **E. WORKOUT BUILDER** -- needs a full spec + visualisation before any build.
     ⚠️ **THREE THINGS LANDED ON E FROM ITEM A QUESTION 3 (2026-07-30), do not re-decide them:**
     1. **CONSTRAINT: routines are PREVIEWED AND ACCEPTED, never written straight into the Workout tab.**
        Accepting the routine IS the confirmation for any exercise Otto created for it. Decline = nothing
        was created. Also catches wrong exercises / set counts before they are in the app.
     2. **Otto has NO IDEA what equipment the user has.** Nothing in the app captures it, so he will build a
        hack squat and a sled push for someone training in a garage with dumbbells. Probably needs a PROFILE
        field before E can be any good.
     3. **The builder needs real programming logic**, not plausible picks from a muscle group: movement
        pattern balance, compounds before isolation, sensible volume. This does not fall out for free.
     ⚠️ Depends on **I**, **J** and **K**.
  **F. MEAL BUILDER** -- needs a full spec + visualisation. ✅ **FOOD MATCHING IS NO LONGER UNSOLVED**
     (item A question 5, 2026-07-30 -- full detail in SPEC_otto.md). Locked: it is a MEAL builder, NOT a meal
     plan builder. Hard-gated from free. Candidate foods = favourites (no threshold) + anything logged 5+
     times in 30 days. An inline "what have you got?" GRID in the chat replaces a back-and-forth that would
     otherwise cost 4 messages and 4 API calls. Generic database entries only fill gaps and are MARKED as
     stand-ins. Meal size is DERIVED from the day's target and what is already logged, never asked. Logs as
     normal entries in a meal slot; saving to the catalog is deliberate, not automatic. Restaurants work by
     the MENU becoming the pantry.
     ⚠️ **HARD PREREQUISITE: allergies / dietary restrictions.** Nothing in the app captures what someone
     does NOT eat, so Otto would build a shellfish dinner for someone allergic. Needs a PROFILE field (which
     would help the AI meal estimator too). **F cannot ship without it.**
     ⚠️ Render the grid + preview as INLINE CHAT CARDS, never a modal over Otto's panel (modal-over-modal).
  **G. CALORIE FLOOR** -- SPEC_calorie_floor.md, DESIGN LOCKED since 2026-07-08. ⚠️ **"NOT BUILT" WAS
     WRONG (corrected 2026-07-30).** Already built AND wired: `utils/calorieFloor.ts` (+ a test file),
     `components/CalorieFloorModal.tsx`, and the Profile tab fires the modal when a target change drops
     below the line. Do NOT rebuild any of that.
     ➡️ **THE ONE THING LEFT: ONBOARDING.** `app/onboarding/your-style.tsx` never runs the floor check. It
     SILENTLY CLAMPS instead -- `setSuggestedCals(Math.max(1200, ...))` -- so a new user whose math lands at
     915 is quietly shown 1,200 and never told. That is the exact behaviour the spec rejects ("warn +
     consent, NEVER hard-block, the real number always shows") and it breaks honest-numbers too, since the
     displayed target is not what the calculation produced. Fix = replace the clamp with the real check so
     the true number shows and the modal fires, same as Profile already does. Wiring + a deletion, no new
     design.
     ⚠️ Also note the clamp is a flat 1,200 for everyone, which does not match the spec's thresholds at all
     (men whisper 1500 / modal 1200; women whisper 1200 / modal 1000), so a man can currently be handed
     1,200 with no warning of any kind.
  **H. COST ROUTING** -- ✅ **SPEC WRITTEN 2026-07-31: `SPEC_otto_routing.md`. Design agreed, nothing built.**
     That file supersedes the sketch in SPEC_otto.md -> COST OPTIMISATION, which got three things wrong:
     the "$0.21 -> $0.08" figure needs item B as well as routing (routing alone lands ~$0.12, because nobody
     counted OUTPUT tokens or the uncached block); break-even moves 4.7% -> ~3.2%, not 2.5%; and the
     "append only" rule is WRONG -- it conflicts with cross-user cache sharing, which is worth more.
     Invisible to users.
     ⚠️ DO NOT call this optional. It was framed that way once and it was wrong -- this is the direct fix
     to the cost problem that drove the whole 2026-07-29 session.

  **I. EXERCISE EDITOR (instructions + muscle map)** -- NEW 2026-07-30, came out of item A question 3.
     ⚠️ **TODAY NOBODY CAN EDIT EITHER.** The add/edit exercise form only handles name, type and tags. So a
     user-created exercise has NO muscle diagram and NO instructions, permanently, and there is no way to
     add them. That is also why this blocks Otto: if he pre-fills muscles/instructions on an exercise he
     creates and gets one wrong, the user is stuck with a confidently wrong diagram forever.
     **This editor is the seatbelt that makes Otto pre-filling safe**, and it is worth building on its own
     merits regardless of Otto (Justin's instinct, and he was right -- an earlier framing had this backwards).
     BUILD NOTES:
     • **Instructions:** simple editable step list (the built-ins run ~4 short lines each).
     • **Muscle picker: THREE states per muscle** (off / primary / secondary) because the data and the
       diagram distinguish them. Agreed shape: TAP CYCLES once=primary, twice=secondary, again=clear.
       Clarity is the whole risk, so: colour the chip states to MATCH the diagram's own primary/secondary
       shading, LABEL the state on the chip ("Chest, primary") so it never depends on colour alone, a small
       legend line above the list, and the muscle map sits above and **updates live as you tap**.
     • **Covers ALL exercises, including the 79 built-ins**, because it is the user's library. Safe because
       the defaults live in CODE (`DEFAULT_LIBRARY` in app/workout-library.tsx), so a built-in always gets a
       **"Restore original"** that puts back the real curated instructions + map. (Better than "ask Otto to
       rebuild it", which only returns his guess.) Custom exercises have nothing to revert to.
     • **NO muscle picker for cardio.**
     ⚠️ **DECIDE AT BUILD TIME:** the checklist offers 22 muscle keys but the SVG only has ~14 regions, so
     some keys share a picture (chest/upper_chest/lower_chest all draw chest; the three delts all draw
     deltoids; lats+rhomboids both draw upper-back; hip_flexors draws abs; hip_abductors+hip_adductors both
     draw adductors). Tapping a second key in the same group changes NOTHING on screen and reads as a bug.
     Either group those keys visually or trim the list to what the diagram can draw.
     ✅ VERIFIED NON-ISSUES, do not re-chase: clearing all muscles survives the app-update patch (it only
     fills fields that are MISSING, and an empty array is not missing), and the library saves through the
     synced write path so edits are backed up like everything else.
     ✅ Editing is not creating, so a free user over the 15-custom-exercise cap can still edit everything
     they have. Consistent with the content rule from item A question 2.

  **J. EXPAND THE EXERCISE LIBRARY (79 -> ~143)** -- NEW 2026-07-30, came out of item A question 3.
     WHY: every exercise that ships curated is one Otto never has to invent. This is the cheapest way to
     make the workout builder (E) safe. It also fixes real holes that exist today.
     ⚠️ **THE TWO GLARING OMISSIONS: there is no PUSH-UP and no DUMBBELL LATERAL RAISE.** Nothing bodyweight
     at all, so anyone training at home has almost nothing to pick from. And traps are on the muscle diagram
     with no direct movement anywhere in the library (no shrugs).
     **THE WORK IS NOT THE NAMES.** Each entry needs 4 short instruction steps + primary/secondary muscle
     mapping, in the existing voice and format (`DEFAULT_LIBRARY` in app/workout-library.tsx). ~64 of those
     is a real chunk of work. Valid muscle keys are the 22 in components/MuscleMap.tsx. Cardio entries do
     not need muscles.
     ⚠️ **SOURCING RULE:** exercise NAMES and which muscles a movement works are facts, so using other
     libraries/open datasets to spot what is MISSING is fine. **Never copy another app's written
     instructions or images** -- that is their protected content, and a scraped dataset would not match our
     voice anyway. Write the instructions ourselves.
     **CANDIDATE LIST (64, approved by Justin 2026-07-30, cut freely at build time):**
     • CHEST (8): Push-Up, Incline Push-Up, Decline Push-Up, Dumbbell Fly, Floor Press, Landmine Press,
       Cable Chest Press, Smith Machine Bench Press
     • SHOULDERS (6): Dumbbell Lateral Raise, Arnold Press, Front Raise, Reverse Pec Deck, Barbell Shrug,
       Dumbbell Shrug
     • TRICEPS (4): Tricep Kickback, Bench Dip, Diamond Push-Up, Single Arm Pushdown
     • BACK (8): Close Grip Lat Pulldown, Straight Arm Pulldown, Chest Supported Row, Inverted Row,
       Assisted Pull-Up, Rack Pull, Dumbbell Pullover, Trap Bar Deadlift
     • BICEPS (2): Reverse Curl, Spider Curl
     • FOREARMS (3): Dead Hang (a time-tracked HOLD -- the PR system already supports those), Wrist Roller,
       Plate Pinch. (Only Wrist Curl + Reverse Wrist Curl exist today, so forearms are thin.)
     • LEGS (12): Front Squat, Goblet Squat, Hack Squat, Bodyweight Squat, Step-Up, Glute Bridge,
       Good Morning, Single Leg RDL, Nordic Curl, Wall Sit, Calf Press on Leg Press, Box Jump
     • CORE (6): Crunch, Sit-Up, Mountain Climber, Bird Dog, Superman, Pallof Press
     • FULL BODY / FUNCTIONAL (9): Kettlebell Swing, Farmer's Carry, Thruster, Burpee, Sled Push,
       Battle Ropes, Clean and Press, Turkish Get-Up, Medicine Ball Slam
       (⚠️ easiest section to cut if the app stays gym-focused rather than CrossFit-adjacent)
     • CARDIO (6): Hiking, Outdoor Cycling, Stair Climbing, Yoga, Pilates, Sports

  **K. LIFT-NAME ALIASES (renaming an exercise must not split its PR history)** -- NEW 2026-07-30, found
     while walking item A question 3.
     **THE PROBLEM (verified in utils/liftPR.ts):** PR records are keyed by `normalizeLiftName(name)`, and
     the three history lookups (`computeLiftBest`, `dayHasLoggedLift`, `liftSessionHistory`) do NOT use the
     library at all -- they walk past days and match the exercise NAME stored inside each day's program.
     Every training day stores the name as it was THAT day. So renaming an exercise silently splits its PR
     history: old sessions stay under the old name, new ones start fresh.
     ⚠️ Matters more once Otto creates exercises (E): he picks the name, and users will rename to whatever
     they actually call it a week later.
     ❌ **DO NOT "fix" this by rewriting the name in historical programs.** That is a real migration on
     pj_workout_state AND it falsifies history that was true when it was logged -- the same reason meal-slot
     history is never rewritten. Past days stay honest.
     ✅ **THE FIX: an ALIAS SET.** Store previous names on the library exercise; the lookups accept the
     current name OR any alias instead of a single string. Same principle as `slotNameCache`: never rewrite
     the past, keep a translation.
     ⚠️ **THREE RULES THAT MUST BE NAILED BEFORE ANY CODE:**
     1. **Collisions.** Renaming onto a name that already has a PR record means two records want one key.
        Needs an explicit merge rule (probably keep the better of the two). Careless merging silently eats a
        record.
     2. **Name reuse.** Rename X to Y, later create a NEW exercise also called Y -> Y's history would pick up
        X's old sessions. Rule: a live exercise's real name always beats another exercise's alias.
     3. **Alias chains accumulate.** A -> B -> C must keep all three, never replace.
     **PLUMBING COST:** aliases live on the library exercise, but the lookups read day PROGRAMS, so every
     caller has to load the library and pass it in. A handful of call sites (utils/companionPRs.ts already
     loads it; others do not). Not hard, but not one file either.
     **SIZE: medium.** Not an afternoon.
     ❌ **CHEAP OPTION EXPLICITLY REJECTED BY JUSTIN 2026-07-30:** just warning on rename ("this starts a
     fresh PR history"). He would rather take the time and do it properly. Do not re-propose it.
     **SEQUENCE:** alongside or before **I** (renaming lives in that editor), and before **E** makes
     exercise creation common.

  **L. UNDEREATING SAFEGUARD (build)** -- NEW 2026-07-30. The DECISION is fully made (SPEC_otto.md), but the
     detection is APP-SIDE code, so it is no longer an Otto-only item and needed a home. Not part of G (that
     guards the recommended TARGET; this guards actual INTAKE), though it inherits G's thresholds from
     `utils/calorieFloor.ts`. Pairs naturally with G since they share thresholds and philosophy.

  **M. DIETARY RESTRICTIONS / ALLERGIES PROFILE FIELD** -- NEW 2026-07-30. Nothing in the app captures what
     someone does NOT eat. **Hard prerequisite for F** (Otto would build a shellfish dinner for someone
     allergic) and it would improve the AI meal estimator too. Profile work, small, must land before F.

  **N. LAUNCH-MODAL PRIORITY (a shared flag, NOT a queue framework)** -- NEW 2026-07-31.
     **THE GAP EXISTS TODAY**, independent of the taste: SPEC_monetization.md already admits there is NO
     cross-system modal coordination. Summaries self-limit via `pj_last_summary_shown` + `runAfterLaunchSplash`,
     Rate Us has its own budget in utils/ratingPrompt.ts, and they only avoid colliding because they happen to
     fire at different moments. "The current answer is hope they don't overlap."
     ⚠️ **The taste makes it worse:** launch-time modals become summaries, the free-week step-down, Moment A
     (subscription ended) and Rate Us. Four things is six pairwise relationships, and the existing plan of
     "ten lines of deference" was written when it was one modal deferring to one other.
     ➡️ **THE FIX (agreed 2026-07-31): one shared flag saying something is claiming this launch, plus a rank
     number on each modal.** Everything else stands down and retries next launch. Adding a fifth modal later
     means picking a number, not writing four more rules.
     ⚠️ NOT a queue framework -- the spec's warning against that still stands. But it is not zero either: the
     summaries and Rate Us each need a small change to respect the flag, so it is a small idea touching about
     four files.
     Known ordering so far: summaries win, then the step-down notice, then Rate Us (Justin: the step-down
     beats Rate Us 100% of the time).
     ➡️ **IT MUST ALSO OWN THE DELAY, not just the ordering (added 2026-07-31).** The summaries wait ~800ms
     so Home paints, THEN wait for `runAfterLaunchSplash`. The first-week step-down notice was built with only
     the second half and landed on top of the launch splash on a cold start. Every launch modal currently
     reinvents its own timing, which is exactly how they drift apart. One shared path should carry the delay,
     the splash gate AND the priority.
     ⏸️ Discussion not finished -- picked up when this item is reached.

  **O. SMART COACH COST PASS** -- NEW 2026-07-31. Found while pricing the other AI features for item H.
     ⚠️ **`utils/coachAI.ts`'s RULEBOOK is 46,383 chars (~11,600 tokens) sent as the system prompt on EVERY
     call, with NO caching at all** (`grep cache_control` = 0 hits in coachAI.ts, aiMealEstimator.ts and
     aiProxy.ts). Otto's 18,400 tokens are at least cached; these are paid in full every time. At the cost
     model's assumed weekly usage that is **~4.6 cents per user per month, more than half of what Otto will
     cost AFTER all of item H's work.** It is the biggest unoptimised prompt in the app.
     ⚠️ **CACHING IS NOT THE FIRST LEVER** -- same traffic-band problem as the 1h TTL (see
     SPEC_otto_routing.md); at current volume it would cost more, not less.
     ➡️ **The lever that works at any volume is the RULEBOOK ITSELF.** 11,600 tokens is enormous for
     something whose own comment says the model does NO analysis and only phrases sentences already computed
     deterministically in code. There are also at least two call paths using different prompts
     (coachAI.ts:334 and :496), so the giant rulebook may not be needed on all of them. **Needs a proper read
     before anyone claims what is possible.**
     ✅ The AI Meal Estimator was priced at the same time and is DELIBERATELY LEFT ALONE (Justin, 2026-07-31):
     ~2,250-token prompt, uncached, the only Sonnet call left, but bounded by its own 5/month free cap and
     Sonnet is justified for reading photos.
     ℹ️ Halo already has caching switched on; its known issue is the plans catalog sitting INSIDE the cached
     block and varying per request, which splits the cache. Real but small -- Halo's prompt is a fraction of
     the others.
     ⏸️ **Deliberately parked until the Otto work (B + H) is finished.** This is a different feature and
     chasing it is what pulled the 2026-07-31 session off course.

  🔢 **THE ORDER (set 2026-07-30, after item A completed). Dependencies first, then value.**
  1. **D -- 7-DAY TASTE.** Specced, not built. **Blocks B**, and B is the whole point of this push.
  2. **B + H TOGETHER -- the Otto split AND cost routing.** ⚠️ **Do NOT do these separately.** Both are
     surgery on the same prompt: B decides what each tier is sent, H decides what each QUESTION is sent.
     Doing B alone means restructuring the prompt, then immediately restructuring it again. Item A's
     question 4 already found that tier-dependent text must sit in the VOLATILE block or it splits the
     cache -- that is an H concern discovered inside B, which is the tell that they are one job.
     H is also the direct fix to the cost problem that started all of this.
  3. **G -- CALORIE FLOOR (onboarding clamp).** Small, mostly built already, and it is a safety fix.
  4. **L -- UNDEREATING SAFEGUARD.** Sits with G, shares its thresholds.
  5. **C -- NON-AI LIMITS.** Numbers locked; the cap MESSAGING still needs deciding (Justin leans a toast).
  6. **K + I -- lift-name aliases, then the exercise editor.** K's three rules need agreeing first. I is the
     seatbelt that makes Otto pre-filling exercise data safe.
  7. **J -- EXPAND THE LIBRARY.** Pure content work, 64 names already approved. Makes E safer.
  8. **E -- WORKOUT BUILDER.** Needs I, J and K first.
  9. **M -- ALLERGIES FIELD**, then **F -- MEAL BUILDER.** F is the riskiest item; its food matching is now
     solved but the feature still needs a full design session.
  LAST: IAP review screenshots + the App Store listing. Justin does not want these raised before then.

  📊 **READINESS -- what each item actually needs, so nothing is picked up expecting the wrong thing:**
  - READY TO BUILD, design already done: **C** (numbers locked), **D** (specced), **G** (design locked)
  - DISCUSSION ONLY, no code: **A** (six open questions)
  - READY once A and D are done: **B**
  - BLANK PAGE, needs a real design session before any build: **E**, **F**, and **H**
  - DESIGN MOSTLY DONE, needs a build: **I** (exercise editor -- shape agreed 2026-07-30, one open call at
    build time about the 22-keys-vs-14-regions overlap). ⚠️ **I gates part of E**: Otto pre-filling muscles
    and instructions on exercises he creates is only safe once the user can fix them.
  - NO DESIGN NEEDED, pure content work: **J** (expand the library; the 64-name list is already approved,
    the work is writing instructions + muscle mappings). **J makes E safer** -- every curated exercise is
    one Otto never has to invent.
  - NEEDS ITS 3 RULES AGREED, THEN BUILD: **K** (lift-name aliases). Medium size. Pairs with **I** and
    should land before **E**.
  ⚠️ E and F have NOTHING written anywhere. "Attack them" means designing from scratch, not building.
  F (meal builder) is the riskiest thing on this list -- food matching is genuinely unsolved and it could
  be much bigger than it looks. Worth learning that early rather than late.

  **LAST, and Justin does not want it raised before then:** IAP review screenshots (7 products) and the
  App Store listing (description, screenshots, privacy label, age rating, review notes). These genuinely
  block submission but need no design and can be done immediately before submitting. He was explicit that
  putting them at the top of a plan is not helpful.
- [✅ APP STORE CONNECT STATE, set 2026-07-29. Recorded so nobody re-does or re-decides it.]
  **DSA trader status: declared NON-TRADER / not distributing in the EU.** The red compliance banner is
  gone and a Digital Services Act row now shows 27 countries, Active. ⚠️ This was a DELIBERATE tradeoff:
  declaring trader would have published Justin's home address on the App Store product page (the developer
  account address is his apartment). Non-trader avoids that but blocks EU distribution. Fully reversible
  later with a PO box or virtual business address -- revisit if the app takes off.
  **App Availability: 5 countries -- US, Canada, UK, Australia, New Zealand.** Chosen over "all 175 minus
  the 27 EU" because the app is English-only, unlocalised and run by one person; reviews and support in
  languages Justin cannot read are a cost, not a win. Expanding later is just checking more boxes.
  **App price: Free** (revenue is IAP only). **Mac (Apple Silicon) and Vision Pro availability: OFF** --
  phone-sensor fitness app, a Mac install would earn one-star reviews. **Distribution: Public.**
  ⚠️ Distribution method CANNOT be changed after approval. Confirm it still reads Public before submitting.
  AGREEMENTS DELIBERATELY LEFT AT "ALL COUNTRIES" -- they are the legal contract for where you MAY sell,
  not the app's availability. Same for the IAPs' own availability: an IAP can never reach further than the
  app, so leaving them broad means they follow automatically if the country list ever grows.
  **Anthropic spend limit: $50/month, with alerts already set at $25 and $40.** Raise toward $100 at launch
  -- the cap is a catastrophe backstop, not a budget, and hitting it kills AI for every user at once.
- [⏳ WAITING ON APPLE -- JUSTIN'S ACTION, DATED. Not a code task.] **App Store Small Business Program
  enrollment has been submitted TWICE with no response.** Submitted 2026-07-13 (confirmation email received)
  and again 2026-07-29 (second confirmation received). Mail searched back 60 days on 2026-07-29: there is NO
  approval and NO denial, only the two "we've received your request" emails. The duplicate submission is
  harmless.
  ➡️ **IF NOTHING BY 2026-08-05, CONTACT APPLE DEVELOPER SUPPORT** (developer.apple.com/contact, membership /
  App Store Connect topic). Three weeks from the original submission is long enough to ask.
  WHY IT MATTERS: 30% -> 15% Apple cut, i.e. roughly **21% more revenue per subscription** with no code, no
  price change, no product work. It moves the unit economics more than every AI optimisation considered on
  2026-07-29 combined, and the COST MODEL projections in SPEC_monetization.md still assume 30%.
  TIMING: the reduced rate starts 15 days after the end of the fiscal month in which enrolment is APPROVED,
  so an approval in July lands mid-August. Nothing has been lost by the delay -- there is no revenue yet, so
  nothing has been billed at 30% in the meantime.
  ⚠️ DEAD ENDS ALREADY CHECKED, do not re-walk them: enrolment status is NOT shown on developer.apple.com/
  account (that only shows the base "Apple Developer Program, Individual" membership), NOT in App Store
  Connect > Business, and the enrol page just serves the form again rather than reporting a pending request.
  Support is the only way to see the real state.
  ✅ NOT A PROBLEM, in case it is ever re-questioned: being enrolled as an INDIVIDUAL rather than a company
  does not disqualify you. The only real test is the $1M threshold.
  ALSO OUTSTANDING on the same App Store Connect screen: the red **DSA trader status** banner. EU
  distribution is blocked until it is declared, and the agreements cover all 175 countries. Unknown whether
  it can hold up an enrolment review -- clear it anyway before contacting support.
- [NET CARBS SWEEP -- ✅ COMPLETE 2026-07-29, all four surfaces shipped and device-verified. Kept here ONLY
  for the two deliberate non-bugs; delete this entry once they stop being re-reported.]
  Honouring the Net Carbs setting today: Home Calories/Macros card, Log tab summary card, Log tab meal rows
  AND individual food rows, Day Detail, Stats carb card, Custom Reports, Weekly Summary, Monthly Summary.
  DELIBERATELY JUDGED **NOT** BUGS (do not "fix" these): Recipe Log / Recipe Builder show a recipe's total
  carbs -- a recipe is a food, not a day's intake, and net carbs there would need fiber per ingredient. Food
  Detail shows total carbs as the macro but already lists Net Carbs as its own line in the breakdown, which
  is how a real nutrition label reads.
  ⚠️ NAMING, this cost real time on 2026-07-29: app/report.tsx is **CUSTOM REPORTS** (templates + blocks),
  NOT the Effort vs Results diagnostic report. EvR is app/diagnostic-report*.tsx and shows NO carbs
  anywhere. Justin was sent to the wrong screen to test off that mix-up.
- [NEW 2026-07-28] More entries in the Stats > RECORDS section. Confirmed wants: **highest recovery score**
  and **highest sleep score**. Justin was not sure what else belongs there, so propose a short candidate
  list when this is picked up rather than guessing at it.
- [NEW 2026-07-28 -- JUSTIN'S ACTION, App Store Connect + RevenueCat] **Supporter price raised: $9.99/month,
  $89.99/year** (was $6.99/$69.99). Locked 2026-07-28 off the unit-economics pass -- see the COST MODEL
  section in SPEC_monetization.md. Code side is DONE (fallback price strings in app/support.tsx). STILL TO DO:
  change both subscription prices in App Store Connect. Nothing breaks in the meantime -- the app reads live
  prices from the store, so it will show whatever Apple says until then.
  ⚠️ SEPARATE AND UNRESOLVED: raising the price does NOT fix the model. At $9.99 the app still needs ~6% of
  active users subscribing to cover its own AI bill (typical is 1-5%), and every install scenario still loses
  money. The real problem is cost-per-FREE-user. Levers 1-3 (Halo's free cap, the Haiku caching fix, free cap
  levels) are still open and were deliberately not touched. MEASURE REAL AI USAGE FIRST.
- [NEW 2026-07-28, DATA INTEGRITY -- PRE-LAUNCH] **A second device on the same account never pulls from the
  cloud, so it sits permanently stale.** REPRODUCED ON DEVICE 2026-07-28 (phone + iPad, throwaway account):
  logged food on the phone, opened the iPad, and the iPad had no idea it existed.
  CAUSE (read in services/syncService.ts, `_runRestoreGate`): the gate handles exactly two cases -- account
  switch (owner !== uid, which DOES pull the cloud and works correctly) and fresh install (not onboarded,
  which also pulls). A third case, "same account + already onboarded", short-circuits with "local is
  authoritative, don't overwrite it" and turns sync on WITHOUT ever downloading. That assumption is right for
  your daily device and wrong for a second one, where local is stale rather than newer.
  WHAT WAS **NOT** PROVEN: the first theory was that the stale device then overwrites the cloud (syncKey uses
  setDoc, a full replace). The device test did NOT reproduce that -- the cloud survived. Do not repeat that
  claim without new evidence.
  ⚠️ TEST-DESIGN NOTE so this isn't re-run wrong: you CANNOT detect cloud damage by looking at an existing
  install, because it never reads the cloud either -- it shows local. Force a real download first by signing
  out and into another account and back.
  MANUAL WORKAROUND THAT WORKS TODAY: signing out and back in forces a full cloud restore, because the
  account-switch path is the one that pulls. Repairs any stale device.
  AGREED FIX (option 2 of 3, not yet built): record on each device when it last successfully pushed to the
  cloud; on sign-in, pull anything the cloud changed after that and take the cloud's version. Fails safe --
  if the cloud is unreachable it behaves exactly as today. Accepted tradeoff: an offline edit loses to an
  online edit of the same key. Options 1 (fill only missing keys) and 3 (timestamp every local write, needs
  the 26 raw AsyncStorage writes routed through storageSet first) were considered and set aside.
- [NEW 2026-07-28, DATA INTEGRITY -- PRE-LAUNCH, LIKELIER CAUSE OF THE ACTUAL LOSS] **A failed cloud sync is
  silently swallowed and never retried.** `syncKey` catches and discards the error on purpose ("sync failure
  must never break local saves") -- correct as far as it goes, but there is no retry, no flag, and no record
  that a key never made it. Everything looks perfect locally right up until a reinstall.
  WHY THIS IS THE LEADING SUSPECT for 2026-07-28's real loss: Justin's Expo dev build REPLACES the TestFlight
  app (he cannot have both installed), so it came up as a genuinely fresh install, restored from the cloud,
  and showed exactly what the cloud held -- everything except that morning's 4 food logs + 3 water logs. The
  iPad was blamed first; the device test cleared it. Entries that never reached the cloud fits the evidence.
  NOT PROVEN EITHER -- it is the best remaining explanation, not a confirmed one.
  Note `uploadAllLocal` on background is supposed to catch stragglers; whether it ran is unknown.
  Settings already has "Backup Verify (read-only)" + "Upload All Data", which is the manual safety net.
- [NEW 2026-07-28] Notification landing audit -- where each type actually drops you, not just which tab.
  Two types checked so far on 2026-07-28:
  - ❌ WEIGHT: opens the Home tab but drops you mid-scroll with the weight card half-hidden under the
    header, and does not open weight entry. The route is right, the landing is wrong.
  - ✅ DAILY VERSE: opens the Bible page scrolled to the correct highlighted verse. Correct, no change
    needed. Use this one as the reference for what "landed properly" looks like.
  Every remaining type still needs checking.
- [TOP -- DISCUSS FIRST, surfaced 2026-07-27] **Tips grant literally nothing, and the plan always said
  they should.** `purchaseTip` in MembershipContext runs the purchase, fires a thank-you toast, and stores
  NOTHING **IN THE APP** -- no badge change, no history, no record the giver can ever see again.
  ✅ CORRECTION 2026-07-28: an earlier version of this entry said nothing notifies Justin. That was WRONG.
  `functions/src/revenueCatWebhook.ts` is live and emails Justin on both INITIAL_PURCHASE (new Supporter)
  and NON_RENEWING_PURCHASE (a tip), subject-tagged [SANDBOX] in test. Verified working 2026-07-25 off a
  real sandbox tip from Justin's dad. The email carries product, price, store, country, timestamp, the
  Firebase UID, and the buyer's Apple relay email (which forwards to their real inbox).
  SO THE JUSTIN-SIDE VISIBILITY PROBLEM DOES NOT EXIST -- he can already see and personally thank every
  giver. What remains is purely the GIVER's side: they pay, get a toast, and ten seconds later the app
  holds no evidence it ever happened.
  SPEC_monetization has said since 2026-07-11 that a tip should "bump the badge / add them to a thank-you
  list", but it was written as OPTIONAL, never locked, and never built. So this is a spec-to-code gap, not
  a missed risk.
  TWO REASONS TO FIX, and the second is the stronger one:
  (1) Review risk. Apple can push back on IAPs that give nothing. Real but NOT a certainty -- plenty of
  apps ship tip jars exactly like this and pass. External TestFlight goes through App Review, so the
  2026-07-27 build is the first real test of it.
  (2) PRODUCT. Someone who gives $49.99 gets the identical silent toast as someone who gives $2.99. That
  is the actual problem, and it got worse the moment the Founder tier shipped.
  DISCUSS BEFORE BUILDING: what the acknowledgment should be (badge tier? thank-you list? a one-off
  message from Justin?), whether it is retroactive, and whether it scales with the amount.
  ALSO IN THIS PASS -- verify the store side is actually correct, not just the code:
  - RevenueCat shows **"Could not check" on EVERY product**, including ones created 2026-07-12 that
    demonstrably work. That is RevenueCat unable to validate against App Store Connect -- almost certainly
    the App Store Connect API key isn't connected in RevenueCat. It does NOT break purchases (Justin's own
    subscription is live), but it means product validation and revenue reporting are running blind. Worth
    connecting properly before launch so the numbers can be trusted.
  - Confirm all five tips + both Supporter products have correct prices, availability and localisation,
    and that the tips carry NO entitlement while the two subs carry theirs (correct as of 2026-07-27).
  - `tip_founder` was created 2026-07-27 and rides the TestFlight build for review. Confirm it actually
    returns a live price in that build rather than the hardcoded fallback -- the fallback string is also
    "$49.99", so the screen looks identical either way and cannot be judged by eye. Temporarily changing
    the fallback to something obviously wrong is the only way to tell.
- [PARKED 2026-07-27 -- Justin's call, do not raise unprompted] **The app ignores iOS Reduce Motion.**
  Confirmed by search: zero references to `AccessibilityInfo` / `isReduceMotionEnabled` anywhere. People
  turn Reduce Motion on because animation makes them physically ill (vestibular disorders, migraine), so
  they currently get every mote, spring, bar fill and expand at full strength. NOT an App Store blocker.
  SAME SHAPE AS THE DYNAMIC TYPE BUG: an iOS accessibility setting the app never read, shipped, and found
  by a real person on TestFlight (Justin's uncle). Reading the setting is trivial -- one call plus a
  listener behind a hook; the work is deciding what each animation becomes. Do celebrations FIRST if this
  is ever picked up (largest amount of motion): toast still slides, motes replaced by a brief static glow
  or nothing. Then sweep the rest opportunistically rather than as one job. Also SPEC_celebrations TBD-8.
- [ONLY THE HISTORY REPAIR IS LEFT -- everything else DONE 2026-07-27, see RECENTLY SHIPPED]
  **Extended nutrients scaled against the WRONG serving size.**
  REMAINING: entries logged before 2026-07-27 keep their wrong nutrients. Justin's call was fix forward;
  delete + re-log fixes one. A repair IS feasible for CUSTOM-food entries specifically (they record which
  My Food they came from, so the real base serving can be looked up) -- not for database foods, where a
  barcode entry and a text-searched one are indistinguishable after the fact. Caveat if ever built:
  EditFoodModal can change a My Food's base serving after entries were logged against it, so a repair
  cannot blindly trust today's serving sizes.
  Everything below is the diagnosis, kept because it explains the shape of the whole class:
  Found live: a 110 g log of a custom 84 g food reported 82,500 mg sodium. Calories and macros are
  CORRECT everywhere and always were -- this is detailed nutrients only.
  ROOT CAUSE: an entry stores its nutrients as one block, but four different conventions exist for what
  size that block describes. Barcode foods = per 100 g. Text-searched FatSecret foods = per whatever
  serving was selected at save. Custom foods = per the food's own base serving. Recipes = per the exact
  portion. Every reader assumes one convention, so it is wrong exactly where the assumption misses.
  WAS BROKEN (all fixed for NEW entries by Step B below; old entries still carry it): custom foods (both on
  the Food Detail screen and in day totals) and text-searched FatSecret foods (day totals only -- the detail
  screen was fine, verified on device). WAS ALWAYS CLEAN: barcode foods and recipes, both verified on device
  by switching servings and checking every nutrient scaled with calories.
  DONE 2026-07-27, STEP A: the scaling was consolidated out of fourteen copies into utils/nutrientScale.ts,
  with behaviour deliberately unchanged, so the correction happens in ONE place. See RECENTLY SHIPPED.
  DONE 2026-07-27, STEP B -- ✅ **BUILT AND LIVE, verified in code 2026-07-29.** app/food-detail.tsx writes
  `nutrientScale` onto every new entry at save time (the one place that actually knows how much of the
  block was eaten), and `entryNutrientScale` in utils/nutrientScale.ts returns it before anything else.
  The old inference is now a FALLBACK that only fires for entries logged before this existed.
  ⚠️ THIS PARAGRAPH USED TO READ "REMAINING (Step B)" AND CONTRADICTED THIS ENTRY'S OWN HEADING. That cost
  real time on 2026-07-29: the body was read, trusted over the heading, and a fixed bug was described to
  Justin as still open. If you are about to describe this bug's state, read the CODE, not this file.
  HISTORY: not repairable blind. Old entries carry no marker saying which convention they used, so a
  barcode entry and a text-searched one are indistinguishable after the fact. Justin's call was fix
  forward; a specific bad entry is fixed by deleting and re-logging it. Note EditFoodModal can change a
  My Food's base serving AFTER entries were logged against it, so any future repair cannot trust today's
  serving sizes either.

- [TOP / EXPLORATION, opened 2026-07-26. NOTHING LOCKED -- read SPEC_celebrations.md before touching.]
  **Celebration overhaul.** Started from an unreadable achievement -- the centre text is hardcoded white
  with no backdrop, invisible on Light (it dates from when the app was dark by default; the confetti was
  made theme-aware and the text never was). Justin's call is to survey what we have AND what we could
  have before altering anything: *"I'm okay with ripping up the roots if it's truly premium."* He is
  explicitly open to new packages and a new dev build.
  ONLY LOCKED: Mindful celebrations are IDENTICAL to every other mode (do not propose a quieter variant);
  daily goals keep a celebration; everything must be skippable; diamond keeps its signature blue; and
  PROTOTYPE BEFORE SPECCING THE DESIGN.
  ⚠️ "Drop the centre text on small" was said and then explicitly RE-OPENED. It is NOT decided.
  Findings already in the spec: 31 trigger sites across 8 files all calling one 3-arg function (that is
  the blast radius); tiers are 26 small / 24 medium / 46 LARGE / 1 diamond, so "large" is the default
  experience not the special one; the tiers differ in SIZE not in KIND, which is likely why medium and
  large do not feel bigger; and LARGE is the only tier with no dismiss control despite being the most
  common. Dev tools are accurate for all four tiers, but cannot fire a realistic LONG achievement name,
  which is exactly where layout breaks.
- [2026-07-26, text scaling CLOSED -- only these small leftovers remain] **Accessibility leftovers.**
  All four phases shipped and were device-verified (see RECENTLY SHIPPED; full detail in
  SPEC_accessibility.md). What is genuinely left:
  (a) **NOT SEEN ON DEVICE YET:** the header-row height fix (the Library pill and the icon buttons
  beside it now share one height) and the new Text Size tooltip + the "App" pill on the definitions
  screen. Small and low risk, just unconfirmed.
  (b) **A lint rule so this cannot come back.** Nothing stops new code importing Text/TextInput from
  'react-native' or icons from '@expo/vector-icons' and silently reintroducing the whole bug. The rules
  are in CLAUDE.md and Claude memory, so today it depends on remembering. A no-restricted-imports rule
  makes it impossible to get wrong. Minutes of work; offered and not yet taken.
  (c) **A bigger step, only if anyone asks.** Above 1.15 is UNTESTED, not known-bad -- one bug in the
  whole app at 1.15 suggests 1.3 may be fine. Costs one line plus another sweep at the new ceiling.
  Any complaint will come from users on Apple's ACCESSIBILITY sizes (past 2x), who currently get 1.15.
  (d) **CHECK THE iPAD ITEM further down this list** (wrapped date on Home, oversized Otto header). It
  was guessed to be system text size; phase 1 may have already closed it. Verify before scoping it.
- [TOP / NEXT TESTFLIGHT BUILD, 2026-07-25] **Re-tune the chat keyboard follow on a RELEASE build.**
  Otto's and Halo's input rows now animate with the keyboard (see RECENTLY SHIPPED), but the timing
  constant was tuned in a DEV build and cannot be trusted there. WHY: the animation drives a layout
  property, so it runs on the JS thread by necessity (the native driver cannot carry padding), and it
  is compensating for event-dispatch latency -- the exact thing Metro inflates. `KB_FOLLOW = 0.7` in
  BOTH components/CompanionChat.tsx and components/AssistantChat.tsx runs the animation at 70% of the
  keyboard's reported duration to hide that latency.
  ON TESTFLIGHT: latency drops, so expect it to feel slightly FAST. That is the expected direction, not
  a regression. Raise KB_FOLLOW toward 0.85 or 1.0 until it sits with the keyboard. One number, two
  files, keep them in step. Judge the DISMISS direction hardest; that is where every earlier version
  fell apart.
- [surfaced 2026-07-25, ASSESSED ON DEVICE 2026-07-26 -> NOT WORTH FIXING. Do not "fix" this.]
  **The dismiss easing in `useAnimatedKeyboardHeight()` / `KeyboardAwareCenter`.** Both ease the DISMISS
  with `Easing.in(Easing.cubic)`, which covers only ~4% of the distance in the first third of its
  duration. On Otto and Halo that read as badly broken and was fixed there.
  JUSTIN CHECKED THE CENTRED MODALS (Workout Library's Create/Edit Exercise, Add a Prayer, Settings >
  Feedback) 2026-07-26 and called them fine: "not in sync with the keyboard but not obvious teleporting
  issues like Otto was."
  WHY THE SAME BUG READS SO DIFFERENTLY, worth knowing before anyone re-opens this: Otto/Halo's input
  row is pinned to the BOTTOM of a full-height sheet, so it travels the FULL keyboard height (~340pt)
  and any timing error is enormous. A CENTRED card only travels about HALF that, because centring splits
  the difference, and less again since the card also shrinks. Same error, under half the distance, below
  the threshold of noticing.
  DECISION: leave it. One line would fix it, but it changes sixteen already-signed-off modals for
  something that cannot be seen, and this project's rule is not to churn what nobody has complained
  about. Revisit ONLY if a specific modal is reported as feeling wrong.
- [PARKED 2026-07-25, low priority, only if it starts to bother anyone] **Floating save bars jump when
  the keyboard opens.** Everything else from the keyboard pass is done. What's left uses the hand-rolled
  pattern (a Keyboard listener storing the height in state) to position a floating SAVE BAR rather than a
  centred card: profile.tsx, settings.tsx, body-measurement-log.tsx, onboarding/profile-setup.tsx,
  onboarding/your-style.tsx. Deliberately out of scope for the modal pass -- these are full screens, and
  the standard says leave those alone. Fix if wanted is the same as everywhere else: swap the state for
  `useAnimatedKeyboardHeight()` from components/KeyboardAwareCenter.tsx so the number arrives animated.
  Nobody has complained about these; do not churn them speculatively.
- [PINNED / parked 2026-07-25, deliberately NOT built -- do not "finish" this without a real trap]
  **Number-pad Done bars.** A number pad has no Return key, so in principle a keypad field can strand a
  user. Audited: **58 keypad fields across 21 files** (grep `keyboardType` for number-pad / numeric /
  decimal-pad). Decision: build NOTHING for now.
  WHY: a keypad only traps you when there's no other way out, and in this app there nearly always is --
  centred modals dismiss on a tap outside, lists dismiss on a tap in empty space. Blanketing 58 fields
  would put a grey accessory slab above the keyboard nearly everywhere, which Justin disliked on the one
  screen it was tried. The one genuine trap found (Add a Prayer) turned out not to be a keyboard problem
  at all: the card grew until its buttons left the screen, and a height cap fixed it. A trapped user is a
  layout problem before it is a keyboard problem.
  IF IT COMES UP: `components/KeyboardDoneBar.tsx` is built, styled to match the onboarding height/goal
  bar, and is a two-line drop-in (`inputAccessoryViewID` on the field + the component alongside it).
  Reach for a height cap first. See SPEC_keyboard_modals.md.
- [PARTIALLY DONE 2026-07-25 -- only the COPY half is left] **Notifications: personality + copy pass.**
  The settings-clarity half shipped (own page, 3 categories, per-notification switches -- see RECENTLY
  SHIPPED). What remains is Justin's item (d): the exact TEXT of all 14 notification types, with more
  personality, across all three coaching modes. SPEC_notifications.md holds the copy rules (4-6
  deterministic variations per type per mode). Justin explicitly parked this and did NOT want it in the
  2026-07-25 session. Routing was NOT re-verified either -- he judged it fine and told me not to spend
  the session re-reading every notification's text.
- [ORIGINAL ITEM, superseded -- kept for the routing/copy detail] **Notifications pass 2.**
  (a) re-read the exact text of every notification,
  (b) verify each one deep-links to the RIGHT place, (c) make the settings screen more digestible --
  specifically, under "WHAT CAN WE NOTIFY YOU ABOUT", show which actual notifications fire for each
  selection, via subtext or a tooltip, so the choice isn't abstract, (d) more personality in the copy.
  SPEC_notifications.md is the source of truth; 14 types, category-based settings. Mindful pass matters
  here. Note there's an existing notifications BUG item further down this list -- check whether it's
  verified before starting, so this pass isn't built on a broken base.
- [surfaced 2026-07-24, needs discussion, not urgent] **Sync Claude memory/instructions between Justin's
  two accounts.** He switches between 2 Claude accounts when usage limits hit and wants their memory/
  instructions merged so they're identical. Before proposing anything: need to know whether both accounts
  run on the same machine/profile (in which case they may already share the same local memory directory
  and there's nothing to sync) or are genuinely separate setups. Explicitly not for the 2026-07-24 session
  -- just needs to stay visible for when Justin's ready to dig in.
- [decided + implemented 2026-07-23, PENDING DEVICE VERIFY] **Recovery score activity-component ceiling
  fix.** Justin signed off on the curve after discussing trade-offs (compared against Whoop's Green
  67-100/Yellow 34-66/Red 0-33 bands and Oura's approx. Optimal 85+/Good 70-84, both of which treat
  mid-70s-to-low-80s as a normal good day, so the existing strictness elsewhere was left alone).
  `actScore` in utils/recoveryScore.ts changed from peaking at 75 (neutral, could only subtract) to
  peaking at 100 at exact-baseline activity, same falloff shape, still 0 at +/-100% deviation -- a strict
  improvement, no historical day's activity component can score lower under the new curve than the old
  one. NOTE: Recovery Score is a write-once morning snapshot (locked into pj_<date> the first time it's
  computed that day), so this only affects today-if-not-yet-locked and future days -- it does NOT
  retroactively change any already-stored past score. A separate historical-recompute-and-preview tool
  was discussed (re-derive each day's true-at-the-time baseline from HealthKit and reapply the new
  formula for comparison, without overwriting stored snapshots) but explicitly deferred, not built this
  session. Needs on-device verify: next locked recovery score should reflect the new curve. Justin's
  real reference day (HRV 46.9/base 41.8, Sleep 85, RHR 51/base 52, Prev Activity 640/base 688, Resp
  13.2/base 13.5) recomputes to 84 (was 80) under the new formula.
- [surfaced 2026-07-23, from Justin's App Thread notes] **Monthly trends report / trends section.** A
  once-a-month trends summary, OR a standing "trends" section, OR both. OVERLAP to resolve before building:
  this overlaps the existing Custom Reports track AND the time-of-day nutrition insights item below -- decide
  merge vs standalone when picked up. Unscoped.
- [surfaced 2026-07-22, BUG, root-caused + FIXED 2026-07-23, PENDING DEVICE VERIFY] **Wrong notifications
  firing despite logged data (Justin's dad, current TestFlight).** Two bad fires, both while he HAD logged:
  (a) "Nothing Logged Yet" fired ~2pm despite Morning + Lunch already logged. (b) "Drink Up" fired ~10:45am
  with 28oz already logged against a 64oz goal, while the Water modal itself read "Expected Now 40oz/Behind".
  ROOT CAUSE (a): the food-log reminder is a fixed-time device alarm cancelled only from `food-detail.tsx`'s
  save path -- `recipe-log.tsx` and `ai-meal-estimator.tsx` also write food entries directly but never
  cancelled it, confirmed by reading both files (no import of `cancelFoodLogNotification` in either).
  ROOT CAUSE (b): the water reminder's "skip if within 25% of pace" check is correct and already existed
  (`scheduleWaterNotificationsNow`), but only ever re-ran when the app came back from background
  (`refreshLiveNotifications` in `_layout.tsx`) -- never immediately after logging water while already
  in the app, which is the normal case. Not a bad curve, a stale-check-timing bug.
  ALSO FOUND: Weight Log Reminder had NO cancel mechanism anywhere in the code -- logging weight never
  stopped it from firing. Same root pattern as (a): an action with multiple/any logging path needs its
  notification cancelled from every path that can trigger it, not just the original one.
  FIX (all three, 2026-07-23): added `cancelFoodLogNotification()` to `recipe-log.tsx` and
  `ai-meal-estimator.tsx`'s save paths. Built `cancelWeightLogNotification()` (didn't exist) and wired it
  into Home's `logWeight`. Wired `refreshLiveNotifications()` into every water add/delete/edit path in both
  Home (`index.tsx`) and Log (`log.tsx`) instead of only firing on full-goal-hit, so the already-correct
  pace check reruns immediately after every log, not just on app-foreground. Also added a food-logged /
  weight-logged safety-net check inside `refreshLiveNotifications` itself, so even a future new logging
  entry point that forgets to cancel its own notification gets caught the next time the app foregrounds.
  tsc clean on all touched files (pre-existing unrelated errors elsewhere untouched). NOT yet device-tested.
- [surfaced 2026-07-22, needs design pass] **Time-of-day nutrition insights (EvR / reports / summaries /
  insights / coaches -- wherever it fits).** Surface timing effects: eating too much too late can disrupt
  deep sleep, etc., with varied examples of what each thing affects. Possibly fold in caffeine levels, late
  workouts, and water timing too. Unscoped.
- [surfaced 2026-07-20 · ⚠️ **CONFIRMED A REAL BUG 2026-07-28 -- and it is NOT iPad-only.**]
  **The tab headers break at narrower widths.** Device-confirmed on two separate devices:
  - Justin's iPad (iPhone compatibility window): Home's "TUESDAY, JULY 28" wraps with "28" alone on a
    second line, and on Food Log the ‹ › day arrows collide with / tuck under the Library pill.
  - **His wife's iPhone** (notch-era, ~375-390pt vs Justin's 16 Plus at 430pt): the same Food Log header is
    visibly cramped, arrows jammed against the date. NO iPad INVOLVED. Real phones are affected.
  MECHANISM: the header is one row with a left block (avatar + title + date + prev/next arrows) and a right
  block (Library pill + grid + help). Neither shrinks or wraps gracefully, so as width drops the date wraps
  and the arrows end up under the buttons. See app/(tabs)/log.tsx around the `Food Log` GradientTitle and
  the `dateNavRef` row for the exact structure; Home's header has the same shape.
  ⚠️ TWO WRONG CALLS ON THIS, RECORDED SO THEY ARE NOT REPEATED:
  (1) A code scan for hardcoded widths / minWidths found nothing and concluded "small iPhones are almost
      certainly fine." WRONG -- this is a FLEX row running out of room, which a width grep cannot see.
  (2) On learning the iPad runs in compatibility mode (`app.json` -> `"ios": { "supportsTablet": false }`,
      which IS true and does explain the small letterboxed window), it was written off as "not a bug."
      WRONG -- the window being iPhone-sized is the CAUSE of the narrow width, not an excuse for the header
      failing at it.
  THE LESSON: static analysis cannot answer responsive-layout questions. Run the iOS simulator at iPhone SE
  size, which was recommended and not done before the wrong conclusions were published.
  SCOPE WHEN PICKED UP: every tab header, not just Food Log. Needs a real responsive pass -- let the title
  block shrink, keep the date on one line (or move the arrows), and make sure the right-hand buttons cannot
  overlap anything.
  SEPARATE AND STILL OPEN (do not conflate): whether to support iPad properly at all. Flipping
  `supportsTablet` to `true` is one line but starts genuine tablet-layout work for every screen and needs a
  new native build. Fixing the header does not require it.
  ⚠️ JUSTIN'S FOLLOW-UP QUESTION 2026-07-28: his phone is an iPhone 16 Plus (430pt wide). If the iPad is
  wrong, are SMALLER iPhones wrong too?
  ANSWER: **YES for the headers** -- confirmed on his wife's phone, see above. The scan below found no
  hardcoded width that OVERFLOWS, and that part still holds, but it missed the actual failure because a
  flex row running out of room is invisible to a width grep. Kept for what it does rule out:
  - The widest hardcoded widths in the whole app are 310-320pt modal cards. The narrowest current iPhone is
    375pt (SE / 13 mini), so those still clear it with ~27pt of margin each side.
  - No `minWidth` sits in a row where several could sum past 375pt (the largest are single elements at
    120 / 160 / 220).
  - Layouts are flex-based throughout, which adapts DOWN correctly by default, and 23 files already read
    `Dimensions`.
  - There is no small-screen branching anywhere (no `isSmall`, no `width < 375` checks) -- which is the
    RIGHT default here, not a gap.
  ⚠️ THIS IS STATIC ANALYSIS AND CANNOT PROVE IT. The real check is 5 minutes in the iOS simulator at
  iPhone SE size. Do that before believing this entry.
- [surfaced 2026-07-20, data-integrity] **Firebase auth identity edge cases -- 2 test scenarios still open.**
  Main build fully shipped and device-tested (see RECENTLY SHIPPED for the one-liner, archive for full
  detail): sign-in-time handling for `account-exists-with-different-credential`, Connected Accounts
  link/unlink in Settings, preferred contact email picker. Two test scenarios deliberately left un-run,
  Justin's call 2026-07-20 to pin here rather than backlog: (2) new device, same provider, same email
  (Apple -> Apple to a fresh device) and (5) new device, same provider, different email. Known real gap
  that can't be code-fixed either way: Apple's Hide My Email gives Firebase a private relay address, so a
  user who signs up via Apple with it on and later tries Google with their real Gmail gets a silently
  separate, empty account -- no error, nothing to catch, Apple's privacy design working as intended. Doesn't
  affect Justin or his wife's test accounts (neither uses Hide My Email).
- [surfaced 2026-07-20, ties into the nutrition label scan work, needs its own build] **Universal weight-unit
  conversion (g / oz / lbs) for every food, custom or FatSecret-sourced.** Surfaced comparing to Cronometer's
  serving-size UX. CONFIRMED BY READING CODE (2026-07-20): FatSecret-sourced foods already have a real
  working serving picker (`food-detail.tsx`'s `fetchFatSecretServings` + the serving-picker modal) that pulls
  FatSecret's own full list of alternate servings per food (100g, 1 cup, 1 medium, etc, each with real macro
  numbers) -- this is functioning infrastructure, not something to build from scratch, just limited by
  however complete FatSecret's own data is for a given food. CONFIRMED GAP: custom/My Foods have NO such
  picker -- `CustomFoodCreator.tsx`'s "Additional Servings" feature hardcodes `grams: string`, no unit choice
  at all. THE ACTUAL BUILDABLE WIN: weight-to-weight conversion (g/oz/lbs) is pure fixed math (1oz = 28.35g,
  always, for any food) -- unlike volume (a cup of flour vs honey) or count-based units (medium vs large
  banana) which genuinely need per-food data Cronometer has and FatSecret may not. Build universal weight
  conversion as a system-wide layer for every food regardless of source, and fix the Additional Servings
  unit-lock on custom foods to at least match what FatSecret-sourced foods already get. Directly relevant to
  the nutrition label scanner (SPEC_nutrition_label_scan.md) since labels sometimes print oz-only servings
  with no gram equivalent.
  BUILT 2026-07-21: `utils/unitConversion.ts` -- fixed-math conversion within the weight group
  (g/kg/oz/lb) and volume group (mL/L/cup/tbsp/tsp/fl oz), cross-group (weight<->volume) deliberately
  returns null, never guesses. Wired into Additional Servings in both CustomFoodCreator and EditFoodModal:
  each row gets a small unit button (only shown when the primary serving's unit is actually convertible --
  hidden for container/serving/pill-type units) that lets you type an alternate serving in a different unit
  from the SAME group and has it convert into the primary unit automatically. The STORED number never
  changes shape (still a plain number in the primary unit, same as before), so nothing downstream (logging,
  the serving picker, Food Detail) needed to change at all. 24 tests passing. KNOWN pre-existing edge case,
  not introduced by this build: changing the PRIMARY serving unit after Additional Servings already have
  values doesn't retroactively re-convert those stored numbers -- this was already true before unit choice
  existed (they were always "in whatever unit primary happens to be"), just now more visible. Not fixed,
  not blocking, noted for later.
- [surfaced 2026-07-20, faith, needs scoping discussion] **Smart keyword search for Reading Plans /
  Devotionals.** Idea: searching a term like "masturbation" or "lust" should surface relevant devotionals
  even when the actual title (e.g. "Sexual Integrity") doesn't contain the literal search word. This is a
  synonym/keyword-mapping problem, not a plain text search -- needs a real scoping discussion (hand-built
  keyword map vs. something AI-assisted) before treating as a scoped task.
- [surfaced 2026-07-20, needs scoping discussion] **Food Insights / Nutrition Coach** (was "Food health
  score"). Scores individual foods/meals on two axes: (1) fit to the user's current goals (macros/calories
  at that moment -- the original idea), and (2) general nutritional quality/satiety value, independent of
  today's goals. Follows the Sleep/Recovery Coach's locked hybrid pattern (deterministic engine computes the
  real finding, AI phrases the tip at runtime) rather than being a bespoke system. OPEN, discuss before
  building: the app already has a lot of scoring/insight surfaces (Day Score, Sleep Score, EvR report,
  Custom Reports, Smart Tips) -- need to decide whether this is a standalone new card or plugs into one of
  those (a Custom Reports block, a Smart Tips category, a food-detail section) before scoping further.
  Related: HRV/recovery-food correlation (surfaced 2026-07-20) -- correlating recovery score (not narrowly
  HRV, too noisy day to day) with dietary patterns/timing. Real data pipes already exist (HealthKit +
  FatSecret logs), but needs a real minimum-sample-size confidence gate before surfacing any correlation
  claim (same spirit as EvR's 7-day minimum) -- otherwise it risks presenting coincidence as insight, which
  conflicts with the app's honest-numbers standard. This is really a Recovery Coach feature that consumes
  food data more than a Nutrition Coach feature, same hybrid architecture, different home domain -- house it
  wherever the Recovery Coach insights end up living.
- [surfaced 2026-07-20] **AI Recipe Assistant (consolidated).** One AI recipe-generation engine with three
  entry points, not three separate features: (1) generate from macro targets using existing profile data,
  (2) generate from an ad-hoc typed ingredient list ("what's on hand today" -- no persistent fridge
  inventory, that idea was explicitly cut since few people would maintain it), (3) reverse-construct a
  recipe hitting an exact macro number. All three output into the existing Recipe Builder form (reuse, not
  new UI). Grocery list export is a downstream add-on -- only makes sense once a real multi-item plan exists
  to export from, don't forget it when building whichever entry point ships first. Recipe Importer
  (screenshot/Instagram/website link -> autofill ingredients/instructions/nutrition) is a SEPARATE build
  from this engine -- different tech (parsing/extraction, not generation), lower AI-quality risk since real
  data already exists to extract, likely the best one to build first if this cluster gets picked up. No
  build order decided -- just captured so nothing gets lost. Monetization TBD for all of it, decide
  per-piece when actually built.
- [surfaced 2026-07-20, Pro perk, CONFIRMED keep] **Custom App Icon Colors.** Manual icon color/theme picker
  for members, matching existing theme palette (Slate/Warm/Blush etc), NOT auto-tied to the accent selector
  -- picked separately. Needs a new native module (expo-alternate-app-icons or manual config) and a new
  build -- Justin: build cost is a non-issue, he's on the Expo starter plan with a monthly allowance.
  Process: one simple design session playing with different theme/color options, Justin green-lights the
  final set, then build.
- [surfaced 2026-07-20, Pro perk, CONFIRMED keep] **Profile Header Frame/Border.** Subtle accent-colored
  ring/frame around the avatar in the profile header, for members. Exact style still needs a dedicated
  design discussion before building.
- [surfaced 2026-07-20, CONFIRMED keep, free] **Visual Portion Size Guide.** Real-world comparisons ("size
  of a deck of cards," "size of a fist") shown during logging to help estimate portions without a scale.
  Static content (illustrations + comparison text), zero ongoing cost -- no AI/API calls, nothing to gate or
  meter. Won't fit every food type equally well (intuitive for meat/protein/grains/veggies, not for liquids
  or mixed/packaged dishes), so scope is "optional assist on common single-ingredient foods," not a promise
  of precision everywhere. STILL OPEN: exact placement (add-food, CustomFoodCreator, food-detail serving
  entry) and design details -- figure out when we get to it.
- [PARKED 2026-07-19 -- shipped parts in RECENTLY SHIPPED, full story in the archive] **Some screens still
  feel slow to open, cause unidentified.** Haptic delay is fixed and 4 screens' data loading is batched (see
  RECENTLY SHIPPED), but Settings and Achievements feel IDENTICALLY slow on TestFlight despite Achievements
  getting a far bigger backend fix -- proves the remaining feel isn't primarily about data loading or
  redraw count. PARKED: EAS build credit hit 80% of the period's limit, true "instant" on a real slide
  transition isn't realistic anyway, and further digging was diminishing-returns. Revisit only with a
  specific new lead, not another blind sweep.
- [NOW, PENDING JUSTIN'S REVIEW, surfaced 2026-07-19] **Rewrite devotional reflections so they don't
  directly quote KJV wording -- full pass complete, needs a read-through before closing out.** The WEB
  translation feature is otherwise fully shipped (see RECENTLY SHIPPED). `data/devotionals.ts`'s written
  reflections (our own commentary) quoted scripture directly in KJV-style phrasing in a lot of spots, so
  under WEB the passage above read modern but the commentary below it suddenly read 1611 English.
  APPROVED APPROACH (Justin signed off): paraphrase the idea in plain original voice instead of quoting
  either translation's specific wording -- same technique demonstrated on the Isaiah 41:10 example.
  DONE THIS SESSION: went through all 15 devotionals in the file top to bottom (the 11 multi-day ones plus
  the 4 single-day "Need a Word Right Now" ones) and rewrote every direct or near-direct scripture quote
  found in the commentary -- real count landed at 57 individual spots, well above the original 14-quote
  keyword-search estimate, confirming Justin's read that a manual pass would catch a lot more than
  thee/thou/thy/hath/saith-style keyword hits alone. File type-checks clean in isolation. NOT marked
  shipped yet -- needs Justin to actually read through some of the rewritten reflections in-app (or in the
  file) and confirm the paraphrases still land right before this closes out.
- [surfaced 2026-07-19, discuss next -- these were queued behind the Bible translation work] Still open
  from the original batch logged this session: **(2) Coach Insight card's EvR link with no eligibility
  check** (see next item below, already detailed), **(4) nudging Exploring/NRN users toward growth**
  (needs real discussion, easy to violate the NRN opt-out), **(6) more
  Reading Plans/Devotionals?** (open-ended, no specific gap named yet), **(7) default home card order vs.
  watch ownership** (now PINNED for its own discussion, see below).
  **(5) Gratitude card NRN version -- CLOSED 2026-07-25, no work needed.** Verified in code, not assumed:
  the card takes faithJourney, Home passes it, and for NRN the scripture block AND the divider above it
  are hidden so nothing sits orphaned. The rest of the card was already secular ("Gratitude Streak",
  "What are you grateful for today?", "Log Gratitude"), and all 15 gratitude notification variations
  across the 3 coaching modes contain zero faith wording. Card also ships defaultVisible: false, so an
  NRN user only sees it if they add it themselves. ONE NOTE, not a bug today: the hide is keyed on
  `variant === 'home'`, i.e. WHERE it renders, not WHO is looking. Equivalent today (the other two mount
  points are the Faith tab and Bible, which NRN cannot reach), but if that card ever lands somewhere new,
  scripture returns for NRN by default. One-line hardening if it ever matters: key it on the tier alone.
- [surfaced 2026-07-19] **Coach Insight card links to EvR report with no eligibility check.** The Home
  card's "View in Effort vs Results" link always shows, even when the user hasn't hit the 7-day minimum to
  generate a report (confirmed on Megan's account: 1/14 days logged, card still links out). The report
  screen itself already has a correct gate (`minDaysForWindow` / `insufficientData` in
  diagnostic-report.tsx, shows a real "Not Enough Data Yet" state) -- the Home card just never checks it,
  so new users hit a confusing dead-end. Justin: bad first impression, wants this discussed before build.
- [surfaced 2026-07-19, faith, needs discussion] **Nudging Exploring/NRN users toward growth without
  breaking NRN's "hidden, no judgment" rule.** Open question, no direction yet. Only existing mechanism
  today is the dismissable 30-day "faith settings can be changed" reminder. Needs real discussion before
  any concrete idea gets proposed -- easy to accidentally violate the opt-out.
  IDEA surfaced 2026-07-24 (Justin, while confirming NRN has no Faith tab access): some kind of sample/
  manual entry point into faith content for NRN users -- a soft, optional taste rather than the hard wall
  that's there today. Floated, not designed, not discussed in depth -- fold into this item when it's
  actually picked up.
- [surfaced 2026-07-19, faith, needs discussion] **More Reading Plans / Devotionals?** Open-ended, no
  specific gap identified yet -- discuss whether the current plan/devotional library is thin somewhere
  specific before treating as a scoped task.
- [PINNED 2026-07-25 -- Justin's call: needs a real discussion first, he has more in his head than what's
  written here. Do NOT start building off this item as written.] **Default home card order vs. watch
  ownership.** Sleep/Recovery and other wearable-dependent cards sit high in every mode's default order,
  but for non-watch-wearers (or inconsistent wearers) those cards may be a near-permanent empty-state
  eyesore. Needs its own design session.
  GROUNDWORK DONE 2026-07-25 (read from code, so the discussion starts ahead):
  - The problem is SMALLER than this item's original wording. "Wearable-dependent cards" is really ONE
    card: Sleep & Recovery. STEPS IS NOT WATCH-DEPENDENT -- the iPhone counts steps by itself.
  - Current rank of Sleep & Recovery: 6th in DEFAULT_ORDER, 4th in DISCIPLINE_ORDER, **2nd in
    MINDFUL_ORDER**. Mindful is the worst case: a non-wearer gets an empty card in slot 2 of the calmest
    mode.
  - The signal already exists and is already honest: `hasHealthData` in useHealthKit.ts is true only once
    a real value has actually come back, and its comment explains why the permission flag lies (iOS
    resolves requestAuthorization even when the user denied). `sleepHours` alone is the SHARPER signal --
    someone can have an iPhone feeding steps and no watch feeding sleep.
  - CORRECTION: CLAUDE.md documents a `healthkitConnected` key in pj_settings, but NOTHING in the
    codebase reads or writes it. It does not exist. Do not plan around it.
  - The real fork to decide is design, not tech: REORDER at onboarding off a detected signal, vs. LEAVE
    the card in place and let it quietly step down after N days of no data. The second is less magical,
    reversible, and doesn't require guessing about a user at the moment they've told us the least.

- [found 2026-07-18, follow-on to the bar gradient above] **Ring/donut gradient pass.** Same molded
  3-stop recipe (`utils/barGradient.ts`), applied to SVG stroke arcs instead of flat View fills. 6 real
  files have actual progress-ring arcs (not just decorative circles), confirmed via `strokeDasharray`
  grep: app/(tabs)/index.tsx (calorie/recovery ScoreRing), components/SleepDonut.tsx (shared, 2 places),
  app/food-detail.tsx, components/DaySummaryModal.tsx, components/StatsGraphCard.tsx,
  app/onboarding/your-style.tsx -- likely 8-10+ ring instances total once counted inside each file.
  Same technique as the bars (SVG `<Defs><LinearGradient><Stop>`, `stroke="url(#id)"` instead of a flat
  colour), but each ring needs a UNIQUE gradient id so multiple simultaneous rings on one screen (e.g.
  calorie + recovery both visible on Home) don't collide -- more moving parts than the bars, hence its
  own pass rather than bundled in. Justin's call to hold off same night as the bar treatment shipped.
- [found 2026-07-16] **Centralize the card shadow (stop the drift at its source).** Purely preventive --
  ZERO visual change -- so it is ranked below anything a user can see. But it is the thing that ends the
  bug class: every card hand-rolls 5 shadow props, and that produced FOUR different failures in one sweep
  (hardcoded black x3, wrong opacity, missing offset/radius, clipped by overflow -- full history in the
  archive). Smallest useful version: export ONE `cardShadow(theme)` from GradientCard and have every
  hand-rolled card spread it -- then "make cards deeper" is one number, not a 40-site hunt. The FULL fix is
  migrating cards to `<GradientCard>`, but that needs GradientCard's OWN hardcoded '#000' @0.12 shadow
  fixed first or every card gets worse, and each card passes different props, so it is a real refactor.
- [QUICK WIN, found 2026-07-15, PARTIAL] **Otto (+ Halo?) FAB placement audit.** The floating companion FAB
  sits bottom-left on many stack screens and can overlap the last card's content when the page has no
  bottom padding. FIXED so far: sleep.tsx + achievements.tsx (paddingBottom bumped to `insets.bottom + 96`),
  add-food.tsx (FlatList had zero bottom padding, same fix -- covers both "Food Library" and "Add to
  [Meal]" modes). workout.tsx CHECKED, clears fine at rest, not a bug. STILL OPEN: full sweep of every
  other Otto-FAB screen (day-detail, day-summary, settings, etc.) for the same clearance, and whether Halo
  needs the same pass.
- [VISUAL REFRESH -> OWN DESIGN PASS] **Bible's Reflect bar does DOUBLE DUTY.** One tinted strip is
  simultaneously (a) a BUTTON -- the left flex:1 region is a tap target opening the reflection modal, or the
  journal once reflected -- and (b) a TOOLBAR holding four unrelated icon buttons (sun / star / share /
  Halo). The tint says "I am one thing you press" while four parts of it do four different things and only
  the left half does what the label says. FIX = split the double duty: "Reflect" becomes a real tinted pill
  that shines like any other action button, the four icons go on a flat strip or the page itself. Needs its
  own screenshots. NOT free: the sun + star icons are TUTORIAL TARGETS. (Rule-correction history on
  shine-scales-with-area is in the archive/spec -- short version: a wide button alone is fine, repetition
  is what read as plastic, not width.)
- [TRACK, VISION LOCKED + SPECCED 2026-07-07, SLICE 1 SHIPPED -- see RECENTLY SHIPPED] Custom Reports
  (Pro) remaining work. Model: report = date range (week/month/3mo/6mo/1yr/custom) + chapters, each a
  PICKER into a library of ~55 pre-designed blocks the user assembles freely; templates = pre-filled block
  sets; exportable (PDF/share); Pro-gated (free = no access; faith DATA still free elsewhere); Mindful +
  faith-tier aware; wearable-gated blocks. Premium is protected because WE design every block (user picks
  WHAT, never HOW it looks). Phase 2 = AI prompt that ASSEMBLES blocks from plain language. Full detail +
  tiered block catalog: SPEC_custom_reports.md. REMAINING: grow the block library toward ~55, custom date
  range UI, export (PDF/share), templates, per-chapter faith-tier/wearable gating in the picker, tooltip +
  Otto KB entries.
- [FIX IMPLEMENTED 2026-07-23, PENDING DEVICE REINSTALL VERIFY] Achievement unlockedAt reinstall hardening.
  Badges stamp unlockedAt = new Date() at award time; on a reinstall before the cloud restore lands, a check
  could first-unlock against an empty store and re-stamp the whole earned set to "today" (this was the
  June-22 clump on Justin's test account) -- a RACE, not a logic bug (checkAndUnlock is already idempotent).
  FIX: `checkAndUnlock()` in achievementData.ts now bails out early via the existing `isSyncReady()` restore
  gate (services/syncService.ts), same flag already protecting storage writes elsewhere, so no achievement
  scan can run until the restore lands. tsc clean. Needs a real device reinstall to confirm the race is
  actually closed -- can't be verified any other way. (Surfaced via the Custom Reports "Achievements
  earned" block 2026-07-07.)
- [PARKED 2026-07-12, known limitation, do not keep prompt-tweaking] EvR ranked diagnostic card INSIGHT (the middle
  "why" sentence) occasionally comes out rambling/circular -- e.g. the sleep->workout card kept landing on "...the
  session you planned simply does not happen," which just restates the claim+proof and reads weird. INVESTIGATED:
  the insight is AI-voiced fresh each report (utils/coachAI.ts voiceDiagnosticCards + FEED_VOICE_RULEBOOK), so
  there is NO fixed string to edit; it varies (good version seen: "your body treats poor sleep as a recovery debt,
  skipped sessions are the first thing it trades away to pay it"). Root of the weird ones: on cards where claim +
  proof already state the outcome, the AI pads the insight by re-stating that outcome. TRIED TWICE (2026-07-12):
  two FEED_VOICE_RULEBOOK nudges (ban mechanisms/filler; then a coherence/no-ramble nudge that even quoted the bad
  sentence) -- BOTH slipped through; prompt-steering can't GUARANTEE an LLM avoids a phrasing. Both reverted; code
  is at the clean baseline. Justin chose to leave as-is (2026-07-12), accept the variance. IF revisited, the only
  RELIABLE (deterministic) fixes are: (a) a post-generation filter in the voicer that rejects insights matching
  bad patterns (whack-a-mole), or (b) DROP the insight sentence on these cards entirely (claim+proof+lever already
  stand strong) -- trade-off is losing the occasional good insight. Not a copy-string audit; it's an AI-output
  problem. Files: utils/coachAI.ts (FEED_VOICE_RULEBOOK, voiceDiagnosticCards, sanitizeVoicedLine).
- [EXPLORE, unspecced -- raised 2026-07-13 from the gym. Do AFTER the monetization/Support track closes.]
  Four raw ideas, ranked by how real they are. NONE are specced; each needs a design pass before any code.
  1. [MOST REAL] GOAL WEIGHT + GOAL DATE ("by when"). Today the user picks a PACE and the app derives the date.
     Invert it: let them pick a TARGET DATE too (e.g. "175 -> 162 by late January, when the baby comes") and the
     app back-solves the weekly pace + calorie target to land on that date. Uses math that already exists (pace <->
     deficit <-> target), just run backwards. CRITICAL SAFETY TIE-IN: an aggressive date can demand a deficit that
     drops the target under the calorie floor -- utils/calorieFloor + CalorieFloorModal ALREADY handle exactly this
     (warn + consent, never hard-block, offer the fastest SAFE pace), so the branch is built. Surfaces: onboarding
     + Profile. Open questions: what happens as the date approaches and they're off-pace (silently re-solve? nudge?),
     and the Mindful variant (a countdown to a weight is the most judgment-heavy thing in the app -- probably neutral
     or off). See SPEC_calorie_floor.md.
  2. [DESIGNED 2026-07-13 -> SPEC_drink_builder.md. The BEST of these four ideas.] COFFEE DRINK BUILDER
     (Starbucks/Dunkin). You cannot log a real coffee order anywhere -- every app has ONE fixed "Grande Latte"
     entry and nobody drinks that. This builds the drink from components: shop -> drink -> size -> milk -> syrup
     pumps -> extras. It is ARITHMETIC, not guesswork (a pump of syrup, an ounce of oat milk, a shot of espresso
     are all published, stable numbers), so it satisfies the honest-numbers rule BY CONSTRUCTION -- unlike the
     restaurant-database idea, which never can. Offline, no API, no AI. Days, not months.
     DESIGN TRAP already caught: milk volume depends on the DRINK, not the size (a grande latte is ~12oz of milk;
     a grande iced coffee is a ~2oz splash), so each drink+size carries milkOz + shots + standardPumps.
     SHOWS sugar (for coffee, sugar IS the story) and captures caffeine in the table even before it's surfaced.
     ⚠️ GATING ITEM = the DATA AUDIT (Phase 1 in the spec): enumerate BOTH menus fully before any code. Starbucks
     SYRUPS vs SAUCES differ; Dunkin FLAVOR SHOTS (unsweetened, ~0 cal) vs FLAVOR SWIRLS (sweetened) is the
     single easiest thing to get backwards, and it would make every Dunkin number wrong.
  3. [RESEARCHED 2026-07-13 -> SPEC_restaurant_mode.md. NOT approved to build.] RESTAURANT MODE ("what should I
     order"). MenuFit teardown DONE, do not redo it. Findings: it's a DECIDER not a logger; its good part is
     composing + scoring a full order at CHAINS with a one-line insight; it works only because chains PUBLISH
     nutrition data. At LOCAL restaurants it is HOLLOW -- Justin looked up BurgerUp and every item showed `0 cal`
     (scraped menu text, no nutrition). FatSecret's chain data is ACCURATE (verified vs official: Big Mac,
     McDouble, CFA nuggets all within ~10 kcal or exact), and `food_brands.get?brand_type=restaurant` gives a
     restaurant list -- but there is NO endpoint to enumerate a brand's foods (workaround: paginated brand search,
     completeness not guaranteed). THE EDGE WE'D HAVE: MenuFit only knows your GOALS; we know your REMAINING
     macros today, and we can log the order in one tap (their own users beg for MFP integration). Real feature,
     not a weekend. Full teardown, data feasibility, v1 shape, risks + the "don't build this from FOMO" warning:
     SPEC_restaurant_mode.md.
  4. [RESEARCHED 2026-07-13 -> DEAD END as a competitor, but ONE idea worth keeping.] TRAINERIZE is B2B software
     for personal TRAINERS (build a program -> assign it to a client -> message them -> take payment). 400k
     trainers, 1.6M clients. The trainer is the customer; the client just receives what they're given. That is the
     OPPOSITE of Project J (a consumer app for someone coaching themselves, "you vs yesterday"). Nothing to copy
     at the product level. Do not revisit as a competitor.
     >> THE ONE THING WORTH STEALING: **OTTO AS A WORKOUT/ROUTINE BUILDER.** Trainerize's AI workout builder lets
     a trainer describe goals + preferences and generates the workout. WE ARE ALREADY MOST OF THE WAY THERE: Otto
     already knows the user's REAL exercise library (live union of pj_exercise_library + programs + weekly template
     + PR'd lifts), their PRs, per-lift trends, recent sessions, and training frequency -- and he can already
     DISCUSS training ("what's a good chest workout"). The missing step is small: let him BUILD one. "Otto, make me
     a push day" -> he generates a routine using exercises the user ACTUALLY HAS -> one tap saves it into the
     Workout Library as a program/routine. Turns Otto from knowledgeable into useful.
     OPEN QUESTIONS before build: does he propose sets/reps/weight (and from what -- their PRs? their last
     session?); what happens when he suggests an exercise they DON'T have (offer to add it to the library?); does
     it respect the weekly template; Mindful behavior (a prescriptive "here's your workout" is judgment-heavy);
     and the honest-numbers rule (never invent a weight that looks like a recommendation from their data if it
     isn't). Reuses the conditional-injection pattern from utils/companionPRs + companionWorkouts.
- [ ] QUICK WINS (small, grab-when-convenient): none queued right now -- add here as they come up. (DONE 2026-07-07: FAB text-label rings app-wide · inline Add Exercise button · the whole gym list.)

---

## 🚨🚨🚨 REVERT BEFORE APP STORE LAUNCH 🚨🚨🚨 (TESTFLIGHT-ONLY HACKS - DO NOT SHIP)
>>> ⚠️ 2026-07-13: **LAUNCH_CHECKLIST.md IS NOW THE SINGLE SOURCE OF TRUTH.** It consolidates this banner, the
>>> LAUNCH BLOCKERS section below, and the launch-only notes in SPEC_monetization.md into ONE ORDERED list --
>>> ordered because several of these steps BREAK THE TESTERS if done in the wrong sequence (the beta caps cannot
>>> be reverted until testers are on a RevenueCat build AND have been granted the entitlement). Every item there
>>> was verified against the real source with file:line. Work from that file. The lists below stay for context.
Temporary for Justin's TestFlight testing (added 2026-06-24). EVERY ONE must be undone/replaced before a public release. Check this list at EVERY launch-prep session.
1. [RESOLVED IN CODE 2026-07-01] Anthropic API key was bundled client-side; now routed through the aiProxy Cloud Function (key server-side only, client grep clean). TWO TAILS STILL OPEN: (a) client change reaches testers only on the NEXT TestFlight build; (b) the previously-exposed key must be ROTATED (regenerate + revoke) after testers are on the new build, before public launch.
2. ⚠️ devProUnlocked = FREE UNLIMITED PRO. Settings dev toggle grants Pro with no payment. Before launch: gate Pro on a real subscription (RevenueCat/StoreKit) and REMOVE the override + toggle.
3. ⚠️ AI ESTIMATOR QUOTA RAISED. PRO_LIMIT bumped to effectively unlimited (services/aiMealEstimator.ts). Before launch: restore real caps.
4. ⚠️ BETA CAPS RAISED (2026-07-01). Otto FREE_DAILY_CAP 10->100/day; Halo 5->50/day; AI Meal Estimator FREE_LIMIT 3->100/month. All marked with loud BETA HACK comments. Before launch: revert to 10 / 5 / 3 (or final caps).
5. ⚠️ CUSTOM REPORTS OPEN TO ALL (2026-07-07). Reports is a Pro feature but REPORTS_BETA_OPEN=true in app/reports.tsx grants every TestFlight user full access. Before launch: gate on the real subscription + set false (the Pro-gate architecture is already in place, so it's a one-line flip).
7. ⚠️ **DEV TOOL SWEEP -- do these as ONE pass, not one at a time** (item raised by Justin 2026-07-22 after
   the OCR Test row came up a third time). Settings has accumulated a pile of "(dev)" rows: the OCR Test
   diagnostic (added with the label scanner), the Weight History self-test below, tooltip resets, seed/clear
   tools. NONE should be visible to a public user. Decide once at launch prep: gate the whole dev-tools
   section behind a build flag, or delete the rows outright. Do not keep pruning them individually.
8. ⚠️ **`[pitch]` DIAGNOSTIC LOG LINE (added 2026-07-31, functions/src/appCompanion.ts).** Prints
   `{status, pitchRequested, budgetHasRoom, pitchAllowed, pitched}` on every Otto message so the pitch could
   be debugged from the outside. It logs no chat content, so it is not a privacy problem, but it is noise in
   production and must come out. Keep it until items B and C are finished -- it is the only window into
   whether the pitch fired.
6. [DEV TOOL, not user-facing] "Weight History self-test (dev)" row in app/settings.tsx dev tools (added 2026-07-10). One-tap self-test that seeds/edits/deletes throwaway far-back dates + asserts data-integrity/badge rules, auto-cleans. Same class as the other "(dev)" seed tools -- remove or gate them all behind a dev flag before public launch. Safe (only writes to confirmed-empty dates) but should not ship visible.

---

## 🚧 LAUNCH BLOCKERS
- [RESOLVED 2026-07-18] App name -- **GoodForge**, locked in. Old shortlist (Prevail/Steadfast/Worthy/Haven/
  Witness/Sown) killed 2026-07-13, do not resurrect. GoodForge verified available (App Store search, App Store
  Connect name-field save, web search) and confirmed accepted in App Store Connect. Full rename pass done
  same session: app.json display name + iOS permission strings, sign-in wordmark, all in-app strings
  (settings/report/FeedbackModal/onboarding x4), Otto + Halo's knowledge base, Cloud Function email sender
  (redeployed), privacy.html + terms.html (dates bumped), package.json/theme.tsx/typography.ts comments.
  Bundle identifier, EAS slug/scheme, and the Firebase project ID/hosting domain deliberately left untouched
  (technical identifiers, not user-facing, not renameable in Apple's/Google's case) -- Justin confirmed fine
  leaving those. STILL OPEN: fresh EAS dev build needed for the iOS permission-prompt strings to actually
  show the new text on-device (pure JS parts already correct on next reload).
- App Store Connect setup -- privacy label, age rating, URLs, description, screenshots, review notes. No code. Do after name is locked.
- IN-APP PURCHASE METADATA (all 7 products: 5 tips + supporter_monthly + supporter_annual). Apple requires a
  REVIEW SCREENSHOT on every IAP before the first App Store submission, and the first app version must be
  submitted with at least one IAP attached. As of 2026-07-28 NONE of the 7 have a screenshot. TestFlight and
  sandbox do NOT enforce this, so it will look fine right up until submission. Also confirm LOCALIZATION
  (display name + description) on all 7 while you're in there -- `tip_founder` shipped 2026-07-27 with no
  localization, which silently made Apple treat the product as invalid: the app asked the store for it, the
  store returned nothing, and the tile toasted "Tips aren't available right now." The status column read
  "Prepare for Submission" the whole time, identical to the four working tips, so the list view will NOT
  warn you. Product IDs themselves were verified correct across config.ts, support.tsx, App Store Connect
  and RevenueCat.
- Verification scan -- production build, device install, all flows confirmed before submitting.
- Anthropic account spend limit -- hard monthly spend cap in the console so AI cost can never run away (the final "sleep at night" switch on top of per-user daily caps).
- [RESOLVED IN CODE + DEVICE-VERIFIED 2026-07-01] Security #6: move ALL direct third-party API calls behind Cloud Functions. DONE (Anthropic + FatSecret). Same two tails as REVERT #1 (next build + key rotation).

---

## 🔎 POST-TRIP / PENDING FRESH-BUILD VERIFY
- [ ] WATER ENTRY DELETE/EDIT (data-loss fix): confirm deleting/editing a water entry no longer drops other entries. Fixed to re-read + reconcile storage and remove/edit only the targeted entry by timestamp. ⚠️ still live in the trip build until rebuilt.
- [ ] WATER BAR LENGTH: confirm the Home water bar fills correctly on cold launch (was stuck short every kill+reopen; fixed with a live pctRef).
- [ ] WATER GOAL ACHIEVEMENT: confirm hitting the water goal pops the trophy + marks the daily-goals counter today. Also watch whether daily-goal TOASTS actually pop for steps/active/exercise (suspected batch/no-pop).
- [ ] DAILY GOAL ACHIEVEMENTS: warm-app skip/batch still open (needs a goal-hit to verify; wrong-date fixed 2026-06-29). See archive for the 3-part breakdown.
- [ ] FIBER LABEL: EvR "food quality" card now reads "FIBER AVG/DAY" -- confirm.
- [ ] OPTIONAL HR ZONE BAR REDESIGN: one full-width segmented bar vs independent per-zone bars. Numbers honest either way; visual call.

---

## 📌 PARKED SMALL IDEAS (do when convenient)
- [ ] [NEEDS DESIGN] Goal-hit does NOT reverse when you delete the entry that crossed the goal (e.g. quick-add water over goal, then delete it -> still shows "achieved today"). Cosmetic (no data loss) BUT reversing is thorny: crossing a goal increments a LIFETIME count feeding goal achievements + streaks, so un-crossing means decrementing + possibly re-locking an achievement (fights "achievements never revoke"). Do NOT bolt on a naive reversal.
- [ ] Achievement "pop on the action" timing: action-earned achievements don't pop until next app-open (per-category check gated once/day, runs on open before the action). Fix: run the check right after the qualifying action + let a same-day action bypass the once/day gate. BEST DONE with the notification-hub work.
- [KILLED 2026-07-05] "Manage in Settings" in-app hotlink -- NOT VIABLE. Linking.openSettings() only opens the app's generic iOS page (Local Network / Camera / Siri / Cellular), which has NO Apple Health row, and iOS exposes no deep-link into the Health data-access screen. A button there would mislead. RESOLVED INSTEAD via Otto: his KB gives the correct manual route (Settings > Privacy & Security > Health > Project J, then toggle data types) and is told never to point at the app's iOS page or the in-app Health section. Deployed 2026-07-05.
- [ ] "View all achievements" button in the Stats Records or Streaks section (trophy icon in the header is buried).
- [ ] [TS CLEANUP, low] add-food.tsx line ~1526: pre-existing tsc error -- the favorite object built on heart-tap isn't assignable to MyFood[] (MyFood type drifted from the object shape: brand/isMyFood/fsId/type). Runtime-safe (Metro strips types, fields have safe defaults), no crash/data loss. Just makes the file not tsc-clean. Tidy the MyFood type or the object shape eventually.

---

## ⭐ HIGH-PRIORITY OPEN (bigger tracks)
- [HIGH] Onboarding full pass -- functionality sweep AND apply the new gradient/aesthetic treatment across all onboarding screens. Dedicated session. app/onboarding/*.
- [HIGH] Lifting analytics layer (DEEPER stats only -- core PR feature already SHIPPED 2026-07-04: per-lift PR detection + revoke/honesty engine, All-PRs home + per-lift Records, Otto PR data). REMAINING/parked: 1RM trend as a graphable stat, surface PRs in EvR, volume per muscle group. Full spec: SPEC_lifting_log.md. PARKED for now (Justin 2026-07-05, not the next session).
- [HIGH] Tutorial + tooltip full audit -- in progress, tab by tab (batches of 3, device-tested each). REMAINING: spotlight lag (TestFlight verify), hidden-card guard, Log Today's Total interactive tutorial, tooltip audit + wording passes, flag every card missing a (i). data/tutorials.ts + tooltipRegistry.ts.

---

## 🗂️ OPEN BACKLOG BY AREA (open/future only; shipped history is in the archive)

### Onboarding
- Mindful onboarding -- encouragement language + Mindful-specific Screen 4 copy (graph/presets already gated off). Copy pass.
- Macro presets -- Screen 4, Discipline/Balanced only. Also settable in Settings.
- Progress bar on onboarding screens -- segmented step indicator, screens 2-7.
- Apple Health home banner for skippers -- one-time dismissable banner (pairs with the openSettings hotlink above).
- Weight projection graph -- profile page version (onboarding version built; profile.tsx not).
- Daily Intention card for Not Right Now users -- Today's Message morphs for NRN. Low priority.

### Home / UX
- Day detail BMR row -- add estimated BMR to the calorie breakdown (Consumed/Burned/Net).
- Exclusions polish -- first-use callout on calendar dot; help article; excluded-list view (view + un-exclude); three entry points.
- Day Summary card enhancements -- configurable surface time, earlier-access home card option, richer multi-day context. Design session first.
- Day Summaries archive layout -- collapsible rows may get clunky at volume. Revisit at 8+ weeks history.
- Greeting area customization -- settings picker for the top-left home header slot. Design session first.
- Physical measurements in profile -- waist/neck/hip (enables Navy body-fat estimate).
- HealthKit permissions audit -- review requested vs available data types; add high-value metrics before next build.
- Loading + error states audit -- sweep all screens for flashy load behavior + silent failures.

### Food & Log
- Big 3 macro presets -- quick protein/carb/fat picker from the macro gear icon and/or Settings.
- Food search fuzzy matching -- local results use exact substring only; add fuzzy/Levenshtein. add-food.tsx.
- UNSET button on food detail -- unset a barcode-linked food without visiting Set Foods. Needs barcode route context.
- SET banner tip -- DONE 2026-07-22, see RECENTLY SHIPPED. Rebuilt as a quiet bordered banner + real Create & Set button. (A retire-after-N-scans idea was built then cut: Justin never approved it, doesn't want the tip to ever disappear.)
- Calorie target transparency -- (i) tooltip explaining how the recommendation is calculated (BMR/lifestyle/pace). settings.tsx.
- KNOWN LIMITATION (2026-07-27, accepted -- do not "fix" by accident): **a recipe does not track edits to
  a custom food inside it.** Adding an ingredient COPIES its numbers; there is no link back to the source
  food. So correcting a wrong sodium value on a My Food leaves every recipe containing it on the old
  number until the ingredient is re-added. This is the deliberate cost of recipes being snapshots -- the
  same property means deleting a food never breaks a recipe, and never breaks a meal already logged from
  it. Changing it means recipes recompute from live foods, which trades one surprise for a worse one.
- KNOWN LIMITATION (2026-07-27, minor): **an entry logged from a My Food that is later DELETED falls back
  to the old serving-label behaviour** on Edit Entry -- i.e. it can show the "3 oz. · 1 g" style label the
  2026-07-27 fix removed. The screen resolves the food record to know its real base serving; with the food
  gone there is nothing to resolve, so it degrades to the previous behaviour. Nothing breaks and the
  numbers stay correct; only the serving label misreads, and only for entries whose food no longer exists.

### Workout
- Load routine modal polish -- editable/deletable presets are a bigger dedicated-session item.
- Workout tab muscle group breakdown -- aggregated session-level summary (MuscleMap is per-exercise only).
- Daily exercise + active-calorie goal progress display -- goals settable + celebration fires, but no home progress display. Design decision: Fitness Metrics card vs Activity Rings vs under Steps.
- Onboarding-to-home transition -- guided first steps post-onboarding, no cold drop-off. Planning session.

### Stats & Reports
- Comparison + calendar CPP polish pass -- confirmed-needed ("hideous, very cheaply done"). All 4 presets + day-vs-day work.
- [PARKED] Body Fat as a graphable metric -- the other four (VO2 Max, Resting HR, Resp Rate, Blood O2) ALREADY ship: live in the graph creator + trend engine + At a Glance (registry/roadmap was just never crossed off). Body Fat (bodyFatPct) was retired 2026-06-17; now restorable off Body Measurements (Navy BF%), but SKIPPED for now per Justin 2026-07-05.
- Trend indicators -- Apple-style up/down arrow on graph values / At a Glance vs prior period.
- EvR refinement pass -- correlations need to be genuinely smart. Hard to test without data. Revisit with Smart Tips.

### Faith
- Today's Message overhaul -- CORE COMPLETE 2026-06-23. Remaining: 5-theme audit + the next-up Bible tutorial.
- Cycling Bible verses -- fine-print on Log + Workout tabs. Rooted on / Exploring optional / NRN hidden.
- Plans hub browsing -- category grouping, filter chips, search. app/plans.tsx.
- Bundle full KJV offline -- today fetches from GitHub (breaks offline); bundle ~4MB. data/bible-web.ts.
- Achievement toast remaining -- trigger context under achievement name; wording update before launch.
- Bible translation selector -- picker in the Bible gear modal. KJV only today.
- Faith AI verse-banner share tap-through -- tapping outside the share sheet highlights a random verse. Cosmetic.
- Challenges/Missions layer -- full spec in SMART_COACH_SPEC.md. Parked behind the Faith AI track.
- Donate/Support button -- post-TestFlight. StoreKit tip jar or Ko-fi. Not urgent.

### Sleep & Recovery
- [SHIPPED, verify pending] Recovery Score is wired into weekly + monthly summaries (avgRecoveryScore + HRV/cardio-recovery/prev-activity factors), dayScore.ts (third category), and Stats (graphable key + At a Glance). Left here only to confirm the Day Summary CARD surfaces it visually; the data layer is done. Detail in SPEC_recovery_coach.md.
- Sleep score stage-weight tuning -- bump REM weight, soften deep-sleep penalty (currently equal at 30pts). utils/sleepScore.ts.
- (note) Hypnogram connector lines CUT PERMANENTLY -- too sloppy when transitions are dense; no clean solution.

### Coaching & AI
- Voice (anti-eggshell) standard -- confident + direct, not hedging; encouragement that feels earned. Already fixed in Smart Coach + Halo; hold the line everywhere.
- Smart AI extra nutrients -- decision needed: do sodium/vitamins/micros feed Smart AI tips or stay display-only? Showing values fine; PRESCRIPTIVE advice = medical/legal risk. Discuss before build.
- Caffeine tracking -- daily total, high-amount warnings, first-use disclaimer. Design decisions needed. Duty-of-care item.
- Food group pattern detection -- zero whole foods X days -> gentle mode-aware tip.

### Streaks
- Burn accuracy freeze -- freeze burnAccuracyPct per-day (like goalSnapshot) so changing it doesn't retroactively shift streaks. utils/goalHit.ts / stats.tsx.
- Streak grace day system -- mode-aware grace days (Discipline cap 1 / Balanced cap 3 / Mindful none).
- Streak end warning visuals -- card color shift to orange/red within X hours of midnight, action not done.
- Edit Streak Count -- manual override with disclaimer. Design session first.

### Vacation Mode & Exclusions (ONE design knot -- Justin 2026-06-22; decide exclusion behavior FIRST, then build Vacation Mode)
- [AUDIT NEEDED] Exclusion / Vacation Mode source-of-truth convergence (FULL APP). Confirm every feature that reads daily data routes through the SAME exclusion/vacation check (Day Score, EvR, summaries, streaks, stats...).
- [SHIPPED] Vacation Mode -- one toggle auto-excludes nutrition/water/weight/sleep while still passively capturing HealthKit data; duration in days, auto-off on expiry. Live: utils/vacationMode.ts + Settings > Vacation Mode. Justin has used it multiple times. Spec: SPEC_vacation_mode.md. (The exclusion source-of-truth convergence AUDIT above may still be worth a sweep.)
- Snooze notifications option -- snooze/defer a notification; may pair with Vacation Mode.

### Tutorials & Tooltips
- Tooltip audit pass -- sweep all cards, flag every card missing a (i), build the missing ones. (See also the HIGH audit item above.)

### Animations
- Number transitions -- AnimatedNumber shipped on Home + Log. Remaining: stats tab values, workout tab reps/sets.
- Progress bar/ring/donut animation audit -- calorie bar on load, macro bars on entry, food donut on load, water bar bounce, sleep donut on load.
- Goal-moment animations -- water goal (fill + pulse), step goal (flip green), calorie goal (color transition).
- **Medium and large celebrations still differ only by COUNT** (100 motes vs 68), which is the half of the
  original 2026-07-26 diagnosis that never got addressed: the tiers differed in SIZE, not in KIND, and
  that is why neither felt like a bigger deal. Motes made them better-looking, not more distinct. Diamond
  is the proof it can be done -- it differs in kind (takes the screen, badge, staged reveal) and everyone
  agrees it lands. Open question when celebrations are next touched: what makes a large a genuinely
  different MOMENT from a medium, without becoming blocking (non-blocking is locked) and without
  repeating the toast (the toast carries the badge, name, tier and criteria).

### Settings & Modes
- Settings/Help: Coaching Style + Faith Journey in-depth explainers (quick blurb from the row + full article). UI approach TBD.
- Style/mode audit -- features that shouldn't show in Mindful, Discipline-only features, wrong defaults. Dedicated session.
- Mindful mode full app-wide audit -- inconsistent implementation across every screen/card/copy string. Dedicated session.
- Goals sub-category accordion polish -- FITNESS/NUTRITION GOALS sub-sections collapsible. settings.tsx.
- Resources and wellness links -- curated Settings > Help section (books, channels). Mostly static.
- "You've grown" coach message -- after key thresholds; mode-aware; ties to faith-journey prompts. Design first.

### Journal
- Date on journal entries tappable -- routes to that day's Day Detail.
- Search within journal entries -- low priority.
- Long-text stress test -- verify 500-word entries format correctly. QA.
- Multiple entries same day -- verify prayer + gratitude same day display correctly. QA.

### Notifications (system push -- SPEC_notifications.md is source of truth; separate from the in-app Otto hub)
- Notifications spec build -- 14 types, copy pools, deep linking all specced. Dedicated session.
- Notification center -- bell icon in profile header, badge, real-time toasts for Health sync events.
- Daily summary push notification -- push version of the morning Day Summary. NOT in the 14-type spec yet; add before building.

### Visual Polish
- Full theme audit -- all 5 themes x all accents, every screen, before beta. Dedicated testing session.
- Progress bar track color pass -- across all themes.
- Empty state illustrations -- SVG illustrations replacing icon+text empties. Theme-aware, app-wide.
- MFP switcher experience -- first-impression UX for power users arriving from MyFitnessPal.
- Sign-in logo entrance animation -- logo pops instead of fading. Verify on TestFlight first.

### Infrastructure
- [DATED REMINDER] Anthropic API key (`goodforge-prod`) expires ~2027-07-18 (1-year expiration set
  2026-07-18 during the post-exposure rotation). Rotate proactively before then -- regenerate, set via
  `firebase functions:secrets:set ANTHROPIC_API_KEY`, redeploy aiProxy/appCompanion/faithCompanion, verify
  Otto+Halo+estimator, revoke old key. Same steps as this rotation, just not urgent this time.
- [DRIFT CLEANUP] The WEIGHT ACHIEVEMENT logic exists TWICE in app/(tabs)/index.tsx -- one path per
  weigh-in route -- each with its own first-weigh-in / milestone-crossed / goal-weight branches. Six sites
  total. Surfaced 2026-07-27 fixing the missing toasts: every branch had to be hand-edited in parallel,
  which is precisely how the two copies drifted apart in the first place (first weigh-in toasted but never
  celebrated; milestones and goal weight celebrated but never toasted -- nobody decided that, they were
  written at different times). Same shape as GOAL_DEFICITS below and the nutrient maths that was
  consolidated the same day. Centralise into one checker both routes call.
- [DRIFT CLEANUP] GOAL_DEFICITS is duplicated across 6 files (calorieTarget, profile, index, goalHit, settings, onboarding/your-style). Centralize into ONE exported source (calorieTarget already exports it) so pace/deficit changes can't drift. Surfaced 2026-07-08 adding pace granularity -- had to hand-edit 5 copies. (Justin flagged drift as a standing concern.)
- Firestore migration -- move primary data from AsyncStorage to Firestore (auth already done). Big item.
- State restoration on launch -- save active tab + scroll position, restore on cold launch.
- HealthKit source detection -- show "via Garmin/Whoop/Oura" labels on sleep/HRV data.
- Offline-first behavior.
- In-app review prompt -- prompt to rate at the right moment.
- Accessibility -- respect system Dynamic Type font sizes.
- Tooltip pulse visibility awareness -- only pulse when the card is visible in the ScrollView viewport. Not blocking.

---

## 📄 SPEC + REFERENCE POINTERS
Every major feature has a SPEC_*.md in the repo root. Active ones tied to open work above:
- Wearable / TDEE: SPEC_wearable_robustness.md | Otto hub: SPEC_otto_notifications.md | Push notifications: SPEC_notifications.md
- Sleep/Recovery: SPEC_sleep.md, SPEC_recovery_coach.md, SPEC_hr_zones.md | Lifting: SPEC_lifting_log.md | Workout sessions: SPEC_workout_sessions.md
- Nutrition: SPEC_nutrition.md, SPEC_calorie_goal_hit.md, SPEC_calorie_floor.md, SPEC_ai_meal_estimator.md | Day/Reports: SPEC_day_score_and_summary.md, SPEC_weekly_summary.md, SPEC_monthly_summary.md, SPEC_evr_redesign.md, SPEC_comparison_challenge.md, SPEC_custom_reports.md
- Faith/Coach: SPEC_faith_ai.md, SPEC_faith_tab.md, SPEC_smart_tips.md, SMART_COACH_SPEC.md, TRIGGER_LIBRARY.md | Cards: SPEC_card_gradient.md | Vacation: SPEC_vacation_mode.md | Tutorials: tutorial_system_spec.md
- Body: SPEC_body_measurements.md, SPEC_body_progress.md, SPEC_weight_history.md
- Look & feel: **SPEC_visual_refresh.md** (type system, molded buttons, glass cards, background layers, grain,
  stagger -- plus the open device A/Bs and the do-not-resurrect list)
- App Store: APP_STORE_CHECKLIST.md, COMPLIANCE_SCAN_findings.md | Launch: **LAUNCH_CHECKLIST.md** (the single
  ordered launch list; supersedes the REVERT + LAUNCH BLOCKERS sections above)
- Monetization: SPEC_monetization.md | Restaurant Mode (researched, unbuilt): SPEC_restaurant_mode.md
- Rate Us + Feedback prompts (shipped): SPEC_rate_us_and_feedback.md
- Coffee Drink Builder (designed, unbuilt; data audit gates the build): SPEC_drink_builder.md

## 📎 ARCHIVES
- project_j_roadmap_archive.md -- full shipped/fixed history + detailed post-mortems (this file's completed items live here; grep by section when you need the story behind a shipped feature)
- project_j_backlog.md -- parked/future items (deeper-future than the backlog-by-area above)
