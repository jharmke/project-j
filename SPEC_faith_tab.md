# Faith Tab: Layout + Card Spec

First checkpoint: 2026-06-04 (initial scoping with Justin)

Status: SCOPING. This is the layout and card-level source of truth for the Faith tab. The AI companion (Halo), devotional plans, and Bible reader have their own specs (SPEC_faith_ai.md). This doc covers what the tab looks like, what cards live here, how they behave per tier, and how they relate to the home tab. No double dashes anywhere (project rule).

---

## What this doc covers
- The Faith tab as a screen: header, card list, edit layout
- Each card: what it shows, where it routes, tier behavior
- Card migration from home tab: which cards move here as their default home
- Halo FAB nudge behavior
- First-time experience
- Tier behavior summary (Rooted / Exploring / NRN)

For Halo AI internals: SPEC_faith_ai.md
For devotional and reading plan content: SPEC_faith_ai.md Piece B
For the tab bar icon (ichthys fish, amber glow): CustomTabBar.tsx + FaithIconFish.tsx

---

## The tab bar slot

The Faith tab occupies the 5th (rightmost) slot in the tab bar. Icon is the ichthys fish (FaithIconFish.tsx), amber when active with a breathing glow, neutral when inactive. This slot is tier-aware:
- Rooted / Exploring: Faith tab present
- Not Right Now: Profile tab returns to this slot, Faith tab never appears

This is already built. No changes to the tab bar needed for this spec.

---

## Header

Consistent with all other tabs. Same pattern app-wide. No special atmospheric treatment in the header row.

Right-side header icons (TBD at build, candidates):
- Grid icon: opens Edit Layout (same as home tab)
- Question mark: opens toolkit / tutorials for the faith tab
- Possibly: a shortcut to Faith Journey settings (currently buried in Settings > Profile)

No "PROJECT J" label. No special greeting in the header. The header is navigation only.

---

## Tab atmosphere

The faith tab has a subtle amber/gold atmospheric layer LAYERED OVER the user's current theme. This never replaces the theme -- all 5 themes and all accents are respected. The amber layer is:
- A very faint warm tint in the background (barely perceptible, like candlelight)
- Card borders may carry a faint amber edge glow instead of the standard rgba(255,255,255,0.1) top border
- The fish tab icon glow sets the tone; the screen continues it subtly

