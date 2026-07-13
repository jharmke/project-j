# SPEC: Restaurant Mode ("what should I order")

Status: **RESEARCHED, NOT STARTED.** 2026-07-13. Raised by Justin after hearing fitness accounts praise MenuFit.
This doc exists so the research is never redone. It is NOT approved for build.

---

## THE IDEA IN ONE LINE

> "You have 780 calories and 45g of protein left today. Here's what to order at Chipotle."

The app already knows what you ATE. This makes it answer what you should ORDER. That is a different feature
from logging, and it is the moment a person is actually stuck: standing in line, phone out, guessing.

---

## COMPETITOR TEARDOWN: MenuFit (done properly, 2026-07-13)

**What it is:** a DECIDER, not a logger. 1.5M users. $9.99/mo or $19.99/yr. You set goals; it ranks menu items
at the restaurant you're in, composes full orders, and explains the pick in one line.

**Its genuinely good part** (device-verified, Justin's screenshots): at a CHAIN it composes an order and scores
it, e.g.
- "Double Quarter Pounder with Cheese -> Apple Slices -> Diet Coke" -- 96/100 "Excellent", 755 kcal, 48P/47C/42F,
  with a one-line insight: "the highest single-item protein count on the menu fits your target when paired with fruit"
- "Double McDouble (Bunless) -> Apple Slices -> Water" -- 555 kcal, 44P/12C/40F, "engineering a quad-patty stack
  without buns delivers massive protein density"
That is a genuinely clever, useful product. It is the piece worth learning from.

**Where the moat ISN'T:**
- **Local restaurants are HOLLOW.** Justin looked up BurgerUp (Franklin TN). MenuFit had the menu -- and **every
  single item showed `0 cal`**. Scraped menu text with no nutrition at all: stray footnote asterisks
  ("quinoa fritters**"), inconsistent casing, the restaurant's own misspelling ("Siracha"), and it served the
  12 South (Nashville) menu, not the Franklin location. Their advertised "Restaurant Data Confidence Meter"
  exists precisely to paper over this.
- **It works at chains because chains PUBLISH nutrition data.** No AI guessing, no proprietary database. They're
  organizing free public data. The people raving about it are eating at chains.

**The gap in their product we could own:** their own users ask for MyFitnessPal integration to auto-save macros.
MenuFit decides, then you go log it somewhere else. **Project J is the log.** And critically: MenuFit only knows
your GOALS. We know the user's REMAINING macros for the day. That is a strictly better question to answer, and
only a food-logging app can answer it.

---

## DATA FEASIBILITY (checked 2026-07-13, do not re-research)

**FatSecret chain nutrition is ACCURATE.** Verified against official published data:

| Item | FatSecret (in our app) | Official |
|---|---|---|
| Big Mac | 580 kcal, 25P/45C/34F | 590 kcal, 25P/46C/34F |
| McDouble | 390 kcal, 22P/32C/20F | 400 kcal, 22P/33C/20F |
| Chick-fil-A 12ct Grilled Nuggets | 200 kcal, 38P/2C/5F | 200 kcal, 38P/2C/5F (exact) |

Within ~10 kcal = a slightly older menu revision, not bad data. **The nutrition problem is already solved.**

**FatSecret API reality:**
- ✅ `food_brands.get` supports **`brand_type=restaurant`** -> we can pull a LIST OF RESTAURANTS directly. That
  gives us the restaurant picker for free.
- ❌ **There is NO endpoint to enumerate all foods for a brand.** You cannot ask for "everything at Chick-fil-A."
- ⚠️ **WORKAROUND:** `foods.search` is paginated. Search the brand name, pull N pages, keep only results whose
  brand matches exactly. Confirmed to work in practice (searching "Chick-fil-A grilled nuggets" returns a clean
  run of real CFA items). **Completeness is NOT guaranteed** -- we'd be showing "the items we know about", not a
  certified full menu. (Note: MenuFit is doing the same thing; they just don't say so.)

---

## PROPOSED V1 (not approved -- design pass needed first)

1. **Pick a restaurant** (from FatSecret's restaurant brand list; optionally sort by nearby via location later).
2. **Fetch its items** (paginated brand search + exact-brand filter, cached locally per restaurant).
3. **Score every item + composed combo against the user's REMAINING macros for today** -- not their goals. This
   is the whole differentiator.
4. **Compose 3-5 orders**, not single items (main + side + drink), like MenuFit does.
5. **One-line insight per suggestion**, AI-voiced (we already have this machinery in utils/coachAI).
6. **One tap to LOG it** -- the loop MenuFit structurally cannot close.

---

## OPEN QUESTIONS / RISKS

- **Menu completeness.** We can't promise a full menu. Do we say so? (Honest-numbers rule says yes -- but a
  "confidence meter" is exactly the fig leaf MenuFit hides behind. Prefer plain wording: "items we have for
  this restaurant".)
- **Local restaurants.** We'd have nothing for BurgerUp -- BUT our AI meal estimator ALREADY beats MenuFit there
  (photograph the burger, get a real estimate, vs their `0 cal`). Restaurant Mode should hand off to the
  estimator when a place isn't covered, rather than showing an empty shell.
- **Scope.** This is a real feature: restaurant picker, item fetch + cache, scoring engine, combo composition,
  AI copy, logging integration. NOT a weekend build.
- **Mindful mode.** A screen that scores and ranks food by "best for your macros" is judgment-heavy. Needs a
  deliberate Mindful behavior defined BEFORE build (per the standing rule).
- **Is this even our problem to solve?** Justin's honest words: "I'm not sure what I'm looking for, truthfully.
  I just heard people say MenuFit is great." Do NOT build this from FOMO. Build it if eating-out logging is a
  real, repeated pain for real users -- which is a question worth actually asking them.

---

## RELATED

- The **coffee-shop drink builder** (Starbucks/Dunkin, calories per pump of syrup) is the SAME family of problem:
  eating out, no scale, no barcode. Consider whether one feature covers both before building either.
- The **AI meal estimator** (services/aiMealEstimator) already covers the "what did I eat" half at ANY restaurant,
  including ones no database has. That is a real asset and it is already shipped.
