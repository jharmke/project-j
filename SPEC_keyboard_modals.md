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

## KNOWN GAPS (not yet done -- see NEXT UP in the roadmap)

- **Hand-rolled modals still teleport** in a few places. Grep `KbHeight|keyboardHeight`. Workout
  Library's Create/Edit Exercise is converted; Add Exercise on the Workout tab, Journal's edit path,
  Profile, Settings and Stats are not.
- **Three sites deliberately skipped in the sweep.** Add a Prayer is top-anchored, so bottom padding
  does nothing for it. Weight History's edit and Recipe Builder's ingredient amount wrap a box that
  isn't full height, where the padding maths would over-shift. Each needs its own look.
- **Fields with no way to dismiss the keyboard.** Multiline fields and number pads have no Return key.
  Add a Prayer can strand the user completely: the card grows as you type until the buttons are off
  screen and there is no way down. Needs a capped height plus an iOS Done accessory bar -- on those two
  field types ONLY, since a single-line field already dismisses on Return.
- **~15 files have a TextInput and no keyboard handling at all.** Unaudited.