This is the same approach the verse card uses today (backgroundColor #16162a, amber border). The whole tab feels like that card's extended environment.

Light themes: the amber layer needs extra care -- cannot make it muddy. A very low-opacity amber tint on a light background may read as yellow-stained rather than warm. Test all themes before shipping. May need a different atmospheric expression on light themes.

---

## Edit layout

The faith tab has its own Edit Layout system, identical to the home tab:
- Same grid icon in header triggers it
- Same drag-to-reorder, eye badge for show/hide
- No "Add Graphs" section (no stats graphs on the faith tab)
- Hidden cards are addable back, same as home
- Each card has an independent visibility state and position in faith tab edit layout vs home tab edit layout

The card order below is the DEFAULT order. Users can rearrange or hide anything.

---

## Cards

### Card 1: Today's Message (VOTD)

What it shows: identical to the home tab version. Verse of the day, amber-styled card, verse text, reference. Same size as home -- does not need to be larger here. It already stands out via its distinct color.

Behavior: same as home card. Tapping verse opens Bible reader at that passage.

Default home: BOTH home tab and faith tab show this card by default. It is the daily anchor and many users will want it on both. It is NOT being migrated away from home -- it stays on home.

Tier behavior:
- Rooted: full verse, amber card, full experience
- Exploring: same card, same verse -- no downgrade
- NRN: card not present (NRN has no faith tab)

---

### Card 2: Bible and Plans

What it shows: a single card with two connected sections -- active plan(s) and Bible reader access. The user can have MULTIPLE active plans simultaneously (one reading plan and one or more devotionals). The card needs to handle this gracefully.

Active plan section:
- Shows all currently active plans, not just one
- Each active plan row: plan name, progress (Day 3 of 14), a Continue button
- If multiple plans active, they stack vertically inside the card (scrollable if more than 2-3)
- No arbitrary limit on simultaneous active plans

Bible reader entry:
- A simple row below the active plans: last-read book/chapter, jump-in button
- Routes to the existing Bible reader (app/bible.tsx)

Empty state (no active plans):
- Featured plan suggestions fill the card instead of the active plan rows
- Suggestions are curated (static v1, data-personalized v2 after Smart Coach brain exists)
- A "Browse all plans" row routes to the full plans hub

Routing:
- Tapping an active plan row routes to that plan's screen
- Tapping the Bible row routes to the Bible reader
- Tapping "Browse all plans" routes to the plans hub

Tier behavior:
- Rooted: full card
- Exploring: full card -- no features hidden by default
- NRN: not present

---

### Card 3: Gratitude

What it shows: identical to the home tab version. Current gratitude streak, quick-add entry, recent entries preview.

Card migration: Gratitude's DEFAULT home moves to the faith tab. It is removed from the home tab default card list. Users can re-add it to home via home Edit Layout if they want it there. This is not forced -- it is a default change, fully reversible.

Reason: gratitude is a faith-adjacent practice. The faith tab is its natural home. Home gets slightly cleaner.

Tier behavior:
- Rooted: full card
- Exploring: full card
- NRN: not present (gratitude stays in the faith ecosystem, not migrated to home for NRN users; NRN users still have access to gratitude logging from the journal screen directly)

Open question at build: does NRN gratitude access disappear entirely, or is there a path to it from elsewhere? Decide before shipping.

---

### Card 4: Prayer

What it shows: a prayer hub card. Active prayer requests the user has written, ability to mark a request as answered, quick-add for new requests.

This is distinct from two existing things:
1. The email prayer request feature (PrayerRequestModal -- sends a prayer to Justin's inbox). That feature STAYS in the Bible screen settings where it lives. This card is something different: the user's OWN prayer list.
2. The Journal (pj_bible_reflections). Prayer entries in the journal are private reflections. This card is a request-and-answer tracker. Different purpose, different UX, can coexist cleanly.

The line between journal and prayer card: journal = personal written reflection (prose, processing). Prayer card = a request with a status (active / answered). Short, tracked, closure-oriented.

Scope for this card (v1):
- List of active prayer requests (user-written, short text)
- Mark as answered (moves to answered history, with optional date)
- Quick-add new request
- Answered history collapsible at the bottom of the card

Routes to: a full prayer screen if the list gets long, or this card may be self-contained if kept short. Decide at build.

Tier behavior:
- Rooted: full card
- Exploring: full card -- faith at their own pace, do not hide this
- NRN: not present

Storage: new pj_prayers key. Shape TBD at build. Read-then-merge, never wholesale overwrite.

---

### Card 4: Prayer, FULL BUILD SPEC (LOCKED 2026-06-04, ready to build as Bucket B step B2)

Every decision below was worked out and locked with Justin in the scoping thread. This is the build-ready spec; nothing here is still open unless explicitly marked.

ARCHITECTURE (choice A, locked): the Prayer entry on the faith tab is a COMPACT PREVIEW CARD that opens a DEDICATED FULL PRAYER SCREEN (new route app/prayer.tsx). It mirrors the Journal card pattern (preview + launcher, not the full thing inline). Chosen because a single card cannot gracefully hold a long active list plus a growing answered history; a real screen scrolls naturally. This also keeps the faith tab from being dominated by one giant card and stays consistent with the other faith cards. (This SUPERSEDES the earlier "self-contained card vs full screen, decide at build" note above; it is a full screen.)

THE PREVIEW CARD (on the faith tab) shows:
- The answered count as a hero stat, for example "12 answered", BUT only once the user has at least 1 answered prayer (so a list of all-ongoing prayers never reads as "you have 0").
- The 2 to 3 most recent active prayers as read-only preview rows.
- A "+ Add a prayer" quick-capture (opens the add pop-up).
- A "View all" affordance that opens the full Prayer screen.
- Build-time call: whether the tap-to-answer circle appears on the preview rows or only on the full screen. Lean: answer/manage actions live on the full screen, the preview is read-only plus quick-add.
- Carries the faith-tab amber atmosphere / gold card edge like the other cards.

THE DEDICATED PRAYER SCREEN (app/prayer.tsx):
- All active prayers, scrolling normally (this is what solves the "15 open prayers" worry).
- The mark-answered interaction (see below).
- The full answered history, its own section, scrolling (solves the "huge answered list" worry). Collapsed/secondary so it never dominates.
- Add a prayer (the pop-up).
- Delete any prayer, WITH a confirm (it is real data).
- A "Need prayer? Ask us" row that opens the EXISTING PrayerRequestModal (the email-to-Justin feature). This surfaces a currently-buried feature (it lives in Bible settings) and gives the screen a warm community dimension. Build-time call: add here and keep the Bible-settings entry too, or move it entirely. Lean: add here, keep both.
- Edit prayer text is OUT for v1 (delete plus re-add covers it).
- Should carry the faith look (header pattern consistent with other screens; the amber treatment).

ADD UX (locked): a small CENTERED "Add prayer" pop-up, a fade modal, NOT a slide-up sheet (Justin dislikes slide-ups). Short text input (prayers are short) plus Save. The Save button DIMS when the input is empty, full accent when ready. Toast on save. KeyboardAvoidingView. Used from both the card (quick-capture) and the screen.

MARK-ANSWERED INTERACTION (locked): tap the circle, it fills with a check plus a quick animation, success haptic, the row slides into the Answered section stamped with today's date, a small toast confirms. NO upfront confirmation dialog (a confirm on a celebratory action kills the moment). Accidental taps are handled by REVERSIBILITY: answered items have a "move back to active" (un-answer) tap. The circle is its OWN distinct 44pt target, separate from tapping the prayer text. Optional Undo on the toast is allowed but start without it.

FRAMING, THE CRUX (locked, this resolved Justin's whole hesitation): warm, "things I am carrying before God," NOT a to-do checklist.
- Ongoing / open-ended prayers are SUPPOSED to persist. Example Justin gave: praying nightly for a healthy baby and smooth pregnancy for 7 to 8 months until January. That prayer sitting in the list the whole time is not clutter, it is literally the thing he prays THROUGH each night; the list's purpose is to be the nightly prayer guide, not a backlog to clear. A long-lived prayer is faithfulness, not an overdue task.
- The visual must read as "lifting up / carrying," not "task then done." Avoid a stark todo-checkbox feel; the circle is a gentle "mark answered when God shows up," not an overdue checkbox. This warmth is what dissolves the "why is this still open after 8 months" unease.
- Marking answered is FULLY OPTIONAL. Open-ended prayers may never be marked; the user just deletes them when they are no longer on the heart, or never. No end date is ever required.
- NO time/duration counter. The earlier "praying X days / weeks" idea is CUT, it risks reading as "still unanswered after 200 days" pressure, which cuts against the whole warm framing.
- The answered list is a quiet celebration and record of God's faithfulness (the Ebenezer stone, "thus far the LORD has helped us"), kept unobtrusive (collapsed by default), so people who never use it never see it.

DATA SHAPE (locked): new pj_prayers AsyncStorage key = an array of { id: string, text: string, status: 'active' | 'answered', createdAt: number, answeredAt: number | null }. Written through storageSet so it rides the cloud backup like the journal (read-then-merge, NEVER wholesale overwrite, data-integrity rule). pj_prayers is currently unused anywhere in the codebase (verified this thread), so no collision. It syncs via both the incremental storageSet path and the background sweep (it is not in any shouldSync exclude list).

JOURNAL "PRAYER" CATEGORY RETIREMENT (locked): when the Prayer section ships, RETIRE the journal's "prayer" category so there is ONE home for prayer (this tracker) and the journal keeps its prose categories. Justin has only TEST prayers in the journal now and is fine losing them, so now is the clean time. For real users post-launch, prayer-tagged journal entries could fold into pj_prayers, a launch-time migration detail to handle carefully (read-then-merge). This touches journal.tsx (the category list / filter pills); assess impact before changing. Could be folded into B3 since B3 also touches journal.tsx.

THE PRECEDENT PRINCIPLE (locked, broader, answers Justin's "does everything need its own page now?"): a category earns its own dedicated surface ONLY when it has a LIFECYCLE or STRUCTURE that prose-in-the-journal cannot hold. Prayer crosses that line (lifecycle: lift up, carry, answered, plus an answered tally). Gratitude crosses it (a daily HABIT with a streak, which is why it already has its own card). Workout notes (prose attached to a workout) and journal entries (verse / study / personal prose) do NOT cross it; they stay exactly where they are. This is NOT a precedent that every journal category needs a page; only true structure or lifecycle earns a surface.

MINDFUL MODE (locked): identical in all three coaching modes. A neutral request tracker with no scores and no judgment language; nothing to soften.

TIER (locked): Rooted and Exploring get the full card plus screen; NRN has no faith tab so it never appears. No tier difference within the feature.

BUILD STANDARDS to honor (non-negotiable): empty state on both the card and the screen (icon plus "nothing yet" plus how to add); loading state; toast on every save; haptics (light for taps, success for answered, heavy for delete); 44pt touch targets; dim/inactive add button; KeyboardAvoidingView on the add modal and the screen.

DISTINCT FROM THE EXISTING EMAIL FEATURE (verified in code this thread): components/PrayerRequestModal.tsx writes to Firestore users/{uid}/prayer_requests and triggers the onPrayerRequestCreated Cloud Function email to Justin. That is a SEPARATE feature (request prayer FROM the team). The new Prayer tracker is the user's OWN private LOCAL list (pj_prayers), never emailed. The only crossover is the "Ask us" row on the prayer screen, which opens that same existing modal.

---

### Card 5: Journal

What it shows: recent faith journal entries (verse, prayer, study, personal, gratitude categories). Entry count or streak if applicable. Quick-add FAB or inline add button.

This is the faith tab's entry point into the existing journal screen (app/journal.tsx). The card is a preview + launcher, not a full inline journal.

Card migration: Journal card's DEFAULT home moves to the faith tab. Removed from home tab defaults. Re-addable to home via Edit Layout.

Tier behavior:
- Rooted: full card
- Exploring: full card
- NRN: not present

---

### Halo (no dedicated card -- FAB handles this)

Halo is always present as the breathing amber FAB (bottom-left) on every faith screen. A dedicated card is NOT added. The FAB is the entry point.

Discoverability is handled by the FAB nudge (see below) and the first-time experience tutorial.

---

## Halo FAB nudge behavior

The Halo FAB occasionally surfaces a small chat bubble prompt above it to signal that Halo is available and suggest a conversation. This is the discoverability layer that replaces a dedicated card.

Rules:
- Maximum once per app open
- Only fires if the user has NOT opened Halo in the current app session
- Fires after the user has been on the faith tab for a few seconds (not instant)
- Prompt copy is contextual when possible:
  - If an active devotional exists: "Want to reflect on today's reading?"
  - If it is morning: "What's on your heart today?"
  - If it is evening: "How did today go?"
  - Default fallback: "Ask Halo anything."
- Bubble fades away automatically after ~4 seconds if ignored
- Tapping the bubble opens Halo (same as tapping the FAB)
- Frequency cap: not more than once every 24 hours total across all faith screens, not just once per tab open. A user who opens and closes the faith tab multiple times in a day should not see it repeatedly.

The nudge copy lives in the same system as Halo's rotating greeting so it feels cohesive, not like a separate feature.

---

## First-time experience

When a user opens the Faith tab for the first time (or after a fresh install):

1. The standard guided tutorial fires first. Spotlights each card, explains edit layout, explains the fish FAB. Follows the existing tutorial system pattern exactly. Does NOT use Halo to run this -- the scripted overlay is the right tool for a precise UI walkthrough.

2. At the end of the tutorial, the Halo FAB pulses and a bubble appears: "I'm Halo. Ask me anything about faith, life, or Scripture." This is Halo's introduction -- a moment, not a tutorial step. Tapping it opens Halo.

3. The tutorial covers the message limit briefly: "Halo includes 5 free conversations per day. Pro users get more." Sets the expectation before they hit the wall.

This is NOT Halo running the tutorial. Halo introduces itself after the tutorial ends.

---

## Halo memory (fact bank) -- scoped, not yet built

Direction agreed: Halo should be able to remember key facts across sessions so it does not re-greet the same context cold every time.

Mechanism (proposed, TBD at build):
- After a meaningful exchange where a significant personal fact is shared, Halo surfaces a small prompt: "Want me to remember this?"
- User taps yes, a short summary of the fact saves to a local pj_halo_memory key
- The saved facts are injected into Halo's context on each new session (as a short preface, not the full chat history)
- User can view and delete saved facts from a "Halo Memory" section (location TBD -- maybe inside the Halo chat header or in Settings)

What gets saved: personal facts the user explicitly confirms (pregnancy, job change, major life season, ongoing prayer focus). NOT metrics, NOT chat summaries, NOT behavioral inferences.

The tutorial mention: the first-time experience can briefly note "Halo can remember things you share with it -- just ask."

Full spec for this feature is its own build item. Do not block the faith tab build on this.

---

## Halo conversation history -- open

Direction: some form of history is needed so users can return to past conversations.

Open questions (decide before building):
- Storage cap: last N conversations (roll off) vs user-pinned (keep forever) vs both
- Proposed: unpinned conversations age out after 30 days; pinned conversations kept indefinitely
- Where history lives: inside the Halo chat UI (a history button/tab), or a dedicated card/section on the faith tab
- Pro vs free distinction: does free get fewer saved conversations?

Not blocking the faith tab build. Scoped separately.

---

## Card migration from home tab (summary)

Cards that MOVE (default home becomes faith tab, removed from home defaults):
- Gratitude
- Journal (faith journal card)

Cards that STAY ON BOTH by default:
- Today's Message (VOTD) -- daily anchor, wanted on home by many users

Cards that are NEW to the faith tab (never on home):
- Bible and Plans
- Prayer

All migrated cards are re-addable to home via home Edit Layout. The faith tab cards are also user-reorderable and hideable via faith Edit Layout. No card is permanently locked to either tab.

---

## Tier behavior summary

| Card | Rooted | Exploring | NRN |
|---|---|---|---|
| Today's Message | Full | Full | No faith tab |
| Bible and Plans | Full | Full | No faith tab |
| Gratitude | Full | Full | No faith tab |
| Prayer | Full | Full | No faith tab |
| Journal | Full | Full | No faith tab |
| Halo FAB | Full | Gentle framing | No faith tab |

Exploring gets everything Rooted gets. The gentleness for Exploring is in Halo's tone and framing (SPEC_faith_ai.md), not in hidden cards. Do not hide features from Exploring users -- they opted in.

NRN: the faith tab does not exist. Profile tab returns to the 5th bar slot. NRN users retain access to the journal screen and Bible reader via direct navigation if they find their way there, but no faith cards surface on home or anywhere by default.

---

## Open questions (resolve before or at build)

1. Header icons: which 2-3 icons go in the top-right? Edit layout grid is certain. Toolkit/help likely. Faith Journey settings shortcut -- decide.
2. NRN gratitude access: does NRN have a path to gratitude logging anywhere, or is it fully gated behind the faith tab? Probably accessible from journal directly -- confirm.
3. Prayer card routing: self-contained card vs routes to a full prayer screen? Decide at build based on expected list length.
4. Halo card: confirmed no dedicated card. FAB + nudge is the discoverability mechanism. Revisit if real-user testing shows Halo is being missed.
5. Light theme atmospheric layer: amber tint may not work on light backgrounds. Needs a dedicated look at build -- may need a different atmospheric approach per theme family (dark themes: amber tint; light themes: a warmer paper texture or subtle gold card borders only).
6. Edit layout tutorial: the faith tab edit layout tutorial needs its own tutorial entry in data/tutorials.ts, similar to the home tab edit layout tutorial. Build at same time as the tab.

---

## Checkpoint log
- 2026-06-04: Initial layout scoping with Justin. Cards defined, tier behavior set, card migration from home agreed, Halo FAB nudge direction set, first-time experience approach locked (tutorial then Halo introduction, not Halo running the tutorial), memory and history direction captured as open items. Faith tab spec created as its own doc separate from SPEC_faith_ai.md.
- 2026-06-04 (reconcile pass with Justin): two confirmations.
  TAB ICON: confirmed the ichthys FISH (FaithIconFish.tsx), not the dove. The dove references in SPEC_faith_ai.md are now marked stale. This doc was already correct.
  HOME FAITH LAUNCHER CARD (preserved, Justin: "don't remove that home card idea"): the HOME tab keeps a faith launcher / hub card (VOTD + plan-resume + ask-companion) that routes INTO this Faith tab. That home launcher is a SEPARATE surface from the cards listed in this doc (which are the Faith tab's own internal cards). Card 1 here (Today's Message / VOTD) staying on both tabs is consistent with that; the home launcher is the entry point, the tab is the destination. Do not collapse or remove the home launcher when building the tab.
- 2026-06-04 (build started, Bucket B). Build order: B1 framework + atmosphere + Bible card, B2 Prayer, B3 Gratitude + Journal + home migration, B4 faith edit layout, B5 Halo FAB nudge, B6 first-time experience. DONE + device-confirmed: B1 and the VOTD card. The faith tab now has its own card framework (faithCardOrder / faithCardVisible in pj_settings, separate from home, read-then-merge). The amber atmosphere is a candlelight wash from the top: deeper on Dark, brighter and warmer at higher opacity on the four light themes (a faint brown vanishes on near-white), plus a faint gold card edge; confirmed good on all themes. The Bible card is Option 2: a clean launcher into the existing reader, no plans section yet (that and the "Bible and Plans" title arrive with Bucket C). Today's Message shows the SAME verse as Home via a new shared data/verses.ts (VERSES + resolveDailyVerse extracted from index.tsx; Home refactored to use it; the lastDate guard keeps both tabs in sync; verified both show Psalm 46:1). The faith VOTD omits the reflection-prompt subtext (kept off per Justin) and, for now, the journal shortcut icon (decision DEFERRED until the Journal card lands in B3). The rich "feels like a place" liveness (arrival stagger, etc.) is a later polish pass.
- 2026-06-04 (B2 Prayer fully scoped, ready to build, NOT yet built). Long design discussion with Justin, every decision locked in the new "Card 4: Prayer, FULL BUILD SPEC" section above. Headlines: choice A (compact preview card + a dedicated app/prayer.tsx screen, mirrors the Journal card pattern, scales where a single card cannot); warm "carrying before God" framing (NOT a todo checklist), which resolved Justin's hesitation about open-ended prayers sitting for months (the pregnancy example: persistent is the point, the list is the nightly prayer guide); marking answered is optional, instant-and-reversible, no confirm; the "praying X days" duration was CUT (reads as pressure); the answered count is the hero stat but only shows once at least 1 is answered; data shape pj_prayers = array of {id, text, status, createdAt, answeredAt} synced via storageSet; the journal "prayer" category gets retired when this ships (Justin has only test data); the "Ask us" row on the screen opens the existing email PrayerRequestModal; Mindful identical; Rooted/Exploring full, NRN none. The PRECEDENT PRINCIPLE was locked too (a category earns its own surface only with a lifecycle/structure prose cannot hold, so Prayer and Gratitude yes, workout notes and journal prose no). Captured here because the scoping thread was running low on budget; B2 is to be BUILT in a fresh thread from this spec.
- 2026-06-04 (B2 BUILD in progress, handing off mid-debug; thread ran out of usage). The Prayer feature is BUILT and mostly device-confirmed EXCEPT one blocking bug (the add-modal keyboard, below). What shipped this thread:
  FILES: utils/prayers.ts (pj_prayers data layer: Prayer = {id,text,status,createdAt,answeredAt}; load/add/updatePrayer/markAnswered/unanswerPrayer/deletePrayer; pure selectors getActive/getAnswered/answeredCount; all read-then-merge via storageSet, never wipes). components/AddPrayerModal.tsx (centered fade pop-up, add AND edit mode). components/PrayerActionModal.tsx (tap a prayer to open: God answered this / Move back to active / Edit / Delete, with Cancel). app/prayer.tsx (the full screen). Preview card added to app/(tabs)/faith.tsx (PrayerCard + added 'prayer' to BUILT_CARDS). Route registered in app/_layout.tsx (Stack.Screen name="prayer", headerShown false). NEW FONT: installed @expo-google-fonts/lora, loaded Lora_400Regular + Lora_500Medium in app/_layout.tsx.
  DESIGN DECISIONS device-confirmed by Justin: the "God answered this" moment plays IN the prayer's own row (text crossfades to a gold "Praise God", holds, the whole row fades out, THEN it moves to Answered, with a 250ms tail pause so nothing snaps). The earlier full-screen "PRAISE GOD" overlay was REJECTED as too performative, do not bring it back. Prayer text uses the Lora serif in warm amber (theme.accentAmber), NOT black and NOT washed-out gray (Justin hates dark-black body text). On the faith CARD, preview prayers sit in faint gold-tinted boxes over the opaque card. On the PAGE, each prayer is its OWN opaque box (theme.bgCard + gold border) so they do not blend, Lora amber text. Answered count is a Bebas hero stat TOP-RIGHT of the prayer SCREEN only (never on the card), shows only when >=1 answered, pops on answer. Ebenezer line under the answered list = "A record of answered prayer." Edit added (Justin wanted it; spec had punted it). "Prayers and Praises" rename was CONSIDERED and DROPPED (kept "Answered"; a separate praise type would overlap the Gratitude card in B3). Card press-scale (0.97) added to all three faith cards (VOTD, Bible, Prayer). The card "Add a prayer" pill and the modal Add button both have haptics.
  THE BLOCKING BUG (unsolved, the new thread must fix this FIRST): in AddPrayerModal, tapping Cancel or Add while the keyboard is UP does nothing except dismiss the keyboard; the button onPress never fires. GROUND TRUTH from console logs left in the file ([PRAYERMODAL] prefix, DO NOT strip them, they are the debug harness): on a button tap with keyboard up, ONLY "ScrollView onTouchStart" logs. The button onPressIn/onPress and the backdrop Pressable onPressIn/onPress NEVER fire. This held with keyboardShouldPersistTaps BOTH "handled" AND "always". So the ScrollView is swallowing the tap and not delivering it to children. THINGS ALREADY TRIED (all failed): KeyboardAvoidingView + separate backdrop + box-none; ScrollView keyboardShouldPersistTaps="handled"; ScrollView + automaticallyAdjustKeyboardInsets (also caused a white box behind the keyboard, now fixed by putting the dim on the outer View); fixed-position top-anchored card with NO ScrollView; ScrollView keyboardShouldPersistTaps="always". Current file state: Modal > View(dim = theme.overlayBg) > ScrollView(keyboardShouldPersistTaps="always", fixed paddingTop insets.top+50, autofocus on) > Pressable backdrop + Animated card with Cancel/Add. NEXT IDEAS for the new thread: (1) the app uses react-native-gesture-handler, the Modal content likely needs to be wrapped in a GestureHandlerRootView (RN gesture-handler does NOT work inside a Modal without it, this exact issue bit the Halo chat drag-to-dismiss per SPEC_faith_ai); strong suspect. (2) Open components/PrayerRequestModal.tsx and TEST whether ITS Cancel/Send fire with the keyboard up; if they DO, copy its exact structure verbatim; if they do NOT, the whole app has this latent and the gesture-handler/root-view theory is likely. (3) Try ditching the ScrollView entirely and use a plain View + a Keyboard listener, or InputAccessoryView for the buttons. Do NOT keep guessing structures blindly, instrument with the existing logs and reason from what fires.
  ALSO STILL OPEN on the faith tab (post-bug): (c) Bible card redesign, Justin's pick is PENDING between "Continue reading" (needs last-read tracking added to app/bible.tsx, which currently always opens Genesis 1) vs "quick-jump book chips" (no reader change); the visual treatment is agreed (gold book icon, drop the "King James Version" line, warmer not-black title). (d) a card depth/borders pass across the faith tab (cards look flat on light themes; CLAUDE.md says light themes need stronger shadows; consider a thicker gold top edge like the meal cards). Then the rest of Bucket B: B3 (Gratitude + Journal cards + home-tab card migration + RETIRE the journal "prayer" category, which touches journal.tsx), B4 (faith edit layout), B5 (Halo FAB nudge), B6 (first-time experience). Launch-pinned, unrelated: remove DEV_UNLIMITED_UIDS in faithCompanion.ts, wire pj_halo_reports to a review sink.
- 2026-06-04 (B2 BUILD finished; the keyboard bug was abandoned and worked around, not solved). The Prayer feature is shipped and device-confirmed via the prayer screen. THE BUG, now understood but UNSOLVED: AddPrayerModal swallowed button taps while the keyboard was up ONLY when opened from the faith TAB card; from the prayer-screen FAB (a Stack screen) the identical modal works perfectly. So it is the faith TAB context, not the modal. Everything tried on the tab case failed (no ScrollView, no statusBarTranslucent, no autoFocus + delayed focus, and a GestureHandlerRootView wrap copied from CompanionChat); root cause still unknown. CompanionFAB is a plain Pressable (no gesture-handler), so Halo's FAB is not the grabber. DECISION (Justin): stop chasing it, remove the card quick-add, route all adds through the prayer-screen FAB. The Prayer preview card lost its whole bottom row (the "+ Add a prayer" pill and "View all"); a chevron now sits top-right of the PRAYER label as the tap-to-open cue, and the card body still taps through to app/prayer.tsx. AddPrayerModal is now FAB-only; its header comment records the unsolved tab bug. POLISH: the FAB add pop-up no longer jumps when the keyboard rises (the card is anchored near the top with paddingTop insets.top + 80 so it clears the keyboard and never shifts). WARNING for B3: the Gratitude and Journal quick-adds will hit this same tab-modal touch bug if they open a modal from the faith tab; solve it first or reuse the Stack-screen/FAB workaround. Still open on the tab after B2: (c) the Bible card redesign (pick pending: "Continue reading" vs "quick-jump book chips"), and (d) a card depth and borders pass for the light themes.
- 2026-06-05 (gym note batch, doc filing only, no code yet). Three prayer items captured for a later polish pass; two notes dropped after review. OPEN (to build later): (e) the prayer-screen ADD FAB needs the app-wide card-press animation (scale to 0.97 on pressIn, back to 1.0 on pressOut, timing not spring); today it has activeOpacity only, no scale feedback. The three faith CARDS already got the 0.97 press-scale in B2; this just extends it to the FAB. (f) PrayerActionModal should show a small low-weight muted line with the date the prayer was added (uses the existing createdAt, NO data-shape change); sits under the prayer text as quiet context. DROPPED after review: the optional prayer-TITLE field (gym-Claude recommended it; weighed pros and cons with Justin and held off, the warm single-input capture plus the truncated-first-line preview fallback already cover it and prayers are short enough that the text is its own title; revisit only if long multi-sentence prayers make first-line previews read poorly). The "God answered this" FOLLOW-THROUGH question was a NON-ISSUE, verified already fully built in B2: answered prayers move to the collapsible ANSWERED section, go muted with an "Answered {date}" stamp, and play the in-row gold "Praise God" crossfade plus the answered-count hero pop, so there was nothing to decide. The "Need prayer? Ask us" people-icon revisit was dropped (Justin is fine with the icon).
- 2026-06-05 (Bible card redesign LOCKED, open item (c); building next). Resolved the pending pick: it is "Continue reading" (resume), NOT quick-jump book chips (chips dropped as marginal clutter that duplicate the reader's own picker). DECISIONS:
  CONTINUE READING: the card resumes the user's EXACT last position. Requires NEW last-read tracking (today app/bible.tsx always opens Genesis 1, there is no tracking). New pj_bible_last_read key = { book, chapter, verse? }, written read-then-merge through storageSet so it rides the cloud backup. Resume to the exact chapter is the solid win; resume to the exact verse if the reader already supports a verse-ref jump (Halo's tappable verse links use one, confirm in bible.tsx before promising it).
  TWO CARD STATES, keyed on READ HISTORY (not tier): FIRST-TIME (no history) shows two co-equal buttons, "Where do I start?" (opens the starter guide) and "Open the Bible" (jumps straight into the reader); a blank jump-in with no history lands on JOHN 1 (the locked friendly first-time default, never Genesis 1 again). RETURNING (has history) shows "Continue reading: {Book} {Chapter}" as the hero that resumes the exact spot, with "Open the Bible" still available to browse; "Where do I start?" demotes to the toolkit.
  TIER: identical for Rooted and Exploring (NRN has no faith tab). NOT forked by tier, because Exploring is a posture not a knowledge level (our own faith spec): many Exploring users know Scripture well and many Rooted users are brand new, so beginner-guidance keyed off tier would guess wrong. The two-door design serves beginner and experienced without presuming either.
  WHERE-DO-I-START GUIDE: a compact CENTERED FADE modal (matches the prayer modals, NOT a slide-up, Justin dislikes slide-ups), listing curated starter readings each with a short warm "why," each tapping straight into the reader. v1 list (locked): John (start here, who Jesus is), Mark (fast, action-driven life of Jesus), Psalms / Psalm 23 (honest prayers, comfort), Proverbs (practical daily wisdom, 31 chapters), Acts (the early church and the Spirit). STATIC curated content, NOT the Plans engine (Plans = Piece B, SPEC_faith_ai, deferred to the AI/content thread); this graduates into Plans when that ships.
  VISUAL (already agreed): gold book icon, DROP the "King James Version" line, warmer not-black title.
  TOOLKIT/TUTORIAL: the fuller "why John, how to read" teaching lives in the Bible card toolkit (tooltipRegistry + tutorials), added when the card toolkit is built; keep tooltipRegistry + tutorials in sync with this behavior.
  1d (card depth/borders) DEFERRED: on device the shadows read fine on light themes (Justin confirmed via screenshot); the only real gap is that the Bible and Prayer cards do not carry the faith gold identity that Today's Message does, but that cohesion pass is HELD until B3 adds the Gratitude + Journal cards so all 5 are judged together. No depth work now.
- 2026-06-05 (Bible card BUILT, then SCOPE RESET to Option 2; this is where a fresh thread picks up). What got built this thread and is SHIPPED + working (type-clean, not broken, LEAVE IT AS-IS):
  CODE: app/bible.tsx gained last-read tracking, a new pj_bible_last_read key = { book, chapter } written through storageSet (rides the cloud backup, touches no other key), with a skip-first-commit guard so a bare Genesis-1 open (the default) never clobbers a real saved spot; only genuine navigation or a targeted open records. Also added a clean openBook / openChapter route param (mirrors the existing planNavBook path, reuses navigateToPlanPassage) so the card can open the reader at a book+chapter. The Genesis-1 default and every other /bible caller are UNCHANGED (additive only). app/(tabs)/faith.tsx BibleCard rebuilt into two states keyed on pj_bible_last_read (READ HISTORY, not tier): FIRST-TIME (no history) = two side-by-side amber-outline buttons "Where do I start?" + "Open the Bible" (a blank jump-in lands John 1); RETURNING (has history) = a primary "Continue reading: {Book} {Chapter}" button (John 1 in Lora amber, inside the button) + a "Find something to read" secondary button. components/BibleStartGuide.tsx = the curated "Where do I start?" centered fade modal (John, Mark, Psalms/Psalm 23, Proverbs, Acts, each with a one-line why; tapping opens the reader at that pick via openBook/openChapter). A shared PressButton helper gives every button the 0.97 press-scale. Verse-level resume was DEFERRED: resume is chapter-level (lands at chapter top); the reader does support a verse jump but we kept it simple.
  AS-BUILT deviations from the line-364 "LOCKED" entry above: the returning state uses "Find something to read" (opens the guide), NOT a returning "Open the Bible"; the guide entry for returning users was renamed off "Where do I start?" (that label is first-time only, Justin's call); the guide modal subtitle was neutralized so it reads for returning users too. The toolkit/tutorial home for the guide is still future work.
  THE STRUGGLE (logged so it is NOT re-walked): a LOT of iteration went into making the RETURNING card not feel bare/amateurish (font clash, fixed with Lora; a cool-indigo-on-warm-amber color clash; "John 1" floating; full-width vs side-by-side buttons; a bookmark tile that doubled the book icon). The real root cause, realized at the end: we were polishing the TOP STRIP of a card whose MAIN BODY does not exist yet. The card felt empty because its main content (the two plan sections) is missing, NOT because the styling was wrong.
  THE DECISION (Justin, Option 2): STOP polishing this card in isolation. The full "Bible and Plans" card (its true final form, matching Justin's sketch) = the Continue/Find strip on TOP, then TWO sections below it: ACTIVE Reading Plans and ACTIVE Devotionals (each a list with an empty state when none), with buttons routing out to the start/browse screens. That whole card gets built and finalized TOGETHER as one complete piece when the plans + devotional SYSTEM and CONTENT exist (Bucket C; the engine + screens + content live in SPEC_faith_ai Piece B, where content is the long pole). The current shipped card is a deliberate INTERIM compact Bible launcher: it works, it is not broken, so LEAVE IT ALONE until then. Its formatting (the full-width buttons Justin questioned, spacing, etc.) is intentionally NOT finalized and will be reworked once the two sections are present, because the layout is far easier to nail with the real body below it.
  NEXT STEPS for the fresh thread: do NOT touch the Bible card. Build Bucket C: the reading-plan + devotional system (enroll, progress), the screens they route to (a plans hub / browse + the devotional screen with the inline Halo reflection), and the launch plan/devotional CONTENT (the long pole: AI-assisted draft + theological review + verse verification, SPEC_faith_ai B.5). The Bible reader already has a bare-bones reading-plans browser (READING_PLANS / pj_reading_plans / openPlanBrowser in bible.tsx) to grow from. Reading plans and devotionals are DISTINCT (SPEC_faith_ai B.2: plans = pure reading schedule, no interactivity; devotionals = shorter, jump-around, interactive with the inline AI). Once that exists, finalize the whole Bible and Plans card in one pass.
- 2026-06-05 (B3 started: the Journal "card" became a header ICON; device-confirmed). DECISION (Justin): do NOT give the Journal its own faith-tab card. It is the quiet archive (verse reflections, study, personal, gratitude entries), sparsely visited, and reflections are already CREATED through other surfaces (VOTD-to-Halo, devotionals, the gratitude card), so a fat preview card overstates it. This SUPERSEDES "Card 5: Journal" above (no dedicated card). Instead the faith tab header gets a JOURNAL DOOR: a small icon matching the stats header journal button (blue rounded button, filled `journal` Ionicon, into /journal). The journal screen is not orphaned by this or by the home migration: it already has doors from the stats header, the home Today's Message + Today's Thoughts cards, and the bible screen. This also resolves the B1-deferred "faith VOTD journal shortcut icon" question (the door lives in the header, not on the VOTD card). SHIPPED + device-confirmed (type-clean, additive, no pj_ data, pure JS): the header button on app/(tabs)/faith.tsx, plus an app-wide glyph unify swapping the home Today's Message and Today's Thoughts card top-right icons from `book` to the `journal` glyph to match stats. The card-migration summary is now: Gratitude migrates (as a card), Journal becomes a header-icon door (not a migrated card). NEXT in B3: Gratitude card on the faith tab (faith visual family from the de-orange pass, Stack-screen quick-add not a tab modal), home migration (default-only, Justin's saved home untouched), retire the journal prayer category (safe retire, no data deletion).
- 2026-06-05 (B3b: Gratitude card on the faith tab; device-confirmed, Path A inline). Reused the shipped GratitudeStreakCard via a new optional `variant` prop ('home' default unchanged, 'faith' = warm gold skin: gold edges, amber hero/flame/dots/watermark, a warm off-white entry box with a 3px amber left bar, warm-amber buttons, journal glyph). One data path kept (writes pj_streaks + journal via storageSet), so the home card is untouched. Wired into faith.tsx (BUILT_CARDS, renderCard variant="faith", a styleMode read so Mindful still shows total-days + no savers, a ScrollView ref for input scroll-into-view). The faith-tab keyboard bug bit the inline input (double-tap to fire a button while the keyboard is up), CONFIRMING it is the faith-tab context, not modal-specific; Justin chose to LEAVE the inline card as-is (minor) rather than convert to a preview + Stack screen. Added Light haptics to the Edit + View-in-Journal buttons (shared, so home gets them too). NEXT: home migration (default-only, saved home untouched) + retire the journal prayer category.
- 2026-06-05 (B3c + B3d: home migration + prayer-category retirement; built, pending device check). B3c: gratitude_streak defaultVisible flipped to false in the home registry (index.tsx), so new users do not get Gratitude on home by default but it stays re-addable via home Edit Layout; the mode default-orders are fresh-install only, so existing saved homes (including Justin's) are untouched. B3d: 'prayer' removed from the journal create pickers (edit picker + new-entry sheet) and the filter pills via a shared RETIRED_CATEGORIES guard, while CATEGORY_META keeps 'prayer' so existing entries still render and nothing is deleted; the Prayer tracker (pj_prayers) is now prayer's one home (this fulfills the "JOURNAL PRAYER CATEGORY RETIREMENT" locked item under Card 4 above). Flagged, not blocking: the journal's prayer faith-achievement hook is now dormant (a future item could move it to pj_prayers); editing a legacy prayer entry shows no active category pill but keeps its category if untouched. Also added the two missing gratitude-card haptics (Cancel + journal icon). B3 is functionally complete. Also still pending from before: the rest of Bucket B (B3 Gratitude + Journal + home-card migration + retire the journal "prayer" category; B4 faith edit layout; B5 Halo FAB nudge; B6 first-time experience), and the small prayer polish items (e) FAB press-scale and (f) action-modal date line.
