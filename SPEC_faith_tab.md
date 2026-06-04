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
