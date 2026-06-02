# Faith AI + Devotional Plans: Living Spec

First checkpoint: 2026-06-02 (initial scoping with Justin)

Status: SCOPING. No code written. This is the living source of truth for a new faith track: a scripture-grounded AI companion plus a devotional / reading-plan library. Equally important to the Smart Coach, separate feature. No double dashes anywhere (project rule). No "Session NN" tags.

---

## What this is
The play to make faith POP. Today the app's faith layer is thin: Bible reader, verse of the day, gratitude (which is not even faith-exclusive). This adds two connected pieces:

1. FAITH AI COMPANION. A conversational, scripture-grounded assistant. The user asks real-life questions ("good verses for the stress of a new job", "what does the Bible say about rest") and gets a grounded, cited, pastoral answer. Inspired by the Bible Chat app's AI section, but with a moat Project J alone has (see below).
2. DEVOTIONAL PLANS. A library of topical reading plans of varying length (1, 5, 7, 14, 30 days), pick by subject, YouVersion-style. A devotional is a reading plan with reflections and optional questions attached. The AI lives inside the devotional screen as the reflection companion.

The two are one system: the devotional is the structure, the AI is the conversation.

---

## Why
Faith is the app's identity but currently does not carry weight. A scripture-grounded AI plus a real plans library is the differentiator that makes the faith experience feel alive instead of present-but-quiet. This is the Chick-fil-A organic realization moment: a faith companion that knows your body and speaks to your spirit.

---

## Relationship to the Smart Coach
Separate track, shared DNA. The Smart Coach (SMART_COACH_SPEC.md) is bounded, cached, one tip a day, brain-decides-then-AI-phrases. The Faith AI is open-ended conversation. Different beast, own spec. They share the pattern: AI phrases, deterministic code verifies. They optionally share data context (see context-awareness below). Do not blur them.

---

## Monetization: compute-gated, not faith-gated (the carve-out)
The hard rule is faith is never paywalled (feedback-monetization memory, SPEC_smart_tips 3.4). This feature keeps that rule intact via a precise distinction:
- FAITH CONTENT and ACCESS stay free forever: Bible, verse of the day, gratitude, devotionals, reading plans, AND a real, usable daily allowance of the AI.
- What Pro buys is unlimited AI COMPUTE, not access to God's word. The premium thing is generative GPU horsepower, not Scripture.
- Free AI = a GENEROUS DAILY allowance (starting value 5 per day, tunable after TestFlight). Never a lifetime cap. "5 ever" would be a paywall on faith; "5 a day" is fair-use on a compute resource. The distinction is the whole point.
- Pro = unlimited or a much higher ceiling.

This nuance is documented in the feedback-monetization memory so future work reads it as intentional, not a violation of the faith rule.

---

## Architecture
- AI is the VOICE: phrases pastoral, scripture-grounded answers in the user's faith tier and tone.
- Deterministic code VERIFIES: every verse the AI cites is checked against the app's own Bible text before display. No invented, misquoted, or hallucinated Scripture, ever. Same DNA as the Smart Coach cleanup pass (there it verifies numbers, here it verifies Scripture). This is both a safety net and a selling point.
- Runs per message (open-ended), governed by the daily allowance and prompt caching to control cost. Cost is NOT the blocker; a grounded Q&A on a small model with caching is a fraction of a cent. The daily cap handles abuse.

---

## Piece A: Faith AI Companion

### A.1 Chat v1 (focused Q&A)
The proven, loved use case: ask a life question, get a grounded, cited, pastoral answer. Ship this first and clean. Verse references are tappable (open in the reader). Copy / share. Thumbs up/down (doubles as the content-report mechanism, see Safety).

### A.2 Where it lives
- Standalone companion: open chat, ask anything (faith-scoped).
- Inline on the devotional screen: the reflection companion, seeded with today's passage (see Piece B). Same AI engine, second door, both draw on the same daily allowance.
- GLOBAL FAB (strong direction, scope fork open): a persistent companion summonable from anywhere in the app. UX: NOT a bottom sheet (Justin dislikes slide-ups). A slide-in from the right, or a FAB that expands open and closed into an inline panel. OPEN FORK: faith-scoped companion vs general app assistant. "Ask anything anywhere" quietly turns a faith companion into a general assistant, which is a bigger product with a different safety and Apple/liability profile. v1 recommendation: the global FAB summons the FAITH companion. General-assistant scope is a separate later decision. Cost is fine either way because the daily allowance governs it.

