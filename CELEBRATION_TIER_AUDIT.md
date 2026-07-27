# Celebration Tier Audit

> Measured from `achievementData.ts`, not remembered. 97 achievements.
> Companion to `SPEC_celebrations.md`. This file is FACTS ONLY, no decisions.

---

## THE HEADLINE NUMBERS

What actually fires, using `getCelebTier()` (the function every trigger site calls):

| Celebration | Before re-tier | Now |
|---|---|---|
| small | 26 | 26 |
| medium | 24 | 22 |
| large | 37 | 35 |
| diamond | 10 | 14 |

**The original spec was wrong on two of these.** It said large: 46 and diamond: 1. Diamond was already
ten before any changes, because `getCelebTier()` promotes anything with `displayTier: 'diamond'`
regardless of its real tier.

Note how little the re-tier moved the celebration load: large only dropped by two. That is because
platinum and gold fire the SAME large celebration, so promoting an achievement into platinum changes
its badge but not its moment. Calming the app down requires a decision about the overlay, not the tiers.

## THERE IS A FIFTH TIER NOBODY MENTIONED: PLATINUM

**18 achievements carry `displayTier: 'platinum'`** (17 before the re-tier). They render as platinum on
the achievements page — a distinct visual identity the user can see and collect toward.

Platinum DOES have identity in the achievement toast: its own badge colour, border, glow and left edge
stripe, plus a rotating shimmer ring, stronger glow and a different card background that only platinum
and diamond get.

What platinum does NOT have is its own full-screen overlay. It fires a plain `large`. So the user sees
five tiers, gets five toast treatments, and only four overlay treatments.

## RE-TIER APPLIED 2026-07-27

- Water 365 (`Ol' Reliable`) and Steps 365 (`Full Circle`): platinum → diamond. Every other category's
  365 was already diamond; these two were the only exceptions and it was an oversight, not a decision.
- Lose 25 (`Undeniable`) and Gain 25 (`Bulk Season`): silver → gold.
- Lose 50 / 75 and Gain 50 / 75: gold → platinum.
- Lose 100 (`The Century Mark`) and Gain 100 (`The Gain Train`): platinum → diamond.
- Workout 100 (`Proven`): gold → platinum.

Renames, both of which were duplicate names colliding on screen:
- Lose 25: `Not a Fluke` → `Undeniable` (the streak achievement keeps `Not a Fluke`)
- Workout 100: `Triple Digits` → `Proven` (steps 100 keeps `Triple Digits`)
- Goal weight: `There It Is` → `The Summit`

Challenge completion no longer fires any celebration overlay. See NON-ACHIEVEMENT TRIGGERS below.

## THE PATTERN BEHIND THE TIERS

Every category uses the same count ladder, and the tier is assigned off the NUMBER, not off what the
number means:

| Threshold | Tier |
|---|---|
| 1st / 7 / 10 | small |
| 25 / 30 / 50 | medium |
| 50 / 75 / 100 | large |
| 200 | large + platinum |
| 365 | diamond |

Consequence worth staring at: **"Hit your water goal 50 times" and "Lose 50 lbs" both fired the exact
same large celebration.** One is ten weeks of drinking water. The other changes a person's life.

The 2026-07-27 re-tier broke that rule deliberately for weight and workouts — those are now tiered by
how hard the thing is, not by which number it lands on. The rest of the roster still follows the
threshold ladder. Finishing that job means judging all 97 by hand.

---

## FULL LIST BY CATEGORY

Tier shown is what actually fires. `[P]` marks platinum display.

### Hydration (8)
| Tier | Name | Earned by |
|---|---|---|
| small | First Sip | Hit your water goal for the first time |
| small | Hydrated | Hit your water goal 10 times |
| medium | Bathtub | Hit your water goal 30 times |
| large | Half Century | Hit your water goal 50 times |
| large | Relentless | Hit your water goal 75 times |
| large `[P]` | Swimming Pool | Hit your water goal 100 times |
| large `[P]` | High Tide | Hit your water goal 200 times |
| **diamond** | Ol' Reliable | Hit your water goal 365 times |

### Steps (8)
| Tier | Name | Earned by |
|---|---|---|
| small | First Step | Hit your step goal for the first time |
| small | Getting Moving | Hit your step goal 10 times |
| medium | Heating Up | Hit your step goal 30 times |
| large | Well Worn | Hit your step goal 50 times |
| large | No Quit | Hit your step goal 75 times |
| large `[P]` | Triple Digits | Hit your step goal 100 times |
| large `[P]` | Road Warrior | Hit your step goal 200 times |
| **diamond** | Full Circle | Hit your step goal 365 times |

### Weight (14)
| Tier | Name | Earned by |
|---|---|---|
| small | Showed Up | Log your first weigh-in |
| small | Just a Little Off the Top | Lose 5 lbs |
| medium | Picking Up Speed | Lose 10 lbs |
| large | Undeniable | Lose 25 lbs |
| large `[P]` | The Big Five-Oh | Lose 50 lbs |
| large `[P]` | Can't Stop Won't Stop | Lose 75 lbs |
| **diamond** | The Century Mark | Lose 100 lbs |
| small | Loading | Gain 5 lbs |
| medium | Heavy Hitter | Gain 10 lbs |
| large | Bulk Season | Gain 25 lbs |
| large `[P]` | Built Different | Gain 50 lbs |
| large `[P]` | Iron Will | Gain 75 lbs |
| **diamond** | The Gain Train | Gain 100 lbs |
| **diamond** | The Summit | Reach your goal weight |

