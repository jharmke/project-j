# Keyboard Behaviour in Modals -- Standard + Hard-Won Traps

Written 2026-07-25 after a full day on this. Every trap below was hit for real, on device, and each
one cost a round trip because the symptom pointed somewhere other than the cause. Read this before
touching keyboard behaviour in any modal.

---

## THE STANDARD (what to do going forward)

**A centred pop-up modal uses `<KeyboardAwareCenter>`** (components/KeyboardAwareCenter.tsx), never a
raw `KeyboardAvoidingView`. It pads the box the card is centred in, exactly like `behavior="padding"`
did, but animated over the duration iOS reports for the keyboard's own animation so the card travels
with the keyboard instead of arriving ahead of it.

**A modal that computes the keyboard height itself** (to pad a box AND cap a card's height) uses
**`useAnimatedKeyboardHeight()`** from the same file, so that number arrives already animated.

**A card's height ceiling is a PERCENTAGE of its animated container, never a pixel number derived from
the keyboard height.** See Trap 4.

**Full screens and floating save bars are out of scope.** They are top-aligned and scrollable, where
padding-based avoidance is fine. Do not churn them.

---

## THE THREE PATTERNS THAT EXISTED IN THE APP

Worth knowing because an audit that greps for one of them will silently miss the other two. That
happened: the 2026-07-25 sweep searched for `KeyboardAvoidingView` and reported "done", then Justin
immediately found teleporting modals that had never used it.

1. **`KeyboardAvoidingView`** with `behavior="padding"`. The old house standard. ~19 sites.
2. **Hand-rolled**: a `Keyboard.addListener` storing `e.endCoordinates.height` in state, applied as
   padding and as a card height cap. Grep `KbHeight|keyboardHeight`. Ironically the best-BUILT of the
   three (capping the height is what plain KeyboardAvoidingView gets wrong on tall cards), it just
   wasn't animated.
3. **Nothing at all.** ~15 files have a TextInput and no keyboard handling. Often fine (input near the
   top of the screen), sometimes not. Separate audit, not yet done.

---

## TRAP 1 -- The page behind the modal eats the first tap

**Symptom:** With the keyboard up, tapping a checkbox/button inside a modal dismisses the keyboard and
the control never fires. Dragging scrolls the page behind instead of the modal's list. Feels random
across the app: some modals fine, some not.

**Cause:** A modal floats above everything on screen, but in the COMPONENT TREE it is still a child of
whatever contains it in the JSX. Tap-versus-dismiss is decided by walking that tree. A page-level
`ScrollView` left at the default `keyboardShouldPersistTaps` ("never") eats the first tap for every
descendant, including anything inside a `<Modal>` declared within it.

**Why it survived repeated hunts:** the fix was always applied to the MODAL's own ScrollView, which
can never work. Save as Meal had `keyboardShouldPersistTaps="handled"` on its own list since the day it
shipped and still failed. The Water modal, written AFTER the page ScrollView closes, was always fine.
The codebase is littered with this prop on inner modal ScrollViews -- Weight History, Stats card edit,
Feedback, Label Scan, ~10 in the Workout Library -- every one of them someone trying to fix this from
one level too low.

**Fix:** `keyboardShouldPersistTaps="handled"` on the PAGE's ScrollView.

**It is not a modal bug.** It applies to anything typed into inside a page scroll. The gratitude card
on Faith and the weight card on Home had the identical symptom with no modal involved. Fixed on Log,
Home, Faith, Profile, Settings, Stats; Workout and Workout Library already had it.

---

## TRAP 2 -- Do not add a wrapper view to measure the card

**Symptom:** A modal opens visibly cut off, its Save button gone.

**Cause:** An attempt to measure the card's height slipped an extra view between the modal box and the
card. The card sizes itself with `maxHeight: '80%'` -- of its PARENT. Its parent was a full-screen box;
it became a wrapper with no height of its own, so the percentage had nothing to resolve against and the
card collapsed.

**Rule:** never insert a view into a modal's layout chain. Percentage heights inside are load-bearing.

---

## TRAP 3 -- Do not move the card with a transform

**Symptom:** Taps land nowhere. Checkboxes stop toggling; the stray tap dismisses the keyboard.

**Cause:** Shifting the card visually rather than laying it out means iOS must map a tap 170pt up the
screen back to a control that, as far as layout is concerned, hasn't moved. Taps go missing, and a tap
that hits nothing is exactly what tells a scroll view to dismiss the keyboard.

**The tell that explains it:** a TALL card barely moved (its travel was capped so it couldn't slide off
the top) and worked fine; a SHORT card moved a long way and broke. Same code, opposite outcomes, purely
because of card height.

**Rule:** move the card by changing layout (padding), not by transform.

---

## TRAP 4 -- Do not animate a pixel height ceiling

**Symptom:** The card still teleports even though its padding is animating correctly.

**Cause:** React Native applies a height constraint as a discrete layout value. Animating
`maxHeight: <screen> - <keyboard>` snaps in one frame. On a tall card that resize IS the visible
movement, and it happens on top of a perfectly smooth padding animation, so the whole modal reads as
teleporting.

**Fix:** put the ceiling on the card as `maxHeight: '100%'` (or a percentage) of the animated padded
container and let the shrinking container carry it. The card itself gets `flexShrink: 1`.

**Reference implementation:** the Water modal on the Log tab. `KeyboardAwareCenter(flex: 1, centred)`
containing a card with a percentage maxHeight, direct child, no intermediate sizing view. When
something looks wrong, diff against that one first.

---

## TRAP 5 -- Keep the backdrop OUTSIDE the keyboard-aware box

**Symptom:** With the keyboard open, the strip of screen behind the keyboard is undimmed.

**Cause:** The dimming layer was a `flex: 1` child INSIDE the box being padded, so it shrank with the
box and stopped covering the bottom of the screen.

**Fix:** dimming and the tap-to-close layer are siblings BEFORE the keyboard-aware box, on
`StyleSheet.absoluteFill`. FeedbackModal already did this and carries a comment saying why; Stats' graph
editor did not and regressed. Copy Feedback's shape.

---

## TRAP 6 -- On iOS + New Architecture, LayoutAnimation is dead, so KeyboardAvoidingView cannot animate

**This is the trap underneath all the others, and it explains why this file exists at all.**

`newArchEnabled: true` in app.json. Under Fabric on iOS, **LayoutAnimation does not run.** React Native
says so in its own source (`Libraries/LayoutAnimation/LayoutAnimation.js`): *"LayoutAnimations may
possibly be disabled for now on iOS (Fabric)"*, and the Fabric branch is unconditionally enabled for
ANDROID only.

`KeyboardAvoidingView` has exactly one animation mechanism: it calls `LayoutAnimation.configureNext`
with the keyboard event's own duration and curve. So on this app's platform config, KAV positions
correctly and **animates never**. That is the real reason `KeyboardAwareCenter` was written here, and
the reason the ~19 KAV sites teleport. Nobody had written the cause down, only the symptom.

**Consequence: a JS-driven animation is the ONLY thing that animates a layout property in this app on
iOS.** Do not "fix" a teleport by reaching for KeyboardAvoidingView. It cannot work.

Four approaches were burned on Otto/Halo before this was understood. In order, so nobody repeats one:

1. **`Keyboard.addListener` -> `useState` height -> paddingBottom.** No animation configured at all.
   Teleports both ways.
2. **`useAnimatedKeyboardHeight()`** (RN Animated, `useNativeDriver: false`). Animates, positions
   correctly, but see the CURVE note below -- it felt broken for a reason that was not the thread.
3. **Reanimated `useAnimatedKeyboard()`** (UI thread). WORSE: no animation plus a late jump. These
   chats live inside an RN `<Modal>`, which is a **separate native window**, and Reanimated's keyboard
   tracking does not follow into one. Do not reach for it while a Modal is in the tree.
4. **`KeyboardAvoidingView`.** Teleports, for the reason above. It also needs
   `keyboardVerticalOffset` here: KAV measures its own frame via `onLayout`, which is **relative to its
   parent**, and pads by `frame.y + frame.height - keyboardTop`. That only works at the ROOT of a full
   screen. Inside a sheet pushed down by `marginTop: insets.top + 96`, it under-pads by exactly that
   gap and the input row parks UNDER the keyboard. Symptom worth recognising: rises, but stops short by
   the height of the space above the panel.

### The two things that actually made it feel right

**THE CURVE, not the thread.** `useAnimatedKeyboardHeight` eases the DISMISS with
`Easing.in(Easing.cubic)`. An ease-IN barely moves for the first third of its duration, so across the
keyboard's ~250ms the field sits nearly still while the keyboard travels, then lunges at the end. That
reads exactly as "the keyboard finished before the field even started", and no amount of moving
threads would have fixed it. **`Easing.out(Easing.cubic)` in BOTH directions.**
⚠️ **This bug is still live in `useAnimatedKeyboardHeight`**, which backs the sixteen converted modals.
Deliberately not changed under them untested. See NEXT UP.

**RUN SHORTER THAN THE KEYBOARD'S REPORTED DURATION.** The keyboard starts moving natively at t=0, but
a JS animation cannot start until JS *receives* the event. Run the full reported duration from a late
start and you finish late by that same margin -- the keyboard settles while the field is still visibly
travelling. The head start is unrecoverable, so pull the finish in: `duration * 0.7`, clamped to
120-250ms. Both chats expose this as a single `KB_FOLLOW` constant.
⚠️ **`KB_FOLLOW = 0.7` was tuned in a DEV build**, where event dispatch latency is inflated by Metro.
On a release build that latency drops and this may want to move back toward 0.85 or 1.0. Expect it to
feel slightly fast on the first TestFlight and treat that as expected, not a regression.

**Do not use a transform to dodge all this.** See Trap 3.

---

## TRAP 7 -- A FLOATING SAVE BAR IS NOT PART OF THE KEYBOARD (found 2026-08-04, Settings > Goals)

This one is NOT about modals. It is any long screen with a floating save/cancel bar over the bottom, which
is most of the settings-shaped screens in the app. It took four rounds to get right and every round failed
for a different reason, so all four are written down.

**THE SYMPTOM.** Tap something that makes the save bar appear (a preset card), then tap a text field low on
the page. iOS lifts the field above the KEYBOARD and drops it straight behind the BAR.

**WHY IT HAPPENS.** `automaticallyAdjustKeyboardInsets` (and KeyboardAvoidingView, and every built-in) only
knows about the keyboard. A bar you drew yourself at `position:'absolute', bottom:0` is invisible to them.
The field has to clear the keyboard AND the bar, and only your code knows the second number.

⚠️ **`setFloatingBarHeight` DOES NOT HELP.** It looks like it should: it is global and it is set from
exactly these screens. It only lifts the Otto FAB (`components/AssistantOverlay.tsx`). It pads nothing and
scrolls nothing. Reading its name and assuming was one of the wasted rounds.

**THE FOUR FAILURES, in order:**
1. **Compensating in the wrong place.** The original code scrolled by the bar's height when the BAR appeared
   while the keyboard was already up. That is the rarer order. Bar first, then keyboard, was uncovered.
2. **Scrolling by a fixed amount.** Shifting by the bar's height on every focus pushed a field that was
   already high on the screen off the TOP. **Measure the field and move only the overflow past the bar.**
   `node.measureInWindow(...)`, `barTop = screenHeight - keyboardHeight - BAR_HEIGHT`, scroll by
   `(y + h + margin) - barTop` and only when that is positive.
3. 🔴 **READING THE KEYBOARD HEIGHT FROM STATE INSIDE A FOCUS HANDLER. This is the real trap.** The handler
   closes over the value from the render that created it, which on the first tap is **0** -- so `barTop`
   computes as if there were no keyboard, nothing ever measures as covered, and nothing scrolls. It fails
   SILENTLY and looks like a measuring bug. Keep the height in a **ref** written by the listeners.
4. **Firing on focus alone.** `keyboardDidShow` lands only after the keyboard finishes animating, later than
   any timer you set from `onFocus`. Do the work FROM the show event, using `e.endCoordinates.height`.

**THE SHAPE THAT WORKS. Two entry points, and you need both:**
- **`keyboardDidShow`** handles tapping a field with the keyboard down. The event carries the exact height.
- **`onFocus`** handles tapping a DIFFERENT field while the keyboard is already up, because no show event
  fires then. Read the height off the ref, not the state, and give it ~60ms.
Both call one shared measure-and-scroll function. Track which field has focus in a ref.

Reference implementation: `onGoalFieldFocus` / `clearFocusedGoalField` in `app/settings.tsx`.

---

## KNOWN GAPS (not yet done -- see NEXT UP in the roadmap)

- **Hand-rolled modals still teleport** in a few places. Grep `KbHeight|keyboardHeight`. Workout
  Library's Create/Edit Exercise is converted; Add Exercise on the Workout tab, Journal's edit path,
  Profile, Settings and Stats are not.
  ⚠️ **THAT GREP IS NOT SUFFICIENT.** Justin found Otto's and Halo's chats teleporting on 2026-07-25,
  after the sweep. Both used the hand-rolled pattern but named the variable `kb`, so neither
  `KbHeight` nor `keyboardHeight` matched. This is the same failure mode as the original
  KeyboardAvoidingView-only sweep: greping for ONE spelling reports "done" while sites survive.
  Search for the BEHAVIOUR, not a name: `Keyboard.addListener` + `endCoordinates` is what actually
  identifies this pattern. Both chats are now fixed -- see TRAP 6 for what it took.
- **Three sites deliberately skipped in the sweep.** Add a Prayer is top-anchored, so bottom padding
  does nothing for it. Weight History's edit and Recipe Builder's ingredient amount wrap a box that
  isn't full height, where the padding maths would over-shift. Each needs its own look.
- **Fields with no way to dismiss the keyboard.** Multiline fields and number pads have no Return key.
  Number pads are unaudited. `components/KeyboardDoneBar.tsx` exists for them: an iOS input accessory
  bar, styled after the onboarding height/goal fields (translucent chrome fill over a blur, tight
  padding, hit-slop rather than a fat touch target -- an opaque fill turns it into a slab).
  **Apply it to multiline and number-pad fields ONLY**; a single-line field dismisses on Return and a
  Done bar there is chrome above every keyboard in the app.
  **Reach for the height cap first.** Add a Prayer was the motivating case: its card grew as you typed
  until Cancel and Add were pushed off screen with no way back. A Done bar was built for it and then
  REMOVED, because capping the card height meant the buttons could never leave, so the user was never
  stranded and the bar had no job left but to look bolted on. It also read as stuck-on rather than part
  of the keyboard, since a light bar sits badly under a dark keyboard and the keyboard's appearance
  cannot be reliably predicted. A trapped user is a layout problem before it is a keyboard problem.
- **~15 files have a TextInput and no keyboard handling at all.** Unaudited.
