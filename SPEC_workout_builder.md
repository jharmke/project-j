# SPEC: THE WORKOUT BUILDER (THE PLAN, item E)

**Otto builds a workout and puts it in your Workout tab.** The lead Supporter perk, promised on four
user-facing surfaces, and not built.

Created 2026-08-10. **Status and ranking live in `PLAN.md` item E. This file is the detail.** Where the two
disagree, PLAN.md wins on status and this file wins on design.

⚠️ **NOTHING HERE IS BUILT.** Every decision below was taken in conversation on 2026-08-10 and recorded the
same day, after Justin pointed out that an earlier round of this discussion had been lost. Decisions are
marked ✅ DECIDED, 🟡 DIRECTION (stated but hedged) or 🔴 OPEN.

---

## 0. WHY THIS EXISTS AND WHY IT IS URGENT

The Supporter page's FIRST perk, Otto's own list of what the plan includes, the onboarding all-set screen
and the day-8 step-down modal all promise that Otto **builds workouts into your Workout tab and meals from
food you actually eat**. Neither builder exists.

**That is not a false-advertising problem** (PLAN 4.18): both are shipping before launch, nobody has ever
paid, and the tier is not on sale. It IS a launch dependency, and it makes E the last unbuilt thing standing
between the Supporter tier and delivering what it advertises.

---

## 1. THE THREE LAYERS (read this before anything else)

The app already has the structures this feature needs. Otto is not building new machinery; he is driving
flows that exist.

| Layer | What it is | Where it lives |
|---|---|---|
| **Program** | The SHAPE of a week. Seven weekday slots, each with a type, focus name, muscle text, colour and tags. **`exercises: []` on every day** | `PresetProgram` in `workoutData.ts`; user copies in `pj_workout_state` |
| **Routine** | A named, reusable set of exercises. Not scheduled | `Routine` in `workoutData.ts`, stored in `pj_routines` |
| **Day** | A dated day with real exercises in it | `pj_workout_state.programs['YYYY-MM-DD']` |

⚠️ **`weeklyTemplate[Weekday]` is a fourth thing and is OUT OF SCOPE** (decision 1c). It is the recurring
default for a weekday, and `programs[dateKey]` overrides it. Otto never writes to it: nothing he does should
quietly change every Monday forever.

**An `Exercise` inside a day is self-contained** — name, sets, reps, rest, note, all strings. It carries **no
link to the library** and no muscles or instructions. Those live only on the `LibraryExercise`, which is a
different shape, and are looked up **by name**. That single fact drives most of section 4.

---

## 2. THE CORE LOOP

✅ **DECIDED.** A build request produces, in this order:

1. **Any genuinely new movement becomes a custom exercise in the library** (`LibraryExercise`).
2. **The workout is saved as a custom routine** (`Routine`, into `pj_routines`, appearing in My Routines).
3. **The routine is placed on a specific day the user agrees to** — today or a future date.

✅ **ALL THREE MECHANISMS ALREADY EXIST.** The library creates custom exercises and routines today, and the
Workout tab has a **"Load to N Days"** picker with this-week / next-week navigation and past days disabled.
What Otto produces is an ordinary routine and an ordinary exercise, editable and deletable like anything the
user made by hand.

### 2.1 Preview and accept
✅ **LOCKED BEFORE THIS SPEC EXISTED** (the item E constraint in `SPEC_otto.md`): **routines are previewed
and accepted, never written straight in.** He builds the whole thing including any new movement, shows it,
and **nothing is saved**. Accept and the routine lands AND the exercise joins the library. Decline and
nothing was created.
⚠️ **"Accept" throughout this document is the CONCEPT, not the button label. The button says where the
workout is going (`ADD TO THURSDAY`) -- see 2.1e.**
➡️ Accepting IS the confirmation, which is what solves the mid-build problem (does he stop and ask, or build
then confess?). It also means a wrong exercise, bad set counts or a movement their gym does not have get
caught BEFORE they are in the app. Cost: one extra tap.

✅ **The preview is inline in the chat and revisable by talking.** Add, remove or swap by replying.

### 2.1b What the preview IS: an inline card under the bubble (open item 2) — ✅ CLOSED 2026-08-10
✅ **DECIDED 2026-08-10: a structured CARD, rendered inline in the conversation.**
❌ **NOT free text with an Accept pill.** Five exercises with sets and reps is a small table; as prose it
reads like a wall and looks nothing like the rest of the app. A card is also the only version where "swap
the flies" has something visible to point at.
❌ **NOT a modal or a new screen.** Justin: *"not free text, not a pop up modal. pure inline in the
conversation."*