### Momentum / streak (9)
| Tier | Name | Earned by |
|---|---|---|
| small | Day One | Log your first day |
| small | On a Roll | Log 3 days in a row |
| small | Week Warrior | Log 7 days in a row |
| medium | Not a Fluke | Log 14 days in a row |
| medium | Unstoppable | Log 30 days in a row |
| large | Sixty Strong | Log 60 days in a row |
| large | All In | Log 90 days in a row |
| large `[P]` | Six Months Strong | Log 180 days in a row |
| **diamond** | Unbroken | Log 365 days in a row |

### Faith (25)

Verse reflections:
| Tier | Name | Earned by |
|---|---|---|
| small | Marked | First verse reflection |
| small | Regular Reader | 10 verse reflections |
| medium | Saturated | 25 verse reflections |
| medium | Transformed | 50 verse reflections |
| large | Fearfully and Wonderfully Made | 100 verse reflections |
| large `[P]` | Dwelling | 200 verse reflections |
| **diamond** | Written in Full | 365 verse reflections |

Prayer:
| Tier | Name | Earned by |
|---|---|---|
| small | First Words | First prayer entry |
| small | Faithful Asker | 10 prayers |
| medium | Steadfast | 25 prayers |
| medium | Open Channel | 50 prayers |
| large | Unceasing | 100 prayers |
| large `[P]` | Two Hundred Strong | 200 prayers |
| **diamond** | A Year of Prayer | 365 prayers |

Gratitude:
| Tier | Name | Earned by |
|---|---|---|
| small | Counting Blessings | 7 gratitude entries |
| medium | Overflow | 30 gratitude entries |
| large | Rooted in Thanks | 100 gratitude entries |
| large `[P]` | Deep Well | 200 gratitude entries |
| **diamond** | Year of Thanks | 365 gratitude entries |

Bible reading:
| Tier | Name | Earned by |
|---|---|---|
| small | In the Word | Read 7 days on any plan |
| medium | Planted | Read 30 days |
| medium | Deep Cut | Read 50 days |
| large | Through and Through | Read 100 days |
| large `[P]` | Devoted | Read 200 days |
| **diamond** | Year in the Word | Read 365 days |

### Journal (7)
| Tier | Name | Earned by |
|---|---|---|
| small | First Word | First journal entry |
| medium | Consistent Voice | 10 journal entries |
| medium | Paper Trail | 25 journal entries |
| medium | The Plot Thickens | 50 journal entries |
| large | Well Documented | 100 journal entries |
| large `[P]` | Chronicled | 200 journal entries |
| **diamond** | The Book | 365 journal entries |

### Workout (10)
| Tier | Name | Earned by |
|---|---|---|
| small | First Rep | Work out your first day |
| small | Getting After It | Work out 10 days |
| medium | Not a Phase | Work out 30 days |
| medium | Committed | Work out 50 days |
| large | Built for This | Work out 75 days |
| large `[P]` | Proven | Work out 100 days |
| large `[P]` | Still Standing | Work out 200 days |
| **diamond** | 365 | Work out 365 days |
| small | Following the Plan | Load your first training program |
| small | The Blueprint | Save your first workout routine |

### Nutrition (8)
| Tier | Name | Earned by |
|---|---|---|
| small | On Point | Hit your calorie goal for the first time |
| small | Calibrated | Hit your calorie goal 10 times |
| medium | By the Numbers | Hit your calorie goal 30 times |
| medium | On the Dot | Hit your calorie goal 50 times |
| large | The Standard | Hit your calorie goal 75 times |
| large | Optimized | Hit your calorie goal 100 times |
| large `[P]` | Unrelenting | Hit your calorie goal 200 times |
| **diamond** | No Cheat Days | Hit your calorie goal 365 times |

### Sleep (8)
| Tier | Name | Earned by |
|---|---|---|
| small | Lights Out | Log sleep for the first time |
| small | Green Light | First green sleep score (85+) |
| small | Night School | 10 green sleep scores |
| medium | Deep Sleeper | 30 green sleep scores |
| medium | Sweet Dreams | 50 green sleep scores |
| large | Sleep Architect | 100 green sleep scores |
| large `[P]` | Sleep Surgeon | 200 green sleep scores |
| **diamond** | Sleep Legend | 365 green sleep scores |

---

## NON-ACHIEVEMENT TRIGGERS

These fire a celebration without being an achievement at all.

| Trigger | Tier | Also fires |
|---|---|---|
| Step goal hit | small | Daily goal toast |
| Water goal hit | small | Daily goal toast |
| Active calories goal hit | small | Daily goal toast |
| Exercise goal hit | small | Daily goal toast |
| Goal weight, first earn | diamond | — |
| Goal weight, later earns | large | — |

Daily goals are gated once per day per goal, so the ceiling is four small celebrations a day.

**Challenge completion fires nothing as of 2026-07-27.** It used to fire large on a perfect finish,
medium on a win and small otherwise. Removed because the Complete card already announces the result and
stays until the user taps Done, so the overlay was the same news twice — and it was the only place a
large celebration fired with no achievement behind it. An inline "you won" treatment on the challenge
card is still open.

---

## BLAST RADIUS

29 call sites across 8 files, all calling `showCelebration(tier, label, def)`:
`app/(tabs)/index.tsx` (12), `log.tsx` (2), `workout.tsx` (1), `bible.tsx` (2), `journal.tsx` (3),
`food-detail.tsx` (3), `recipe-log.tsx` (3), `workout-library.tsx` (2), plus the Settings dev tool
which renders the overlay directly instead of going through the queue. Was 31 before the two challenge
sites were removed.

`def` is used by the diamond path only. Every other tier uses `tier`, `label` and the theme accent.