### A.3 Context-awareness (opt-in v2, the moat, used sparingly)
The thing a standalone Bible app structurally cannot do: the AI knows the user's whole life and can ground its answer in their actual season. Generic: stock verses on discouragement. Grounded: knows they fell off and came back, speaks to grace and the return.

HARD RULE: the AI never sees a raw metric. The deterministic brain does a translation step and emits only a LIFE-SEASON THEME from a small curated whitelist, and only when the bridge is genuinely real. Protein being down two weeks never crosses the boundary because there is no scripture about protein and the metric is spiritually meaningless. If no whitelist theme genuinely fits, the AI gets NO context and answers as a pure Bible companion. Silent and conservative by default.

Curated theme whitelist (each with a vetted scriptural analog; grow carefully):
- Grinding hard, poor recovery to striving and rest (Matthew 11:28).
- Fell off then returned to grace and restoration (Lamentations 3:22, the prodigal).
- Care-tone safety signal (under-eating) to the body as a gift worth stewarding (1 Cor 6:19, Psalm 139).
- Effort with no payoff, discouraged to perseverance, do not grow weary (Galatians 6:9).

The three go-wrong cases are hard design constraints:
1. Creepy: a spiritual conversation that feels like it is surveilling the user's data.
2. Spiritualizing metrics: prosperity-gospel "log better, get blessed"; implying God cares about macros.
3. Preachy by repetition: referencing the user's data in every reply.

Recommendation: do NOT bake context-awareness into core chat for v1. Ship focused Q&A first. Context-awareness is a deliberate, tasteful, opt-in v2, and may live better as a separate gentle touch than baked into every chat reply. The moat is a scalpel, not a default.

---

## Piece B: Devotional Plans

### B.1 The model
A library of TOPICAL plans, pick by subject, varying length (1, 5, 7, 14, 30 days). Not a single 365-day daily devotional. To launch we need a handful of short focused plans (roughly 50 to 80 entries total), not a year of content. Supports both multi-day plans and one-off single-day devotionals (a plan of length 1).

### B.2 Reading plan vs devotional
- Reading plan = the skeleton: which passages, what order, over how many days.
- Devotional = skeleton plus flesh: passage + a short reflection + an application or prayer.
- A devotional plan is a reading plan with reflections attached. They are ONE system, one "Plans" hub, not two features. Some plans are reading-only, some are devotional.

### B.3 Questions and the inline AI
- Optional reflection questions, each with a text box. NEVER required, never graded, never a quiz. Required answer fields are the production burden that kills engagement (the reason morning intention was rejected: it asks the user to produce, not consume; consuming is a far lower bar).
- What the user types SAVES (read-then-merge, never wiped).
- Right there, an inline AI affordance ("reflect with this") opens the companion seeded with the passage and question, WITHOUT leaving the screen. That conversation also SAVES, attached to that devotional day, becoming part of the user's spiritual record like a journal entry.
- UX: no bottom sheet. Slide-in from right or FAB-expand (build-time call).

### B.4 Home card
A "continue your plan" card that shows the active plan and resumes it ("Day 3 of 7"). Proven retention hook.