✅ **AND IT SITS OUTSIDE THE BUBBLE, LIKE AN ATTACHMENT IN A TEXT THREAD** (Justin's framing).
🔴 **THE LAYOUT ALREADY WORKS THIS WAY, VERIFIED IN `components/AssistantChat.tsx`.** An Otto reply is not
one bubble, it is a COLUMN (`styles.replyCol`) beside the avatar:
```
[avatar]  ┌──────────────────────┐
          │ bubble: his text     │   <- styles.bubble
          └──────────────────────┘
            ▸ route / tutorial pills   <- styles.pillRow, ALREADY outside the bubble
            share  thumbs up  down     <- styles.actionRow, ALREADY outside the bubble
```
➡️ **The card becomes one more sibling in that column**, so this needs no fight with the existing layout.
✅ **ORDER: bubble, then the routine card, then any pills, then the action row.** The card is the substance
of the reply, pills are navigation AWAY from it, and share/thumbs stays last where it is everywhere else.
🟡 **PROVISIONAL ON SEEING IT.** Justin, 2026-08-10: *"hard to say yes without seeing it but yes i think that
is right."* **The order and the card's visual design get a real pass on device before they are locked.**
This project's standard is that Justin's eyes decide visual questions and that dev-build judgement is about
correctness, not feel.

### 2.1c Who supplies the numbers on the card (open item 2) — ✅ CLOSED 2026-08-10
Each row of the card is `Bench Press · 4 sets · 8-10 reps · 90s rest`. **Otto supplies the NAME. The question
was where the numbers come from.**

✅ **DECIDED: the app supplies them, from the library, as the floor. Otto may adjust within validated limits
when the request or the training goal calls for it.**

❌ **REJECTED: Otto composing every field himself.** Every value becomes something the model can get wrong:
a name slightly off kills the muscle map and splits PR history (section 4), and sets or reps can come back
as "3-4ish" or blank. Under the chosen design the only thing he can get wrong is WHICH exercises, which is a
judgement a human should see anyway and is exactly what the preview is for.

✅ **THE LIBRARY'S NUMBERS ARE NOT ARBITRARY, WHICH IS WHY THEY ARE SAFE TO USE AS THE FLOOR.** Justin
challenged this directly ("these cant just be random default numbers, there has to be some thought in
there, no??"). Checked, and there is. The Push preset:
```
Bench Press             4 × 8-10   90s   <- compound, heavier, long rest
Machine Shoulder Press  3 × 10-12  60s
Cable Fly               3 × 12-15  45s
Cable Lateral Raise     3 × 15     30s
Tricep Pushdown         3 × 12     45s   <- isolation, lighter, short rest
```
Sets fall, reps climb and rest shortens from the big lift to the small work. Somebody designed that.

🔴 **AND THE WEEK-TO-WEEK PROGRESSION IS THE WEIGHT, NOT THE REP SCHEME.** This is the same conclusion as
6.3 and 6.4 arriving from a different direction: you keep the movements and the rep scheme and **add weight
to the bar**, which is what drives adaptation and the only thing that lets the PR system and "you vs
yesterday" tell you anything. **If the rep scheme moved every week too, nothing would be comparable to
anything.** The load is supplied by the person who knows how the last set felt.

⚠️ **VALIDATION IS WHAT MAKES "OTTO MAY ADJUST" SAFE** — sets a small integer, reps a number or a range,
rest a duration. Open item 5 owns the detail.

### 2.1d What the card shows (open item 2a) — ✅ CLOSED 2026-08-11
✅ **DECIDED: it is the My Routines card, condensed.** That card already exists in `app/workout-library.tsx`
and is already a title, a count, the exercise rows and ONE primary button, which is the exact shape 2a was
asking for and a shape Justin has already approved on device.
🔴 **THE REAL WIN IS NOT SAVED BUILD TIME. The preview looks like the thing it is about to become**, so
Accept has no visual surprise on the other side of it.

**KEPT from the library card:** the cyan top edge (`borderTopWidth: 1.5`), the striped exercise block, the
blue/amber dot per row (lift vs cardio), one primary button at the bottom.

**CHANGED, and each change has a reason:**
| Change | Why |
|---|---|
| ❌ Pencil + trash icons dropped | Nothing is saved yet, so there is nothing to edit or delete. Frees the top-right corner. |
| ❌ Tag pills dropped | ✅ **Re-confirmed 2026-08-11, AFTER 6.6 decided Otto DOES tag routines.** They still stay off: the pills appear on the library's routine card and as pills + day-strip dots on the Workout tab **the moment it lands**, so the consequence is visible immediately after accepting and is two taps to change. Not worth the card's height. |
| ✅ Exercise count moved onto the TITLE ROW | Into the corner the icons vacated. Same information, one line less height. **Kept rather than dropped because five exercises is the locked session shape (3.7), so the count is how the user sees at a glance that Otto stuck to it.** |
| ✅ Rows RESTACKED: name on top, numbers beneath | See below. This is the biggest change. |
| ✅ Names may wrap to TWO LINES instead of truncating | Costs nothing on the ~95% of rows that never need it. |
| ✅ Inner padding 16 → 12 | Buys back most of what the narrower column costs. |

🔴 **THE RESTACK, AND WHY THE LIBRARY'S RIGHT-HAND COLUMN COULD NOT COME ACROSS.** The library renders
`{sets}×{reps}` right-aligned and pinned. Justin, 2026-08-11: *"3x6-9 looks like a math equation idk."*
**He is right, and his own screenshot proves it**: the library contains rows that render `3×20 total` and
`3×30s each side`, which read like an abandoned equation rather than a value.
➡️ **The numbers move to their own line under the name, written as words:** `3 sets · 30s each side`.
✅ **Four things fall out of that one change, which is why it wins:**
1. The name gets the ENTIRE row width, so wrapping almost never fires and truncation effectively never does.
   **This matters more here than in My Routines: the preview is the one moment the user has to read the name
   correctly.** `Cable Fly (Low to High)` and `Cable Fly (High to Low)` are BOTH in the library.
2. The awkward values become sentences instead of equations.
3. **REST FITS**, which resolved an open question in the other direction. See below.
4. The widest rows stop being the ones squeezing the names.
⚠️ **COST, accepted: the card gets taller.** Roughly 70pt for five exercises.

✅ **REST IS ON THE CARD.** Briefly considered leaving rest off and, to compensate, **taking rest away from
Otto entirely** so nothing could change invisibly. The restack made that unnecessary: there is room, so rest
is shown, so Otto keeps the ability to adjust it (2.1c) and the user still sees what he did.
🔴 **The principle worth keeping: any number Otto may adjust MUST be visible on the card.** A feature whose
entire safety story is "you look at it first" cannot have a field that changes silently.

**Longest name in the library: `Overhead Tricep Extension (Cable)`, 33 characters** (MEASURED, grep of the
library data). It fits on one line in the chat column with very little to spare.

### 2.1e Accept, and where the workout goes (open item 2b) — ✅ CLOSED 2026-08-11
✅ **THE BUTTON NAMES ITS DESTINATION: `ADD TO THURSDAY`, `ADD TO TODAY`. Not `ACCEPT`.** Justin, 2026-08-11:
*"is it clear what 'accept' does? like does that add the routine to today?"* It was not. It is now.

✅ **THE DAY IS SETTLED BEFORE THE CARD RENDERS** — from the user's request if they named one, **today if they
did not.** If the day is wrong the user says so, exactly like any other change (2.1f).
❌ **NO DAY GRID IN THE CARD.** The existing "Load to N Days" picker is a multi-day grid with week navigation.
🔴 **Section 2.2 bites hardest here and this was flagged as the single most likely place for this feature to
become the form Justin said he did not want.** Naming the day on the button costs one word and removes the
entire surface.

🔴 **"ADD" IS DELIBERATELY NOT "LOAD", AND THE DISTINCTION IS LOAD-BEARING.** `LOAD ROUTINE` / `LOAD PROGRAM`
in the library REPLACE the day's exercise list wholesale and assign fresh ids. **Otto merges (6.1).** Reusing
the app's existing verb would promise the wrong behaviour — and per 6.1 that wrong behaviour deletes imported
Apple Health sessions and orphans logged sets. **The label and the semantics have to agree.**

✅ **THE BUTTON IS SMALLER THAN THE LIBRARY'S, AND CENTERED.** Justin, 2026-08-11: *"doesnt need to be a
fulllll size button in a small space."* Same styling (tint, border, `ButtonShine`, letterspaced caps), hugging
its label rather than running full width, ~30pt tall instead of 37.
⚠️ **CENTERED, NOT RIGHT-ALIGNED.** Right-aligned was proposed and Justin rejected it on sight 2026-08-11.
⚠️ **Visual size ≠ tap target: it needs `hitSlop` out to the 44x44pt minimum** (CLAUDE.md build standard).

✅ **THE APP APPENDS A STANDING LINE TO OTTO'S MESSAGE**, it is not left to him to write:
> *"Tell me if anything needs changing, or add it to your Thursday."*
Justin asked for this ("Otto should preface these cards with like lmk how this looks"). **Serving it as a
fixed string rather than a prompt rule is deliberate** — see [[feedback_harnesses_cannot_see_the_model]], a
prompt rule has lost to the model five times on this project. It is also the whole discoverability problem
for 2.1f solved in one sentence and zero UI.

### 2.1f Revising by talking, and greyed-out cards (open items 2c + 2d) — ✅ CLOSED 2026-08-11
⚠️ **PLAIN LANGUAGE, DELIBERATELY.** This was written up as "the spent state" and Justin's reaction was
*"wtf is spent????"*. **It is the GREYED-OUT card: the button becomes a label and it cannot be tapped.**
Do not reintroduce the jargon. See [[feedback_plain_english_findings]].
✅ **THERE IS NO SECOND BUTTON. Revision happens by TYPING** — *"swap the flies for dumbbell press"* — because
the chat already has a text input at the bottom. **A "Change" button could only ever do one thing: put the
cursor in that box.** Accept stays the single primary action, which is section 2.2 holding.

✅ **A REVISION PRODUCES A NEW CARD BELOW. The old card is not edited in place.** Three reasons:
1. **The chat cannot edit earlier messages today.** Justin flagged this as the expected wrinkle; it is real.
2. 🔴 **The thread calls `scrollToEnd` on every content-size change** (`AssistantChat.tsx` line 931, and again
   at line 452). **So the new card is exactly where the user is already looking.** Editing the old one in
   place would change something off-screen and force a scroll UP to confirm their own request landed.
3. The "stack of near-identical cards" mess is handled by the greyed-out state below.

✅ **DECLINE IS NOT A BUTTON EITHER. Ignoring the card IS declining it.** Nothing was saved, so there is
nothing to undo: the user types something else, or closes the chat.
🔴 **BUT 2d'S REAL WORRY WAS NEVER "how do I dismiss this", IT WAS "what if I scroll back and tap Accept a
week later" — AND A DECLINE BUTTON DOES NOT SOLVE THAT AT ALL.** Someone who ignored the card was never going
to tap Decline.

✅ **THE ANSWER IS THE GREYED-OUT STATE. Only the newest card in a conversation is live.** As soon as a card is
superseded or accepted it greys out and **its button is replaced by a label** stating what happened:
`Replaced`, or `Added to Thursday`. It stays in the transcript so the user can see what they asked for, and
it cannot be tapped.
✅ **ONE MECHANISM CLOSES THREE QUESTIONS**: stale-Accept (2d), which card is real during a revision (2c), and
what a declined card looks like (2d).
⚠️ **COST, accepted: a long back-and-forth leaves a column of greyed cards behind it.** Fine. It is a
transcript, and only one card is ever tappable.
⏳ **The mechanics of keeping the live draft alive across turns is open item 4**, not this. This section owns
only what the user SEES.

### 2.1g 🔬 THE HEIGHT QUESTION, AND WHY IT POINTS THE OTHER WAY
Justin, 2026-08-11: *"just need to make sure the card doesnt exceed the length of the chat screen."*
**Measured rather than guessed.** Constants MEASURED from `AssistantChat.tsx`; screen size 393x852 ASSUMED
(exact handset unconfirmed); everything else DERIVED.

| | |
|---|---|
| Panel top offset | `insets.top + 96` (line 882) |
| Panel height | 697pt |
| Chrome (handle 19 + header 58 + quota 24 + input 50 + disclaimer 36 + home bar 34) | 221pt |
| **Visible message area** | **~476pt** |
| Otto's column width (393 − 32 padding − 26 avatar − 8 gap) | 327pt |
| Card height, five exercises | ~331pt |
| Whole reply block (bubble + card + action row) | ~445pt |

🔴 **THE WORRY INVERTS ONCE `scrollToEnd` IS ACCOUNTED FOR. The newest content is PINNED TO THE BOTTOM, so
the Accept button is always visible.** What scrolls off the TOP is Otto's message and, in the worst case, the
routine name and the first exercise. One flick up recovers it, and it is how every chat on the phone behaves.
➡️ **So the requirement is "Accept is always reachable", NOT "nothing scrolls".** The latter cannot be
honoured anyway: **the app's own Large text setting breaks it** (`fontScale`, see `SPEC_accessibility.md`).
➡️ Keeping Otto's message short when a card is attached is still worth doing, but it is now about landing on
a card whose TITLE you can see, not about reaching the button. Lower priority than it looked.

🖼️ **A to-scale mockup of all of the above was built and approved 2026-08-11** (three phones: ordinary case,
stress case with the library's longest names, and a revision exchange showing the greyed-out state). Rendered at
true 393x852 in Light + Cyan using the app's real typefaces.
⚠️ **It lives in a session scratchpad and is NOT a durable artifact.** This section is the record.

### 2.1h The multi-day card: collapsible days (open item 9 part two) — 🟡 DIRECTION SET 2026-08-12
✅ **ONE CARD, WITH A COLLAPSED ROW PER TRAINING DAY. Justin's proposal** (*"cant we just make each routine
collapsible or give them compact versions"*), and it is the right one.
🟡 **RECORDED AS DIRECTION, NOT LOCKED.** Justin's sign-off was *"yeah think thats alright.."* -- agreement,
not enthusiasm. **The visual gets a real pass on device before this is locked**, same standing as 2.1b.

🔴 **WHY COLLAPSED IS THE RIGHT DEFAULT, AND NOT JUST THE COMPACT ONE.** On a multi-day build the thing being
verified FIRST is the SHAPE -- Push Monday, Pull Wednesday, Legs Friday, rest where you want it. The twenty
exercises only matter if the shape looks wrong. **Collapsed-by-default matches the actual review task: scan
the week, open the one day you are unsure about.** Four stacked full cards force you to read all of it to
find the part you cared about.

✅ **THE COLLAPSED ROW IS THE PROGRAMS CARD'S DAY PILL, MADE OPENABLE.** Chevron, tag-coloured dot, the date,
the focus, the exercise count. **Expanding reveals exactly the rows designed in 2.1d** -- nothing new is
invented at either level.
⚠️ **CORRECTION TO AN EARLIER STATEMENT: I said the Programs card was not the model for this (6.6). That is
true of the card as a WHOLE, which describes a thing with no exercises in it -- but its DAY ROW is precisely
the right collapsed state.**

🔴 **THE ROW SHOWS A REAL DATE (`Mon Aug 17`), NEVER A BARE WEEKDAY.** Caught while drawing it, 2026-08-12.
**A weekday on its own is exactly what a recurring weekly template looks like, and decision 1 ruled recurrence
out of scope.** The date makes it unambiguous that this lands on three specific days and never returns.

**MEASURED/DERIVED heights** (same basis as 2.1g): 3 days collapsed ~209pt, 4 days ~245pt, against ~476pt of
visible message area — **the whole week fits on screen with room above it.** Opening one day adds ~185pt.
✅ **IT SURVIVES 2.2: a collapsible is optional detail, not a question.** The user is still asked nothing.

🔴 **BLOCKING DEPENDENCY, NOT A DETAIL: THE AUTO-SCROLL HAS TO BE FIXED FIRST.** Justin, 2026-08-12: *"we need
to acknowledge that trap cause that is very sloppy. needs to be smooth as possible."*
➡️ **The chat calls `scrollToEnd` on EVERY content-size change** (`AssistantChat.tsx` ~931). That is what
usefully pins the button into view (2.1g) -- **but expanding a day changes content size too, so tapping
Wednesday would throw the thread to the bottom, away from the thing just opened.**
➡️ **The fix: auto-scroll on a NEW MESSAGE, not on any layout change.**
⚠️ **This is SHARED CHAT BEHAVIOUR and is NOT a one-liner.** Halo's chat was given the same treatment in the
same 2026-07-05 pass, and this panel's keyboard handling has its own history (`SPEC_keyboard_modals.md`).
**Check it against Halo's chat AND the keyboard flow before touching it.** See
[[feedback_read_full_context_before_debugging]] and [[feedback_verify_against_working_reference]].
⚠️ **AND THE EXPAND ITSELF FOLLOWS THIS PROJECT'S RULE: never `maxHeight`.** Render off-screen, measure via
`onLayout`, animate to the exact pixel height, two coordinated animations (CLAUDE.md). **Four of those inside
a chat row is more animation machinery than anything else in the preview.**

### 2.1i Picking which days: checkmarks, not talking — ✅ DECIDED 2026-08-13
✅ **ONE BUTTON, and each day row carries a CHECKMARK. All checked by default.** The button's label follows
the selection: `ADD ALL 3 DAYS` → `ADD 2 DAYS`.
**Justin's proposal** (*"is adding like checkmarks to only pick certain days an option?"*) after I argued for
talking-only. He was right.

🔴 **THE REASON IS RELIABILITY, NOT CONVENIENCE. "Drop Friday" makes the model REGENERATE THE WEEK.** A typed
revision is a round trip in which Otto rebuilds the card, and he can come back with more changed than was
asked for — a different exercise on Monday, a renamed routine, a reordered day. **A checkbox is
deterministic.** On a project that already records a prompt rule losing to the model five times, letting him
re-derive an entire week to remove one day is the risky path. See [[feedback_harnesses_cannot_see_the_model]].
✅ **Latency, independently:** unchecking is instant; typing it is a round trip with a typing indicator, for a
change with no ambiguity in it.

🔴 **THE PRINCIPLE THAT KEEPS THIS FROM CONTRADICTING 2.1f'S "NO SECOND BUTTON":**
➡️ **Typing changes CONTENT** (swap the flies, make it shorter). **Tapping changes SCOPE** (which days).
**Different jobs.** The Change button was killed because it did nothing the text input did not; a checkbox
does something the input can only do slowly, and less safely.
✅ **AND IT SURVIVES 2.2 ON THE SPEC'S OWN PRECEDENT:** 2.2 bans questions asked IN TURN, not options visible
on the card, and decision 8 (supersets) already established "the preview offers a one-tap option" as the
designed pattern.

❌ **REJECTED: one button PER DAY.** Three or four primary actions in one card is what 2.2 exists to prevent,
and it makes the greyed-out state something we have to invent rules for rather than something obvious.

⚠️ **BUILD NOTES:**
- **Uncheck everything and the button needs its dim/inactive state** (CLAUDE.md build standard).
- 🔴 **EACH ROW NOW HAS TWO TAP TARGETS** — the checkbox, and the row itself to expand. **Both need their own
  44pt area and enough visual separation that a user does not expand a day when meaning to drop it.** This is
  the part that gets checked on device.

⚠️ **A COST ARGUMENT WAS MADE FOR THIS AND THEN WITHDRAWN. Do not resurrect it.** I argued checkmarks saved a
free user one of their 5 daily questions. **Wrong: section 7 makes the builder Supporter-only, so a free user
never sees this card at all.** Justin caught it (*"this is a paid feature... are we not aligned here???"*).
Supporters are capped at 30/day, not unlimited. **The decision stands on reliability and latency.**

### 2.1j The week card greys out as a UNIT — ✅ DECIDED 2026-08-13
✅ **Uncheck Friday, tap `ADD 2 DAYS`, and the WHOLE card greys out**, its button replaced by the label
`Added 2 of 3 days`. **Friday does not stay live.** If the user wants Friday later they ask, and get a fresh
card with a current date on it.

❌ **REJECTED: greying out only the days that landed and leaving Friday tappable.** That leaves a card sitting
in the history with a live button on it whose date keeps getting older — **which is the exact hole the
grey-out exists to close** (2.1f). A half-live card is a stale card wearing a disguise.
⚠️ **COST, accepted: changing your mind about Friday costs a message.** Same trade as everywhere else here —
the fast path serves the common case, the slow path re-derives safely.
🟡 **Justin's pick was "i guess one"** — decided, but the least confident call in item 9. **If it feels wrong
in use, this is the one to revisit**, and the alternative is written above so it does not have to be
re-derived.

✅ **ITEM 9 IS CLOSED.**

### 2.2 🔴 THE ONE-SCREEN RULE (Justin, 2026-08-10)
> *"i just want to be sure user isnt being asked 50 questions when trying to build a workout or meal."*

**The preview is one screen with one primary action. It is not a questionnaire.** Three separate
"ask in the preview" moments had accumulated across the decisions below; stacked as a sequence they would be
exactly that interrogation.

➡️ **They are OPTIONS VISIBLE ON THE PREVIEW, not questions asked in turn.** In the ordinary case the user is
asked **nothing**: request a workout, look at it, tap the button (which says `ADD TO THURSDAY`, see 2.1e).
- Merge is the DEFAULT, so it is never a question.
- The superset is a tappable suggestion, not a prompt.
- The duplicate-name check appears only when the user personally named a movement resembling one they own.

⚠️ **BINDING ON THE MEAL BUILDER (item F) TOO.** Any future addition must justify itself against this rule.

---

## 3. WHAT OTTO MAY PUT IN A WORKOUT

### 3.1 Exercise selection
✅ **DECIDED.** Unprompted, he picks **only from the existing library**. He may go outside it **only when the
user names a movement themselves** ("include decline bench press and low cable flies").

🔴 **WHY THIS IS THE RIGHT RULE AND NOT MERELY A CONSERVATIVE ONE:** Otto never invents a movement on his own
initiative, so a near-duplicate can only ever appear when the USER typed the name, which is exactly the
moment they know what they meant. It makes the duplicate problem rare and self-limiting instead of systemic.

### 3.2 Equipment
✅ **DECIDED. Seven ticks, filled by a location preset, editable:**

**Dumbbells · Barbell · Squat rack · Bench · Cables · Machines · Pull-up / dip bar**, plus one
**cardio equipment** tick.

Presets: Full gym ticks everything · Apartment/hotel gym ticks dumbbells, machines, cardio · Home gym is
whatever they own · Bodyweight only ticks nothing.

🔴 **HISTORY-BASED INFERENCE WAS PROPOSED AND REJECTED.** The suggestion was that Otto infer available kit
from what the user has logged. **Justin killed it with two cases:** a brand-new user has nothing logged, and
somebody who only does cardio has a history saying "no lifts", which is silence rather than information.
**History says what someone HAS done; it cannot say what they CAN do.**

🔢 **The tick list was COUNTED, not guessed** (MEASURED 2026-08-10 against `DEFAULT_LIBRARY`, 78 entries):
| Tick | Exercises it gates |
|---|---:|
| Cables | 10 |
| Machines | 8 |
| Squat rack | **3** (bench press, incline bench, barbell squat) |
| Barbell without a rack | 6 more |
| Pull-up bar | 3 |
| Dip station | 2 |

➡️ Rack and barbell are SEPARATE because a barbell with no rack is a real home setup; pull-up and dip share
one tick because they are usually the same frame.
❌ **NO PER-MACHINE TICKS.** Only 8 exercises hang off the whole Machines tick, so a wrong suggestion is a
one-tap swap in the preview, not a data problem. Twenty checkboxes to avoid that is a bad trade.
❌ **NO SEVEN CARDIO TICKS.** One cardio tick. When Otto needs to name a machine he uses one the user has
actually logged; otherwise he names none and says "cardio, your pick".

✅ **The tags ride the EXISTING enrich-on-load migration** (`app/workout-library.tsx` ~line 2145), which
patches library entries with new fields using `e.field ?? def.field` and therefore never overwrites a user's
own edit. **No new migration to invent.**
⚠️ **TAG WHILE ITEM J HAS THE FILE OPEN.** J adds ~64 entries to the same file.

### 3.2b The Workout Preferences profile section
✅ **DECIDED 2026-08-10.** A new **third** `ProfileSection`, directly under Membership.

🔴 **THE PRINCIPLE THAT PRODUCED IT, and it is the answer to "does Otto ask questions every time":**
> **Anything Otto would ask on EVERY build is a setting, not a question.**
If it varies per request, the user volunteers it or the preview fixes it. That is how this gets to **zero
back-and-forth without a form**, which was Justin's requirement.

**Contents:**
| Setting | Why |
|---|---|
| **Equipment** (7 ticks + location preset) | Section 3.2 |
| **Preferred cardio** | Lets Otto NAME a machine instead of "cardio, your pick" (3.3) |
| **Session length** | Default is 5 (section 3.7); this is for someone who always wants 4 or 7 |
| **Exercises to avoid** | Replaces an injuries field. See below |
| **Training goal** | The only setting that changes the CONTENT of a workout rather than constraining it. See below |

✅ **TRAINING GOAL, DECIDED 2026-08-10. Three options, label plus subtitle, rendered as pill rows like the
Lifestyle options directly below them:**
| Label | Subtitle |
|---|---|
| **Max Strength** | Heavier weight, fewer reps, longer rest. |
| **Muscle Growth** *(default)* | Moderate weight and reps, moderate rest. |
| **General Fitness** | Lighter weight, higher reps, shorter rest. |

**Muscle Growth is the default because that is what every `PRESET_ROUTINES` entry already is.**
🔴 **IT IS NOT A TRAINING VERSION OF BULK/CUT, AND THAT DISTINCTION IS THE POINT.** Justin asked whether
Bulk/Cut would work as the labels. It would not, for two reasons:
1. **The app already knows it.** `weightGoal` (lose_1, maintain, ...) plus pace lives in the Weight Goal
   section. A second copy is how two facts drift apart.
2. 🔴 **CUTTING SHOULD NOT CHANGE THE TRAINING MUCH.** Keeping the weight heavy while cutting is what
   preserves muscle; switching to light weight and high reps "to get toned" is the classic mistake and is
   backwards. **A chest day for someone cutting and someone bulking should look broadly the same.** What
   differs is the food, which the app already handles. Same family of error as the Smart Coach copy that
   told bulking users they were "at a deficit" (PLAN 1.9).
⚠️ **THE LABELS TOOK THREE ATTEMPTS AND THE FIRST TWO WERE REJECTED FOR BEING VAGUE.** "Strength" and "Size"
were rejected outright ("those are awful, so vague... strength and size feel the same"), and they are: both
are abstract outcomes that read as synonyms to anyone who does not already know the difference. What fixed
it was pairing an unambiguous OUTCOME label with a subtitle stating the actual mechanics. **Do not reword
these back into one-word abstractions.**
❌ **"Powerlifting Style / Bodybuilding Style" was offered and not taken**, though it solves the same
problem: those are styles people can picture rather than outcomes that sound alike.

⚠️ **NOTED WHILE CHECKING, NOT CHASED: `CLAUDE.md` lists a `fitnessGoal` key in `pj_settings` and there is
no code behind it anywhere.** `weightGoal` is the real field. Small doc drift, logged here so it does not
mislead the next person who goes looking for a goal setting.

❌ **NOT IN IT: training days per week.** `trainingFrequency` already exists under Activity Level and feeds
the calorie floor. **Duplicating it is exactly how two copies of a fact drift apart.**
❌ **NOT IN IT: experience level.** Fuzzy, and Otto can hedge sensibly without it. Add only on request.

✅ **"EXERCISES TO AVOID" REPLACES AN INJURIES FIELD, and that is a deliberate privacy call.** It handles
both *"my knee is bad"* and *"I hate burpees"* with one control, and it is a PREFERENCE rather than a medical
disclosure, so **no health data is collected and `privacy.html` needs no change.**
⚠️ **Honest caveat:** an avoid list says WHAT to skip, not WHY, so Otto cannot be careful in adjacent ways
(he will skip the squat but not know to go easy on the knee generally). Accepted for v1.
✅ **UI: never show a list.** Empty by default, an "Add" that opens a **search over the library**, each pick
becomes a chip. Same visual language as Food & Allergies directly above it, and it scales to ~143 exercises
without ever rendering 143 of anything. Most users will have zero or two.

⚠️ **THIS WILL BE THE CHIP-HEAVIEST SECTION ON THE TAB** (seven ticks, cardio, an avoid list), which makes it
the worst-looking one under the existing complaint that Profile sections are not cards
(`project_j_roadmap.md`, 2026-08-04). **It inherits the fix for free** -- one change to the shared
`ProfileSection` component -- but it is an argument for doing the card pass at the same time.
⚠️ **IT NEEDS ITS OWN (i)** (Justin: *"yes on the (i) wherever it is needed"*). The roadmap currently calls
the Food & Allergies tooltip "the ONLY tooltip on the Profile tab" and carries a note to give the carded
header a right-hand slot for it. **This makes it two.**

### 3.3 Cardio
✅ **DECIDED.** Lifts only unless asked. When asked, he can put a cardio piece at the start or end. **He never
invents a machine**: he names one the user has logged, or says "cardio session before or after, your call".
Rest days stay out; he is not deciding your rest.

### 3.4 Bodyweight
✅ **DECIDED: write no rule at all.** Pull-ups, chin-ups and dips are among the best movements available and
belong in a gym back or arm day. The only odd outcome is push-ups on a full-gym chest day, which is a one-tap
swap.
🔴 **DO NOT WRITE OTTO AN INSTRUCTION FOR THIS.** Every nuanced judgement rule given to the model on this
project has eventually been ignored, silently. Add a constraint only with evidence from a device.
See [[feedback_harnesses_cannot_see_the_model]].

### 3.5 Supersets
✅ **DECIDED: never unprompted; offered in the preview.** Supported by the data model (`supersetGroup`;
consecutive lifts sharing the id render as one block) and grouping is two taps and fully reversible.
⚠️ **Zero preset routines or programs use supersets** — nothing the app ships demonstrates one.
❌ **REJECTED: "a narrow rule, accessories only, never main compounds."** It sounds tidy and is the weakest
option available: it depends on the model applying a nuanced judgement every time, and it fails silently.
⏳ **LATER: mirror the user's own history.** If their routines already use supersets he may; if they never
have, he does not. Better long-term answer because it is a FACT the app hands him rather than a judgement.

### 3.6 A "home workout" request
✅ **DECIDED.** The equipment profile is a DEFAULT, not a lock. *"Make me a home workout"* means bodyweight
only, and **asks nothing**. If they have kit at home they say so in the request or fix it in the preview.
⚠️ **BLOCKED ON ITEM J.** See section 8.

---

### 3.7 Session shape
✅ **DECIDED 2026-08-10: five exercises for a lift session.** Three or four for a core-only session, one for
a cardio piece. **Whatever the user explicitly asks for wins.**
🔢 **NOT AN INVENTED NUMBER. MEASURED against `PRESET_ROUTINES`:** every single lift routine the app ships is
exactly **5** — Push Standard / Chest Focus / Shoulder Focus, Pull Standard / Back Focus / Bicep Focus, Legs
Standard / Glute Focus / Quad Focus, Full Body Standard / Compound. Core Standard is 3, Core Intense 4, each
cardio preset 1.
➡️ **So Otto's routines sit next to the presets looking native rather than foreign**, and it sidesteps
duration entirely: the app thinks in exercise count, not minutes, and Otto cannot know how long anyone rests.
❌ **REJECTED: dropping to 4 to pre-empt "make it shorter".** That guesses at something that varies per
person and per day, and shortening is already a one-line revision in the preview.
⏳ **LATER, NOT NOW: match the length of the user's OWN routines.** Someone whose routines are all seven
exercises gets seven, cold start falls back to 5. Same fact-not-judgement pattern as the superset idea.

### 3.8 Warm-ups
✅ **DECIDED 2026-08-10: Otto does NOT put warm-ups in the routine.** He may mention warming up in his reply.
🔴 **THE REASON IS THE PR SYSTEM, NOT TASTE.** A warm-up added as an exercise becomes a real entry with
logged sets, so an empty-bar set is treated as a lift attempt, and a name like "Warm-up" is not in the
library so its info panel is dead (section 4). **It would quietly pollute the thing the app is built on.**
⚠️ Also: none of the presets include warm-ups. All five entries in every preset are working movements.

## 4. NAMES: THE MOST DANGEROUS PART OF THIS FEATURE

🔴 **THERE ARE TWO DIFFERENT NAME-MATCHING RULES IN THE APP AND OTTO MUST SATISFY THE STRICTER ONE.**

| Consumer | Match | Failure if the name is off |
|---|---|---|
| **PR history** (`normalizeLiftName`, `utils/liftPR.ts`) | trim + lowercase + collapse spaces, **nothing else** | "Decline Bench" and "Decline Bench Press" become **two separate PR records**. So do "Low Cable Fly" and "Low Cable Flies" — there is no plural handling. **History splits in two, silently.** |
| **Muscle map + instructions panel** (`app/(tabs)/workout.tsx` ~2090, ~3704) | `e.name === ex.name`, **exact, case and space sensitive** | The info button shows **no muscle map and no instructions**. The workout looks fine; the panel is just dead. **Invisible.** |

✅ **THE RULE: when Otto means an existing movement, he writes the library's EXACT name, never his own
phrasing.** Not "decline bench" when the library says "Decline Bench Press".

✅ **ENFORCED THE WAY THE MUSCLE KEYS ALREADY ARE: the app hands him the actual library names and treats
anything off-list as a NEW exercise rather than a guess.** Checkable in code, not a rule he has to remember.

✅ **NEAR-DUPLICATES ARE SETTLED AT THE PREVIEW.** When a user-named movement resembles an existing entry,
the preview asks once ("this looks like your Incline Bench Press, use that?"). No new UI, and the judgement
sits with the person who knows what they meant. **This is the practical stand-in for item K (lift-name
aliases), which is unbuilt.**

---

## 5. WHAT OTTO FILLS IN WHEN HE CREATES AN EXERCISE

✅ **DECIDED BEFORE THIS SPEC** (carried over from `SPEC_otto.md`, kept here as the detailed home):

- **Muscles.** ⚠️ The app hands him the exact valid keys and **DROPS anything not on the list before saving**,
  or a hallucinated "pecs" silently breaks the diagram. **The complete list is the 22 keys in
  `components/MuscleMap.tsx`:** chest, upper_chest, lower_chest, front_delt, side_delt, rear_delt, triceps,
  biceps, forearms, lats, rhomboids, traps, lower_back, abs, obliques, hip_flexors, quads, hamstrings,
  glutes, hip_abductors, hip_adductors, calves.
  ℹ️ Several collapse onto the same drawing, so ~14 regions actually light up and small precision errors are
  invisible.
- **Instructions.** ~4 short steps, matching the built-ins' format.
- **Tags.** ⚠️ The manual add form will not save without at least one tag, so tags are not optional in the
  data. Otto assigns them **from the user's own tag list**, never invented, which means he needs
  `workoutTags` in context.
- **Default sets / reps / rest.** Every built-in has these. Omit them and his exercise behaves worse than the
  ones that shipped.
- **Equipment.** From the seven-tick vocabulary, same supplied-list pattern as the muscle keys.
- ❌ **NO WEIGHT.** A pre-filled number invites someone to load it without thinking, and he has no idea how
  the last session went or how they feel today. **Weight is the one field where being wrong hurts someone.**
  When ASKED, he answers from real history instead.

---

## 6. WHERE IT LANDS

### 6.1 Merge, never replace
✅ **DECIDED.**
🔴 **THE EXISTING "LOAD TO N DAYS" FLOW REPLACES THE DAY'S EXERCISE LIST WHOLESALE AND ASSIGNS FRESH IDS.
OTTO MUST NOT REUSE THOSE SEMANTICS.** That flow means "make this day BE this routine", a different verb from
"add this workout".

✅ **Merging is already the app's own convention:** when Apple Health imports a workout it MERGES into the day
and dedupes by UUID.

🔴 **REPLACING HAS A CONCRETE COST, NOT AN AESTHETIC ONE:**
- An imported Apple session **lives as an exercise in the day**, carrying `fromAppleHealth` and
  `appleHealthUUID`. Wiping the list **deletes the session, loses its heart-rate link** (fetched by UUID) and
  **drops it out of the dedupe set** that stops it being re-imported.
- **Logged sets are keyed by exercise id**, so fresh ids **orphan them**.

➡️ **Merge by default, always.** Replace only if the user explicitly asks, offered in the preview, never the
default. See CLAUDE.md's data-integrity rule: read-then-merge, never replace from scratch.

### 6.2 Apple Watch
✅ **VERIFIED, NOT ASSUMED.** An Apple strength session lands as its own entry in the day alongside whatever
Otto put there, and the app pulls its HR by UUID. Otto's routine is ordinary exercises in an ordinary day, so
nothing changes. **The only thing that would break it is replacing the day's exercises, which 6.1 rules out.
The two decisions protect each other.**

### 6.3 Weeks and months
✅ **DECIDED.** He can build a week or a month. **A month is one 7-day shape, a DISTINCT routine per training
day, repeating for four weeks.** What changes week to week is the weight on the bar, which the user supplies.
✅ **SHORTCUT: the app already ships Push/Pull/Legs and Upper/Lower as `PRESET_PROGRAMS`.** "Decide together
on a split" can mean Otto recommends an existing shape and only generates the routines to fill it.
❌ **REJECTED: four weeks that progress on their own** (volume creeping, a week-4 deload). Otto would be making
progression calls without knowing how the sessions actually went.
⚠️ **THE REVIEW BURDEN IS THE REAL COST, NOT THE BUILD.** A 4-day split is four routines to read before
anything can be accepted. **Section 2.2 has to survive this.** Design the single-routine preview first.

### 6.4 🔬 The research behind repeating (do not restate without the sources)
Justin asked for this to be checked rather than trusted, and the first answer here was too absolute.
**The evidence says systematic variation beats BOTH extremes.**
- **Random weekly rotation HINDERS adaptation** — constant relearning of motor patterns, redundant stimulus.
  The option that sounds smarter is the harmful one.
- **Never changing anything indefinitely is also suboptimal.** Common structure: emphasise a set of exercises
  for **2-3 mesocycles (a mesocycle is 4-8 weeks)**, then rotate.
- Running identical exercises and adding ~2% to the bar is enough on its own to drive new adaptation.

✅ **A four-week repeat sits comfortably in the middle of the evidence.**
✅ **And it is right for this app specifically:** PRs key off the exercise name and "you vs yesterday"
compares a lift to the last time it was done. Weekly rotation would scatter history across dozens of
movements and quietly starve the app's core mechanic.

📚 Sources: systematic review, [PubMed 35438660](https://pubmed.ncbi.nlm.nih.gov/35438660/) /
[J Strength Cond Res 2022;36(6)](https://journals.lww.com/nsca-jscr/fulltext/2022/06000/does_varying_resistance_exercises_promote_superior.40.aspx);
[mesocycle periodization](https://mesostrength.com/blog/mesocycles-and-periodization-for-hypertrophy).
⚠️ **It is a health claim in a health app. Cite them if it is ever restated.**

🆕 **FUTURE FEATURE FALLING OUT OF THE RESEARCH, NOT FOR NOW:** after 2-3 months on the same block a change is
warranted, so the app could notice a program has gone stale and offer to refresh it.

### 6.5 Explaining and varying
✅ **DECIDED.** *"Why are my workouts the same every week?"* is a GENERAL FITNESS question, so it belongs in
the **137-answer general library** (PLAN 4.13): free, instant, zero AI cost. The answer is that you repeat
movements so you can add weight to them, and if the exercises change every week there is nothing to beat.
⚠️ **It must not be phrased as a limitation of the app.** See [[feedback_premium_copy_voice]].
✅ **If a user says they do not want the same thing every time, he varies it. No argument.** The research
objects to random weekly churn, not to variety. The preview already supports swapping.

### 6.6 A DAY'S IDENTITY: focus, customLabel and tags — ✅ DECIDED 2026-08-11
🔴 **THESE ARE THREE SEPARATE FIELDS ON `DayProgram` AND THEY ARE EASY TO CONFLATE. I DID, 2026-08-11, AND
JUSTIN CAUGHT IT** (*"the label and the tag on the workout tab are not the same thing"*). Verified in code:

| Field | What it is | Who fills it | Where the user SEES it |
|---|---|---|---|
| `focus` | The day's focus name | **Automatic.** Loading a routine sets `focus = routine.name` (`workout.tsx` ~2010) | The word after the day in the **Programs card pills** (`MON · PUSH` -- "PUSH" is `focus`, `workout-library.tsx` ~2956) and as a small label under each date in a **report** (`report.tsx` ~651). ⚠️ **NOT drawn anywhere on the Workout tab.** |
| `customLabel` | Free text the user types | **The user only.** The "Add label..." field on the day header (`workout.tsx` ~2458), sharing an editor with `muscles` | The Workout tab day header. **This is the label Justin means when he says "the label".** |
| `tags` | The coloured workout tags | **Automatic.** Loading a routine copies `tags = routine.tags` onto the day | **Pills under the day header (up to 6, two rows) AND small coloured dots on every day button in the week strip.** The dots are what make a week LOOK like a program. |
| `muscles` | A plain muscle sentence, e.g. `Chest · Shoulders · Triceps` | Ships with `PRESET_PROGRAMS`; also written by the day label editor | 🔴 **NOWHERE. NO SCREEN DRAWS IT** (open item 8, searched every screen 2026-08-13). Its only reader is Otto's own snapshot, as a THIRD fallback behind `customLabel` and `focus` (`utils/companionWorkouts.ts` ~133), so it almost never surfaces even there. |

⚠️ **`muscles` IS NOT THE TAG, AND THE TWO GET CONFUSED.** Justin, 2026-08-13: *"confused what this muscle
string is. arent their tags im really confused."* **On `Push / Pull / Legs` Monday, FIVE things are stored:**
type `lift`, focus `Push` (**visible** -- the "PUSH" in the `MON · PUSH` pill), colour blue (**visible** --
why the pill is blue), tag `tag_push` (**visible** -- the Workout tab pills and day-strip dots), and
`muscles: 'Chest · Shoulders · Triceps'` (**invisible**). Explain it that way, never by field name.

✅ **OTTO TAGS THE ROUTINE, NOT THE DAY.** Justin asked whether Otto should assign the day tag the way the
program feature does. He should -- but through the routine, because **loading a routine already copies its
tags onto the day.** A tagged routine tags its day for free, down a path that already exists. Tagging days
directly would be a second mechanism doing the same job.
➡️ **`focus` needs no decision at all**: it is already set to the routine's name automatically.

🔴 **HE MAY ONLY USE THE SIX LOCKED DEFAULT TAGS: `tag_push`, `tag_pull`, `tag_legs`, `tag_core`,
`tag_cardio`, `tag_rest`.** Never a user-created tag, never a new one.
**Justin found the problem and then found the answer himself:** *"a user can name the tags whatever they
want, so Otto has no idea what to pick if they're named nonsense... nevermind, we have the locked
default/preset tags."* **Verified rather than taken:** all six carry `locked: true`, the label field is
`editable={!editingTag?.locked}`, the delete control is hidden for them, and they are re-merged into the
user's tag list on every load so they always exist (`workout.tsx` ~865-890).
✅ **AND HE PICKS BY ID, NOT LABEL** (`tag_push`, not "Push"), which closes even the legacy edge where an old
install carries a renamed default. **Same pattern as the 22 muscle keys and the library exercise names: the
app supplies the valid list, anything else is dropped.** Third time this spec has landed here.
❌ **REJECTED: handing Otto the user's full tag list and letting him match by label.** Muscle keys are a fixed
vocabulary with known meaning; user tag labels are arbitrary strings with unknown meaning. Matching on them
is exactly the kind of thing that fails silently. See [[feedback_detectors_are_brittle]].
➡️ If a user wants their own tag on the day, it is two taps on the Workout tab.

✅ **OPEN ITEM 8 CLOSED 2026-08-13: OTTO LEAVES `muscles` EMPTY.** He never writes it.
1. **Nothing reads it**, so writing it buys nothing today.
2. **`focus` already names the day automatically and IS visible**, so the day is identified without it.
3. 🔴 **If that string is ever put on screen later, Otto-written text would appear retroactively in a surface
   nobody designed for it** -- the kind of thing that surfaces months later looking like a bug.
➡️ **If the muscle sentence SHOULD be visible somewhere, that is its own piece of design with its own
decisions. The builder must not quietly start populating it as a side effect.**

⚠️ **SEPARATE, LOGGED NOT FIXED: the day label editor silently eats half of what you type.** It takes ONE
text field, splits on `·`, puts the first half in `customLabel` and the second in `muscles`
(`workout.tsx` ~3207-3211) -- **but the header only ever renders `customLabel`** (~2458). So typing
`Push · Chest, Shoulders` stores "Chest, Shoulders" somewhere the user can never see again. **Not part of
item 8 and not the builder's problem;** raised to the roadmap's NEXT UP as its own small item.

🔴 **AND THIS IS WHY OTTO NEVER CREATES A "PROGRAM". A PROGRAM IN THIS APP HAS NO EXERCISES IN IT.**
Verified: every `PRESET_PROGRAMS` day is `exercises: []`, and the program builder only ever writes `type`,
`focus`, `color` and `tags` -- it preserves `exercises` and provides no way to add any (`workout-library.tsx`
~1211-1220). **A program is a SHAPE for the week, not a set of workouts**, and `Load Program` writes
`weeklyTemplate` + `activeProgramName`, which decision 1 already ruled out of scope as recurring.
➡️ **So "Otto builds a program" means N routines placed on N specific dates, each date tagged.** The user
gets a coloured, labelled week that reads exactly like a program week, with nothing recurring.
⚠️ **PROGRAMS THEMSELVES ARE NOT GOING ANYWHERE, AND CUTTING THEM IS NOT ON THE TABLE.** Justin asked
(*"are programs even worth having at this point?"*). They are load-bearing: the Workout tab resolves every
day as `programs[dateKey] || weeklyTemplate[dayName] || BLANK_DAY`, so the template is the standing default
for every future day; the Home screen reads it; and the achievement `workout_first_program` unlocks off
`activeProgramName`. Removing it would change a day's fallback, alter the home card and orphan an achievement
that may already be unlocked. See [[feedback_add_after_launch_not_remove]].

### 6.7 NAMES: routine, day word, week title (open item 7) — ✅ CLOSED 2026-08-13
🔴 **EVERY NAME IS DERIVED FROM THE SIX LOCKED TAGS. OTTO WRITES NONE OF THEM.** Fifth time this spec has
landed on "the app supplies it, the model does not" (after exercise names, muscle keys, tags and the numbers).

| What | Format | Example |
|---|---|---|
| **Routine name** (saved in My Routines) | tag words + `·` + the date it is for | `Push · Aug 17`, `Legs + Core · Aug 21`, `Cardio · Aug 14` |
| **The day's focus word** | tag words only, NO date | `Push`, `Legs + Core` |
| **Week card title** (multi-day builds) | tag words joined with ` / ` | `Push / Pull / Legs`, `Upper / Lower` |

✅ **TWO OR MORE TAGS JOIN WITH ` + `, WHICH IS THE APP'S OWN EXISTING IDIOM** -- `PRESET_PROGRAMS` already
ships `FRI · LEGS + CORE`. Nothing new invented.

🔴 **THE ROUTINE NAME AND THE DAY'S FOCUS WORD ARE DELIBERATELY DIFFERENT STRINGS.** The existing load path
copies `focus = routine.name`, which would put the date into the focus word. **Otto's accept path is its own
write anyway** (it MERGES; the existing Load REPLACES, decision 6.1), **so it sets both fields independently.**
➡️ **Why the focus word must stay short:** it renders as a one-line 10.5pt label under a date in reports
(`report.tsx` ~651, `numberOfLines={1}`) and it is the first fallback in Otto's own snapshot.
⚠️ **CORRECTION, so the wrong reason does not get quoted back later:** I first justified this by saying a long
name would wreck the `MON · PUSH` pill. **That pill is on the PROGRAMS card, and Otto never creates a program,
so his days never render there.** The report row is the real reason. Same decision, better reason.

✅ **THE DATE MAKES ROUTINES DISTINGUISHABLE WITHOUT A COUNTER**, which is the point -- every accepted build
saves a routine permanently, so three weeks of asking for a push day yields `Push · Aug 17`, `Push · Aug 24`,
`Push · Sep 2` on the shelf instead of three things called the same thing.
⚠️ **Accepted wrinkle: the date is a made-on stamp**, so reloading `Push · Aug 17` in September reads a little
archival. Fine -- it is exactly what makes three of them tellable apart.

❌ **REJECTED: `Push A`, `Push B`.** Letters look like a program variant and imply a system the app does not
have. ❌ **REJECTED: Otto composing something descriptive** (`Chest & Triceps Builder`). More informative, but
it is free text from the model, which is what this spec has spent every other decision avoiding.

✅ **THE WEEK CARD TITLE WAS A GAP NOBODY HAD NOTICED**, found while writing worked examples 2026-08-13: the
multi-day card has a heading, it is not a routine name, and item 7 as written never covered it. **It is
display-only and never saved**, since Otto creates no program object. Closed inside item 7 rather than given
its own number, because it is the same mechanism and it is answered, not deferred.
✅ **The user can rename anything, whenever.** Unchanged from the original direction.

---

## 7. FREE VS SUPPORTER

✅ **DECIDED 2026-08-10: a free build request gets a CANNED reply, zero AI.** The relevant general answer if
one fits, plus the line that building sessions into the Workout tab is part of the Supporter plan, carrying
the Support button every pitch already has. Justin: *"canned reply cut it."*

🔴 **THIS CLOSES A HOLE THAT EXISTS TODAY. See PLAN 4.18 item 19 for the full finding.** The coach gate only
runs when nothing rides on the message, and `buildWorkoutCapBlock` **is** a rider — so a free user asking for
exercises bypasses the gate entirely and reaches the AI. **"A free user's coaching question never reaches the
AI" has not been fully true since 4.13 shipped.**

⚠️ **THIS IS A REMOVAL, AND REMOVALS CANNOT BE WALKED BACK** — so it happens BEFORE launch, exactly like
Otto's 10 -> 5 cap. There are no free users and nobody has ever paid, so it costs nothing today.
See [[feedback_add_after_launch_not_remove]].

⚠️ **The 2-exercise cap becomes moot for free users** once they no longer get an AI answer to a training
question. **Do NOT simply delete it** — confirm first that no free path still reaches the model with an
exercise request, because the cap is the only thing bounding it.

⚠️ **Supporters are unlimited on the creation caps** (free: 5 routines, 3 programs, 15 custom exercises), so a
Supporter-only builder never collides with them. **The 2-exercise cap is already tier-aware** and enforced
server-side from its own membership record, so a modified client cannot switch it off.

---

## 8. DEPENDENCIES AND SEQUENCING

🔴 **ITEM J NOW BLOCKS ITEM E.** J was always "the cheapest way to make the workout builder safe"; it turns
out to GATE it. **The library has no bodyweight exercises at all** — J's own justification says *"there is no
PUSH-UP... nothing bodyweight at all, so anyone training at home has almost nothing to pick from."* Otto
cannot build a home workout today. **Build J first.**

✅ J's instruction-writing is visible work, verified: `instructions` render in two places.

**J's contents change as a result of this spec** (decided 2026-08-10):
- ❌ **CUT:** sled push, battle ropes, medicine ball slam, Turkish get-up. Each needs equipment almost nobody
  has, and cutting them avoids a tick per exercise. Users can still create them by hand.
- ✅ **KEPT:** burpee and thruster (no equipment); **kettlebell swing** (Justin: *"common enough i see people
  use those like daily"*), tagged **"dumbbell or kettlebell"** rather than earning an eighth tick;
  **Smith Machine Bench Press**, folded under the **Machines** tick.
- ✅ Trap bar and landmine tag as **barbell**.

**Item K (lift-name aliases) is unbuilt** and section 4's preview check is the practical stand-in.

---

## 9. 🔴 OPEN — RANKED. WORK TOP DOWN.

🔴 **THIS LIST IS ORDERED AND THE ORDER IS THE POINT.** It was first written as an unranked bullet list and
Justin caught it immediately: *"why give me a list of 9 that isnt in order of what we should do them in?
thats how things get lost."* He is right, and it is the same discipline that makes `PLAN.md` a ranked queue
rather than a pile. **Ranking is by DEPENDENCY, not by size:** anything that constrains another item comes
first, so no decision has to be taken twice.

**J = needs Justin's call. M = mechanics, I bring a proposal rather than a question.**

| # | Item | Who | Why here |
|---|---|---|---|
| ~~1~~ | ~~SESSION SHAPE~~ | -- | ✅ **CLOSED 2026-08-10. Five exercises, see section 3.7.** |
| ~~2~~ | ~~THE PREVIEW AND THE INLINE ADD FLOW~~ | -- | ✅ **CLOSED 2026-08-11. All seven parts. See 2.1b through 2.1g.** |
| ~~9~~ | ~~THE PROGRAM CARD~~ | -- | ✅ **CLOSED 2026-08-13.** Added and closed inside three days. See 6.6 (what a multi-day build is) and 2.1h/2.1i/2.1j (the card, the checkmarks, the grey-out). |
| ~~8~~ | ~~`DayProgram.muscles`~~ | -- | ✅ **CLOSED 2026-08-13. Otto leaves it empty — no screen draws it. See 6.6.** |
| ~~7~~ | ~~Naming the routine~~ | -- | ✅ **CLOSED 2026-08-13. Derived from the six locked tags + the date. See 6.7.** 🔴 **NOTHING ON THIS LIST NEEDS JUSTIN ANY MORE — the rest are mechanics.** |
| **6** | **How the library reaches Otto, and the token cost** | M | **Gates the build** and carries the only real unknowns left. Independent of everything, so it cannot be blocked — and if it comes back awkward, better to know before the rest is designed around it. |
| **4** | **The draft surviving revision across turns** | M | The architectural one: where the draft LIVES decides both items after it. |
| **3** | **Where the preview renders** | M | Falls straight out of #4. |
| **5** | **Validation before save, and what the user sees when something is dropped** | M | Last because it needs to know what Otto sends (#6) and where the draft lives (#4). Also now owns the past-dates problem from item 9. |

⚠️ **NUMBERING NOTE. NOTHING HAS EVER BEEN RENUMBERED. THE NUMBERS ARE STABLE IDS; THE ROW ORDER IS THE
RANKING.** Required by CLAUDE.md ("if you renumber or reorganise anything Justin has been tracking, SAY SO
and leave a mapping"). Every item still means exactly what it meant when it was written.
- **2026-08-11:** item 9 added new, ranked second.
- **2026-08-13:** the remaining items **RE-RANKED at Justin's request** ("go through and decide order for
  me"). **New order: 7, 6, 4, 3, 5.** Was 3, 4, 5, 6, 7, 8.
  ➡️ **7 first** because it is the last item needing Justin at all — clearing it empties his side of the list.
  ➡️ **6 second** because it gates the build and holds the only real unknowns; it is independent, so it can
  never be blocked, and an awkward answer there would reshape what comes after.
  ➡️ **4 before 3 and 5** because where the draft LIVES is the architectural call both of them sit on.

**1. SESSION SHAPE.** When Otto builds a chest day, is he aiming at a number of exercises, a rough duration,
or whatever the request implies? Without a rule, "build me a chest workout" could come back as three
movements or eleven.

**2. THE PREVIEW AND THE WHOLE INLINE ADD FLOW. ✅ CLOSED 2026-08-11 — all seven parts.**
➡️ **The decisions live in sections 2.1b through 2.1g.** Summary only, so this list stays a queue:
- **2.1b** a structured CARD, not free text and not a modal, sitting OUTSIDE the bubble like an attachment
- **2.1c** Otto supplies exercise NAMES, the app supplies sets/reps/rest from the library
- **2.1d (2a)** the My Routines card condensed: no pencil/trash, no tag pills, count on the title row, rows
  restacked with the numbers as words under the name, rest included, names may wrap to two lines
- **2.1e (2b)** the button NAMES its destination (`ADD TO THURSDAY`), the day is settled before the card
  renders, no day grid, "Add" deliberately not "Load", smaller and CENTERED, app appends a standing line
- **2.1f (2c + 2d)** revision by TYPING with no second button, a new card below rather than an edit in
  place, and the GREYED-OUT STATE (only the newest card is live) closing the stale-Accept hole
- **2.1g** the height maths, and why `scrollToEnd` inverts the worry

**9. 🆕 THE PROGRAM CARD — WHAT A MULTI-DAY BUILD PREVIEWS AS.** Raised by Justin 2026-08-11: *"is it clear
when he builds a program also? does he also need to send a card or preview for that?"*
🔴 **THIS WAS ALREADY FLAGGED IN PROSE (6.3) AND HAD NO NUMBER, WHICH ON THIS PROJECT IS HOW THINGS GET
LOST.** 6.3 says he can build a week or a month, and warns in as many words: *"a 4-day split is four routines
to read before anything can be accepted. Section 2.2 has to survive this. Design the single-routine preview
first."* That instruction was followed — #2 is done — so this is now the next thing.
✅ **PART ONE CLOSED 2026-08-11 -- WHAT A MULTI-DAY BUILD EVEN IS. See 6.6.** Otto never creates a `Program`
object, because a program in this app has no exercises in it. He builds **N routines placed on N specific
dates, each routine carrying one of the six LOCKED tags**, which the existing load path copies onto the day.
The user gets a coloured, labelled week that reads like a program week, with nothing recurring. `focus` needs
no decision (it is set from the routine name automatically) and `customLabel` stays the user's.
❌ **The library's Programs card is NOT the model for the chat version**, since it describes a thing with
nothing in it.

🟡 **PART TWO -- THE REVIEW PROBLEM -- HAS A DIRECTION AS OF 2026-08-12. SEE 2.1h.** A 4-day split is 20
exercises to read before anything can be accepted, which is what 6.3 called the real cost of this feature.
➡️ **ONE card with a COLLAPSED ROW PER DAY** (Justin's proposal), the row modelled on the Programs card's day
pill, expanding into the 2.1d rows. Recorded as direction, not locked -- his sign-off was agreement rather
than enthusiasm, so the visual gets a device pass.
🔴 **BLOCKING DEPENDENCY: the chat's auto-scroll must be fixed first** (it fires on every content-size change,
so expanding a day would throw the thread to the bottom). Shared behaviour with Halo's chat. Detail in 2.1h.

✅ **ONE BUTTON, WITH CHECKMARKS PER DAY — DECIDED 2026-08-13, see 2.1i.** Typing changes content, tapping
changes scope. Per-day buttons rejected.
✅ **THE CARD GREYS OUT AS A UNIT — DECIDED 2026-08-13, see 2.1j.** `Added 2 of 3 days`; unpicked days do not
stay live.

✅ **ITEM 9 CLOSED 2026-08-13.** Two things it hands to other items:
- ⚠️ **To the BUILD, not to an open item: the merge-not-replace rule (6.1) has to hold on EVERY day the build
  lands on**, not just the first.
- ⚠️ **To open item 5:** a card built for three dates and accepted a week later points at days that have
  already passed. The library's own day picker disables past days; **accept-time validation has to catch
  this**, because silently adding workouts to days that already went by is worse than refusing.

**3. WHERE THE PREVIEW RENDERS.** A chat-embedded card, and every modal rule in this project applies
(centred, never a bottom sheet, `ToastRenderer` inside the modal).

**4. THE DRAFT SURVIVING REVISION ACROSS TURNS.** Otto's history is capped at 12 turns (PLAN 4.5, measured,
deliberately left there). A routine revised over several messages has to survive that.

**5. VALIDATION BEFORE SAVE.** Dropping off-list muscle keys, off-list equipment, invalid tags and unknown
exercise names, and what the user sees when something is dropped.

**6. HOW THE LIBRARY REACHES OTTO**, and what it costs in tokens. Names are mandatory (section 4); muscles,
equipment and tags may also be needed. A cached-prompt question as much as a design one.

**7. NAMING THE ROUTINE. ✅ CLOSED 2026-08-13. See 6.7.** Superseded the old direction ("Push A",
"Chest & Triceps", model-composed). **Names are DERIVED from the six locked tags plus the date, never written
by Otto.** Routine `Push · Aug 17`, day focus word `Push`, week card title `Push / Pull / Legs`.

**8. `DayProgram.muscles`. ✅ CLOSED 2026-08-13 — OTTO LEAVES IT EMPTY. See 6.6.** Raised by Justin
2026-08-10 as "who fills in the day's display string". **The answer changed the question: no screen draws it.**
It is a plain muscle sentence stored on the day, separate from the tag and from the focus word, and its only
reader is Otto's own snapshot as a third fallback. ⚠️ **It is NOT the tag** — Justin was rightly confused by
that; 6.6 has the five-values-on-one-day breakdown to explain it with next time.

✅ **NOT OPEN, LISTED SO NOBODY RE-OPENS IT: Mindful.** Identical in Mindful — sets, reps and exercise order
are none of the three modes' business. Decided before this spec existed.

⚠️ **THIS LIST WILL GROW WHEN THE BUILD STARTS, AND THAT IS EXPECTED.** Justin, 2026-08-10: *"need to double
check after its built for more questions/open items too cause there is just no way thats it."* He has been
right every time he has said that so far. **New items get RANKED INTO this table, never appended to the
bottom.**

---

## 10. TRAPS FOUND WHILE SPECCING (each cost a real check)

1. **`saveExercise` does `{ ...ex, ...form }`.** Safe today ONLY because the Create/Edit form has no
   instructions or muscles field. **Add those naively and an empty input wipes a built-in's curated
   instructions.** See PLAN 4.18 item 15, the form upgrade.
2. **The info panel matches names exactly** while PRs normalise. Two rules, one of which fails invisibly.
3. **The workout cap rider bypasses the coach gate** (section 7).
4. **`_free_user_stocktake.cjs` does not simulate riders**, so it reported these very messages as "gated"
   when they are not. **A header warning is not a substitute for reading the call site.**
   See [[feedback_verify_the_call_site]].
5. **One phrasing still leaks:** *"can you put a leg day in my workout tab"* routes as `app-term`, not
   coaching, so it reaches the AI. Fails open, fractions of a cent, logged not fixed.
