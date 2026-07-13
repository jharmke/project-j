# SPEC: Coffee Drink Builder (Starbucks / Dunkin)

Status: **DESIGNED, NOT BUILT.** 2026-07-13. Raised by Justin (a real, repeated personal pain: he hand-built
custom coffee entries in Cronometer for years). **DATA AUDIT IS THE GATING ITEM** -- see Phase 1. The build is
trivial once the numbers are right, and worthless if they aren't.

---

## THE PROBLEM

You cannot log a real coffee order. Every app has ONE fixed entry for "Grande Latte", and nobody drinks that.
People order "grande oat latte, 2 pumps sugar-free vanilla, extra shot" -- and then either guess, or hand-build
the entry from parts, or give up and log something close-ish.

## WHY THIS FITS PROJECT J (and why it's better than a restaurant database)

**It's arithmetic, not guesswork.** Every component has a published, stable number: a pump of syrup, an ounce of
oat milk, a shot of espresso. Sum them and you get an HONEST number -- computed from first principles, offline,
no API, no scraping, no AI estimate. That satisfies the honest-numbers rule *by construction*, which the
restaurant-database idea (SPEC_restaurant_mode.md) never can.

It is also the rare feature where the app can be flatly BETTER than MyFitnessPal, not just different.

---

## THE MODEL

**Shop first, then everything downstream changes.** Each shop owns its own sizes, drinks, milks, syrups, and
extras. They are NOT interchangeable.

Flow (drink-first, because that's how people actually order):

1. **Shop** -- Starbucks | Dunkin
2. **Drink** -- latte, cappuccino, americano, flat white, cold brew, iced coffee, brewed coffee, macchiato...
3. **Size** -- Starbucks: Short/Tall/Grande/Venti (hot) + Venti/Trenta (cold). Dunkin: Small/Medium/Large.
4. **Milk** -- whole, 2%, nonfat, oat, almond, soy, half-and-half, none
5. **Syrup / sauce** -- pick one or more; pumps DEFAULT to the standard count for that size, and are editable
6. **Extras** -- extra shot, whipped cream, cold foam, drizzle, toppings

### ⚠️ THE DESIGN TRAP: milk volume depends on the DRINK, not the size

A grande LATTE is mostly milk (~12oz). A grande ICED COFFEE with a splash of milk is ~2oz. **Same cup, wildly
different numbers.** Asking only "what size, what milk" is wrong for half of all orders.

So each **drink + size** combo must carry:
- `milkOz` (how much milk that drink contains at that size)
- `shots` (default espresso shots at that size)
- `standardPumps` (the barista default for a flavored version at that size)

Everything else is addition on top of that base.

---

## WHAT WE SHOW (fields)

Calories, protein, carbs, fat -- plus, deliberately:
- **SUGAR.** For coffee, sugar IS the story. A sweetened drink's headline number is not calories, it's the sugar.
  The app already tracks extended nutrition; this is one of the few places the user actually cares about it.
- **CAFFEINE.** Capture it in the component table even if it isn't surfaced at first (an espresso shot is ~75mg).
  Caffeine tracking is already a backlog item; do NOT make someone re-enter all this data later just because we
  didn't record a column we already had in front of us.

Output = a normal food entry in the log (name reflects the build, e.g. "Grande Oat Latte, 2 pumps SF vanilla,
extra shot"), so it repeats/favorites/edits like any other food.

---

## PHASE 1 -- THE DATA AUDIT (**do this BEFORE any code**)

Justin's call, and it's the right one: **be fully aligned on both menus and every field before building.**
Enumerate, per shop:

**STARBUCKS**
- [ ] Sizes + fluid ounces (Short/Tall/Grande/Venti hot, Venti/Trenta cold)
- [ ] Drinks + their `milkOz` and `shots` PER SIZE (latte, cappuccino, flat white, americano, macchiato,
      cold brew, iced coffee, brewed coffee, refreshers?)
- [ ] Milks: whole / 2% / nonfat / oat / almond / soy / coconut / half-and-half -- calories + macros PER OUNCE
- [ ] **SYRUPS vs SAUCES -- these are DIFFERENT and it matters.** Syrups (vanilla, caramel, hazelnut...) are one
      value per pump; SAUCES (mocha, white mocha, pumpkin) are richer and carry fat. VERIFY BOTH SEPARATELY.
- [ ] Sugar-free syrups (should be ~0 cal -- VERIFY)
- [ ] Standard pump count per size (roughly 3/4/5/6 -- VERIFY)
- [ ] Extras: extra shot, whipped cream, cold foam (regular + sweet cream + flavored), drizzles, toppings,
      inclusions (cookie crumble etc.)

**DUNKIN**
- [ ] Sizes + fluid ounces (Small/Medium/Large; note iced/frozen differ)
- [ ] Drinks + `milkOz` and `shots` per size
- [ ] Milks + creams (Dunkin's "cream" is a different animal from milk -- VERIFY separately)
- [ ] ⚠️ **FLAVOR SHOTS vs FLAVOR SWIRLS. This is the single easiest thing to get wrong.** Flavor SHOTS are
      UNSWEETENED (near-zero calories). Flavor SWIRLS are SWEETENED (real sugar and calories). People confuse
      them constantly, and getting this backwards makes every Dunkin number wrong. VERIFY BOTH.
- [ ] Standard pump/swirl count per size
- [ ] Extras: espresso shot, whipped cream, toppings, sugar, sweeteners

**Rules for the audit:**
- Source from each chain's OWN published nutrition data. Do not guess, do not use a third-party blog.
- Record calories, protein, carbs, fat, **sugar**, and **caffeine** for every component.
- Note the date sourced. Chains change recipes; this table needs an occasional check.

---

## OPEN QUESTIONS

- **Generic fallback?** Someone's local coffee shop will never be in here. A generic "16oz coffee, oat milk,
  2 pumps vanilla" path would cover most of that -- worth it, or does it dilute the feature?
- **Where does it live?** A tool inside Add Food? Its own entry point? A "Drinks" tab in the food library?
- **Favorites.** A person orders the same drink every day. The output should be favoritable/repeatable in one
  tap -- which the existing food-entry machinery already gives us for free.
- **Maintenance.** The numbers drift when chains reformulate. Who checks, and how often? (Modest, not a treadmill.)
- **Mindful mode.** Probably no variant needed (it's a calculator, not a judgment), but confirm per the standing
  rule before build.

## NON-GOALS

- NOT a restaurant menu database (see SPEC_restaurant_mode.md -- different problem, much bigger, much softer data).
- NOT AI estimation. The whole point is that these numbers are DETERMINISTIC. If we're guessing, we've failed and
  the user should just use the AI meal estimator, which already exists.
