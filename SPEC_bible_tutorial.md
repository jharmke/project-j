# SPEC: Bible Tutorial

Status: SPEC LOCKED 2026-06-23, not yet built. Follows tutorial_system_spec.md + the no-skip-steps / inject-demo-state principle.

## Goal
One multi-step spotlight tour of the Bible reader (app/bible.tsx) that shows ALL its features and INCLUDES the new Add to Today's Message (sun) action. Teaches the star (Favorites) vs sun (Today's Message rotation) distinction, which is the agreed way to avoid two-icon confusion. Reading Plans / Devotionals are NOT covered here (the existing faith_bible_plans tour on the Bible and Plans card already does).

## Entry point
Add an info icon to the Bible reader header, to the RIGHT of the existing Settings gear (shift the right cluster: Favorites star, Journal, gear, then the new info icon). Tapping it launches this tutorial. Also reachable from Settings > Help > Tutorials (every tutorial registers there). Filled Ionicon (header-icon standard).

## Demo state (no real data touched)
Tour navigates the reader to a known verse (e.g. John 3:16) and injects a demo highlight so the action banner is visible for the banner steps. A tutorialAction sets the demo highlight before step 3 and CLEARS it on tutorial end/skip (restore real highlight state). The reader's Reanimated.ScrollView must be registered (registerScrollView) so off-screen targets measure; header-target steps use scrollToTop.

## Modal limitation (decided)
The manage-pool modal (VersePoolModal) is a real RN <Modal> (separate native window). TutorialOverlay renders at app root (absoluteFill), so it sits UNDERNEATH any open Modal, same gotcha as the toast-above-modal rule. Therefore we CANNOT spotlight controls inside the sun modal. Instead, step 8 spotlights the GEAR on the Today's Message card and the bubble explains what is inside (cycle vs pin, curated on/off, remove customs). We do not open the modal during the tour. (Getting in-modal spotlighting would mean pulling the manage UI out of <Modal>, against the centered-modal standard, not worth it.)

## Steps (9) -- each needs discipline/balanced/mindful copy
| # | targetKey (element) | Teaches |
|---|---|---|
| 1 | none (noDimOverlay, whole screen visible, NO spotlight) | Welcome / where you are |
| 2 | header book title + chapter bar | Change book and chapter |
| 3 | a demo-highlighted verse row | Tap a verse to highlight it, banner appears |
| 4 | banner sun icon | Add to Today's Message rotation (the new feature) |
| 5 | banner star icon | Favorites + the Rotation vs Favorites distinction |
| 6 | banner reflect + share + Halo cluster | Reflect on a verse, share it, bring it to Halo |
| 7 | header Favorites button + Settings gear | Saved verses list + reading settings (font, size, auto-scroll) |
| 8 | Today's Message card gear (navigateTo the faith tab card) | Manage your rotation: cycle vs pin, curated on/off, remove customs (explains the modal, does not open it) |
| 9 | none | Wrap, returnRoute back to the Bible reader |

## targetKeys to add (useTutorialTarget) when building
bible.tsx: header title/chapter bar, one verse row, the banner sun / star / reflect / share / Halo, header Favorites button, header Settings gear, the new header info icon (launcher).
Today's Message card (FaithTodayCard page 1 + VotdCard): the gear icon (reuse one surface for the spotlight; faith tab card is the faith-context choice).

## Build notes
- Register in TUTORIALS (data/tutorials.ts), tab 'faith'.
- returnRoute = the Bible reader.
- Mode-aware copy on every step (Mindful = warm/observational, no streak/pressure language).
- Confirm the tour returns the user to where they launched it (return-destination rule).
- Keep step 1 spotlight-free per Justin (whole screen as normal).
- Verify every targetKey maps to the correct element (Justin flagged: make sure the right things are actually highlighted).