### B.5 Content sourcing
- Write our own as the BACKBONE (AI-assisted drafting plus theological review plus verse verification). The short-plan model makes this feasible from the start, which is why the lean is own-content-first rather than leaning on old public-domain books.
- Legal boundary on "templates": reusing the READING PROGRAM itself (which passages, in what order, for a topic) is fine; passage selections and topics are not protected like creative prose. Changing the chapter choices makes it even more clearly ours. What we must NOT do is copy a creator's reflections, questions, or wording. Every word of reflection is ours (or genuinely public domain). Justin's intent confirmed: use popular plans as templates for structure only, change passages, write all our own content.
- Public-domain classics (Spurgeon's Morning and Evening, Daily Light on the Daily Path) are optional bonus content, not the backbone. Caveat: they are archaic 1800s English. Verify PD status of any specific title before relying on it (do not state copyright status as fact without checking).
- Theme some plans around the whole-person wellness life (the moat): Strength and Discipline, Rest and Recovery, Running the Race, Stewarding Your Body, Identity and Worth. No standalone Bible app can do these honestly.

### B.6 Translation (open fork, real code impact)
KJV is current and not ideal to Justin (not hated, just dated). A free MODERN translation would make devotionals feel current and improve the whole app. Strongest free candidate: BSB (Berean Standard Bible), modern, readable, free, available in clean data formats. WEB (World English Bible) was tried before and broke (Justin recalls a formatting issue); diagnose what went wrong before retrying. Note the existing file is named data/bible-web.ts but per CLAUDE.md contains KJV, worth a look. This is its own decision: verse verification reads the same text, so switching touches that too. Logged as a strong adjacent want, not a blocker.

---

## SAFETY SPEC (build priority number one)
Safety and crisis handling is the FIRST thing to build, before the nice parts. The "ways it can go wrong" list is not a notepad; each item becomes a system-prompt rule, a deterministic cleanup check, brain conservatism, or crisis-routing logic. For an AI giving spiritual content in a shipped Christian app, these are non-negotiable.

Safety-critical (can actually hurt someone), build-gating:
- CRISIS / OUT-OF-LANE ROUTING. Self-harm, abuse, "I am in danger", acute medical. Detect crisis, respond with compassion, point to real human help and crisis resources. Never answer a crisis with a tidy verse and a copy button. Never play therapist, doctor, lawyer, or pastor for serious situations. The single most important guardrail.
- NEVER SPEAK AS GOD. The AI is a tool that shares Scripture. It never says "God is telling you" or positions itself as a prophetic or divine voice. It points to the Word, never impersonates the Author. It knows its place and knows it well.
- DOCTRINAL ORTHODOXY. Can confidently state heresy (works-salvation, prosperity gospel, universalism). Must stay on historic, orthodox common ground.

Brand and tone:
- DENOMINATIONAL NEUTRALITY (core foundation). No sides on in-house debates (Calvinist vs Arminian, Catholic vs Protestant, baptism, end times). On divisive questions, acknowledge the range rather than pick a team.
- NEVER SHAME. Grace-first, always. Never guilt-trips. Same no-fear-no-shame ethos as the whole app.
- NO POLITICS. Faith plus partisan politics is a minefield. Stay out.

Trust:
- NO FABRICATION, EVER. No invented Scripture, no made-up scholarship ("the Greek really means"), no hallucinated facts. HONESTY OVER CONFIDENCE: when it does not know or is struggling, it says so plainly instead of inventing an answer. (Justin emphasized this hard.)
- POINT TO REAL COMMUNITY. Encourage church, pastors, real prayer, actual reading; never position the AI as a replacement for them.

Apple / compliance (disclaimers necessary but NOT sufficient; behavior is what passes review):
- In-app disclaimers: AI tool, can make mistakes, not a substitute for professional / medical / pastoral / crisis help, not the voice of God.
- Functional crisis behavior (above) is the real protection.
- User REPORT mechanism for bad responses (the thumbs down doubles as this).
- CONTENT FILTERING so it cannot be steered into producing garbage.
- Terms of use + privacy.html updates (extends the Smart Coach AI privacy note already on the roadmap).

---

## PRIVACY AND SECURITY
- Save locally by default (cheap, consistent with the existing journal). Text is featherweight; the expensive storage problem is photos, not text.
- Include reflections and AI threads in the cloud backup the same way journal entries are, so a reinstall does not wipe the user's spiritual record. Read-then-merge, never wholesale overwrite (data-integrity rule).
- DISCLOSE the AI-provider handoff plainly: messages are sent to the AI provider to generate a response; it is the user's private record; we do not sell it or train on it.
- Technical measures beyond disclosure:
  - VERIFY Firestore security rules lock each user to only their own documents (users/{uid}/store/{key}). Most important measure; applies app-wide, stakes higher for sensitive faith data. NOT yet verified in code.
  - Firebase handles encryption at rest and TLS in transit; no action needed.
  - Conversation content NEVER goes to analytics or crash logs.
  - Confirm the AI provider's no-train policy in writing before launch.
  - Data minimization: send the AI only what it needs.
  - Local AsyncStorage is unencrypted (so is the current journal); secure-store is an option only if we want belt-and-suspenders beyond current app standard.

---

## OPEN FORKS (status as of 2026-06-02 second pass)
- Translation: evaluate BSB, re-diagnose WEB, or stay KJV. PINNED: deferred until after the profile-to-header + Faith tab structure ships; revisit in the AI build thread. Own decision, real code impact.
- Daily-allowance unit: LEANING 5 MESSAGES per day (not full conversations-with-follow-ups, and not the "5 questions" framing). Not locked; open to a better unit. Tune after TestFlight.
- Whether context-awareness touches the chat at all, or only a separate gentle surface. STILL OPEN, and a v2-only concern. Framing confirmed this pass: v1 has NO data access (pure scripture companion); v2 is the data-derived life-season-theme context-awareness. This fork only matters once v2 is on the table.
- Companion scope: LOCKED v1 = faith-only (to get it off the ground). App-wide general assistant is a possible future evolution, acknowledged as a much bigger project with real liabilities; decided later, not v1. The global FAB is DROPPED; the Faith tab is the always-available entry.
- Exact storage shape: extend pj_bible_reflections vs a new pj_plans_progress key. DEFERRED: Claude brings a recommendation when plans/reflection storage is actually built (Justin trusts the storage call). Does not block the profile/faith structure.
- Final launch plan lineup and category names (starter slate below). STILL OPEN: Justin willing to go through the list; do it in the AI/content thread.
- Inline / companion AI UX: LEANING (2026-06-02) toward a FAITH-SCOPED FAB that unifies the standalone companion and the inline reflection into ONE surface. A single companion button always present across the Faith tab and faith features (this is NOT the app-wide global FAB, which was dropped for scope/liability because it floated over the whole app; this one lives only inside the faith section, so no conflict with that decision). It opens as an instant chat overlay (never a bottom sheet), preserves your place so you never lose progress on what you were doing, and closes just as fast. Smart bonus that resolves Justin's earlier doubt about a per-devotional inline affordance, refined 2026-06-02: the FAB is context-aware but does NOT auto-inject the passage. When opened inside a devotional or feature it OFFERS the context instead of assuming it: either a soft opener from the AI ("Want to dig into this devotional, or is this about something else?") or a small tappable hotlink/chip the user activates to attach the current passage/feature, and the user can always just type and reference it themselves. Keeps the user in control, avoids presuming, and matches the "scalpel not default" context philosophy. When the passage is attached and the chat happens inside a devotional it saves to that day; opened from the hub it is a general faith chat. AI-thread flavor call: a soft AI opener every open could get repetitive with heavy use, so a quiet dismissible context chip is the alternative; pick the exact mechanic then. So both behaviors come from one FAB and no separate per-screen inline thing needs building for v1. The AI thread finalizes exact mechanics: truly-persistent vs contextual presence, save behavior general vs in-devotional, and the open/close animation. NOTE: the A.2 "Where it lives" narrative above still describes a separate inline affordance plus a global FAB and is now behind this leaning; the AI thread should reconcile it.

## Starter category slate (DRAFT, pinned for a later discussion)
Wellness-tied (the moat): Strength and Discipline, Rest and Recovery, Running the Race, Stewarding Your Body, Identity and Worth.
Classic life topics: Anxiety and Peace, Gratitude, New Beginnings, Grief and Comfort, Trusting God in Uncertainty.
Plus a "Need a word right now" one-off bucket. Lengths vary (1, 5, 7, 14, 30).

## Build order (proposed)
1. Safety and crisis handling first (routing, never-as-God, filtering, disclaimers, report mechanism).
2. Faith AI chat v1 (focused Q&A) with verse verification.
3. Plans hub + devotional screen + inline AI + home card.
4. Content: write the launch plan library.
5. Context-awareness (opt-in v2) and the global FAB, after v1 is solid.
6. Translation decision (parallel, independent).

---

## Checkpoint log
- 2026-06-02: Initial scoping with Justin (pivoted from "faith-flavored Smart Coach tips" to this dedicated faith track). Locked: compute-gated not faith-gated with a generous daily free allowance (start 5/day) and a documented monetization carve-out; verse verification against the app's Bible; chat v1 focused Q&A with context-awareness as an opt-in v2 (curated theme whitelist, never raw metrics, silent default, three go-wrong constraints); one Plans hub for reading plans + devotionals, multi-day and one-off, optional never-required question text boxes, inline AI that saves to the day, home card resume; write-our-own short topical plans as the content backbone with legal template-reuse limited to passage selection; full safety spec as build priority one (crisis routing and never-speak-as-God non-negotiable); privacy stance (save local + cloud backup like journal, disclose AI handoff, verify Firestore rules, no telemetry of chat content). Open forks captured above. Categories pinned for a later pass. Next: discuss categories and the remaining open notes after this capture is committed.
- 2026-06-02 (faith surfacing + per-tier pass): more decisions locked.
  SMART COACH STAYS SECULAR: faith lives in THIS track, not in the deterministic coach. The coach's rest-on-over-training (Family 10.3) and grace-on-comeback (6.3) detections become CANDIDATE signals for this feature's opt-in v2 context-awareness, not coach tips. (SMART_COACH_SPEC.md faith item resolved to match.)
  SURFACING = A FAITH TAB (Solution A). The tab bar stays 5 slots: Home keeps its centered glowing hero; PROFILE moves OUT of the bar to a header avatar (Strava-style, top-left beside the greeting, dropping the "PROJECT J" label), opening the existing Profile screen (Settings still reached from inside Profile). Faith takes the freed right-end slot with a glowing DOVE icon (chosen over a flame, which would collide with calories/streaks; it must glow and be non-static, never a static plus sign). The earlier GLOBAL FAB idea is DROPPED: a permanent tab is the always-available entry, so the FAB is redundant. Profile-to-header is its OWN app-wide navigation change (verify every path to Profile and Settings still works; header icons stay filled per the project standard). PROFILE PIC: a custom uploaded avatar depends on the Firebase Storage photo migration (the same roadmap item that blocks food and Body Progress photos), so launch the avatar with an icon or initials fallback and enable custom upload when that lands.
  FAITH HUB MUST FEEL LIKE A PLACE, not a report page the user gets pushed to. Build gates: (1) an arrival animation (cards stagger in, dove glows on, verse settles); (2) its own atmosphere LAYERED OVER the user's theme tokens (glow, pulse, particles), never replacing the theme (theme stays the core, all 6 themes and accents respected); (3) liveness, nothing static; (4) personalization (time-of-day greeting, active plan as the hero); (5) hero-not-list layout. It is a focused sub-home reached FROM Home (the faith card) and the dove tab, NOT a peer competing with the centered Home.
  HOME FAITH CARD = a LAUNCHER: combine the existing "today's message" / VOTD card with plan-resume and ask-companion. It never shows full devotional text (those are multi-verse or chapter length); it links into the devotional screen. Tier-aware: hidden for NRN, gentle for Exploring, full for Rooted.
  INLINE AI on the devotional screen: NO bottom sheet (Justin dislikes slide-ups). Slide-from-right or a FAB-expand panel that keeps the passage in view. Typed answers AND the AI conversation both SAVE, attached to that devotional day, like journal entries.
  PLANS = ONE unified hub (reading plans and devotionals are the same object: a devotional is a plan with reflections). Multi-day plans AND one-off single-day devotionals. Solid empty states with curated featured plan suggestions; data-personalized suggestions are v2 (same brain dependency as context-awareness). Optional reflection questions with text boxes, NEVER required.
  PER-TIER FAITH AI BEHAVIOR LOCKED: NRN = no faith AI at all (no tab, no card, nothing). Exploring = GETS the faith AI companion (Justin: 100 percent), gentle framing. Rooted = full.
  V1 vs V2: v1 = the standalone, safe, scripture-grounded faith AI plus the devotional plans, with NO data-awareness. v2 = context-awareness (rest/grace themes from the curated whitelist, plus data-personalized plan suggestions), gated on the Smart Coach brain existing; architect v1's AI handoff context-ready (empty seam) so v2 slots in. Content authoring (the launch plan library) is the real long pole, start it early.
  STILL OPEN: translation (BSB / re-diagnose WEB / stay KJV), daily-allowance unit (questions vs conversations), companion scope (faith-only v1 vs general assistant later), storage shape (extend pj_bible_reflections vs new pj_plans_progress), final launch category lineup, inline-AI exact UX (slide vs FAB).
- 2026-06-02 (forks status + thread split): decided to BUILD the faith STRUCTURE in the current thread (Step 1: Profile moves to a top-left home-header avatar with initials/icon fallback, custom photo upload still gated on the Firebase Storage migration; Step 2: Faith tab + glowing dove in the freed bar slot pointing at a Hub scaffold) and push ALL the AI/content forks and the AI build itself to a fresh thread with clean context. Sequencing call: keep the Profile tab in the bar through Step 1 (avatar added alongside it, two doors temporarily) so the bar never drops to a broken 4-tab state; Step 2 swaps the Profile slot for Faith, leaving the avatar as the sole Profile door. Verified in code this pass: the only door to the Profile screen today is the tab button (no scattered router pushes to profile anywhere), and Settings is reached only from inside Profile (profile.tsx:326), so the profile-to-header move has almost nothing scattered to re-wire. Ionicons has NO dove, so the dove tab icon will need a custom SVG (react-native-svg is already in the stack). Fork movements this pass: translation PINNED until after the structure ships; daily-allowance leaning 5 MESSAGES per day (not conversations, not "questions"); companion scope LOCKED faith-only for v1 with app-wide as a possible-later, bigger-liability evolution; storage shape deferred to Claude's recommendation at build time; categories to be worked in the AI/content thread; inline-AI UX still open and needs a design pass (Justin cannot yet picture it). Clarified v1 vs v2 (Justin had them flipped): v1 = NO data access (pure scripture-grounded companion, the simpler safer thing we ship first), v2 = the life-season-theme context-awareness (the moat), gated on the Smart Coach brain. None of the open forks block the profile/faith structure.
