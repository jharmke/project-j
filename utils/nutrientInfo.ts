// Educational content for the nutrient drilldown's "Why It Matters" / "Food Sources" sections.
//
// KEYING: no new plumbing was needed at the call sites. Every drilldown item already carries a
// stable, non-display identifier: the 30 advanced nutrients pass `nutrientKey` ('Sodium, Na'), the
// 3 macros pass `directField` ('protein'). Both Home and Log build their items the same way, so
// getNutrientInfo() resolves nutrientKey first, then directField. Never key off `label` -- that is
// display copy and will change.
//
// VOICE (locked with Justin 2026-07-25, after a 5-mineral sample pass):
//  - whyItMatters is exactly 2 short paragraphs. First = what the nutrient does, plain language.
//    Second = the practical/actionable angle (what interacts with it, why intake runs low, the bit
//    worth actually knowing). The second paragraph is where the value is.
//  - Knowledgeable but never showing off. Assume the reader is smart and NOT a nutrition nerd.
//    Any term that needs prior knowledge either gets explained in the same breath or gets cut.
//    ("phytates loosen that grip" and "calcium set tofu" were both cut for exactly this.)
//  - foodSources lists food a normal person has eaten in the last month, ordered by how much they
//    realistically contribute. 6-8 items. An outlier only earns a spot when leaving it out would be
//    dishonest (oysters carry ~10x anything else for zinc), and when it does, it says why in a few
//    words rather than just appearing.
//  - Identical in all 3 coaching modes. This is education, not a grade -- so the want-less nutrients
//    (sodium, added sugars, saturated fat) describe, they never scold.
//  - No double dashes in any string here. These are user-facing.
//
// Otto reads the same content (functions/src/assistantAppKnowledge.ts) so he can never contradict
// what the app shows. Change one, change both, same session.

export interface NutrientInfo {
  /** Two short paragraphs. Rendered with a gap between them. */
  whyItMatters: string[];
  /** One or two sentences of common foods. */
  foodSources: string;
}

export const NUTRIENT_DISCLAIMER = 'For informational purposes only. Not medical advice.';

const NUTRIENT_INFO: Record<string, NutrientInfo> = {

  // ─── Macros (keyed by directField) ──────────────────────────────────────────

  protein: {
    whyItMatters: [
      'Protein is the raw material your body rebuilds with. Muscle, skin, hair, enzymes, and the antibodies your immune system runs on are all built from it. Unlike fat and carbs, your body keeps no dedicated store of protein, so the supply has to be topped up regularly.',
      'Protein is also the most filling of the three macros, and it protects muscle when you are eating in a deficit. That is why protein targets usually go up, not down, when someone is trying to lose weight.',
    ],
    foodSources: 'Chicken, beef, fish, eggs, Greek yogurt, cottage cheese, milk, beans, lentils, tofu, and protein powder.',
  },

  carbs: {
    whyItMatters: [
      'Carbohydrates are your body\'s fastest fuel. They break down into glucose, which your brain and your muscles both run on, and your muscles hold a working supply in reserve for hard efforts.',
      'For most people the type matters more than the total. Whole food carbs arrive with fiber attached, which slows digestion and steadies the release. Refined carbs arrive without it and hit faster.',
    ],
    foodSources: 'Rice, bread, pasta, potatoes, oats, fruit, beans, corn, and milk.',
  },

  fat: {
    whyItMatters: [
      'Fat does far more than store energy. Your body needs it to absorb vitamins A, D, E, and K, to build the wall around every cell, and to produce hormones including testosterone and estrogen.',
      'Fat is also the most calorie dense of the three macros, at roughly nine calories per gram against four for protein and carbs. That is why fat portions move a calorie total quickly, and why which fats you choose matters more than cutting fat out.',
    ],
    foodSources: 'Olive oil, butter, avocado, nuts, seeds, cheese, eggs, salmon, and peanut butter.',
  },

  // ─── Carbs group ────────────────────────────────────────────────────────────

  'Added Sugars': {
    whyItMatters: [
      'Added sugars are the sugars put into food during production, as opposed to the ones that occur naturally in fruit and milk. Your body processes both the same way, but added sugars arrive without the fiber, water, and nutrients that come attached to whole food.',
      'Because they are calorie dense and not especially filling, added sugars are easy to take in without noticing. For most people the largest share comes from drinks rather than food.',
    ],
    foodSources: 'Soda, energy drinks, sweetened coffee, candy, cookies, breakfast cereal, flavored yogurt, granola bars, and sauces like ketchup and barbecue.',
  },

  'Fiber, total dietary': {
    whyItMatters: [
      'Fiber is the part of a plant your body cannot break down, which is exactly what makes it useful. It passes through largely intact, slowing digestion, steadying blood sugar, and feeding the bacteria in your gut.',
      'Fiber is the main reason whole foods fill you up more than processed foods carrying the same calories. Most people take in roughly half of what is recommended.',
    ],
    foodSources: 'Beans, lentils, oats, berries, apples with the skin on, broccoli, whole grain bread, popcorn, almonds, and chia seeds.',
  },

  'Sugars, total including NLEA': {
    whyItMatters: [
      'This is every sugar in your food combined: the natural sugars in fruit, milk, and vegetables, plus anything added during production. Your body handles them the same way chemically, so this number does not separate an apple from a candy bar.',
      'That is why total sugar on its own is a limited signal. Added sugars, tracked separately, is usually the more useful number to watch.',
    ],
    foodSources: 'Fruit, milk and yogurt, honey, soda, juice, candy, baked goods, and a lot of sauces and dressings.',
  },

  'Sugar Alcohols': {
    whyItMatters: [
      'Sugar alcohols are sweeteners that taste like sugar but are only partly absorbed, so they deliver fewer calories and have a smaller effect on blood sugar. Despite the name they are neither sugar nor alcohol.',
      'The portion your body does not absorb continues into the gut, which is why larger amounts can cause bloating or digestive upset. Tolerance varies a lot from one person to the next.',
    ],
    foodSources: 'Sugar free gum and candy, protein and snack bars, keto and low carb products, and diet ice cream. On labels they show up as erythritol, xylitol, maltitol, and sorbitol.',
  },

  // ─── Fats group ─────────────────────────────────────────────────────────────

  'Fatty acids, total saturated': {
    whyItMatters: [
      'Saturated fat is the type that stays solid at room temperature. Your body uses it for energy and hormone production, and it turns up naturally in most animal foods along with a few plant oils.',
      'It is the fat most closely tied to LDL cholesterol levels, which is why guidelines put a ceiling on it rather than a target. Swapping part of it for unsaturated fat has a measurable effect on those numbers.',
    ],
    foodSources: 'Butter, cheese, fatty cuts of beef and pork, chicken skin, cream, coconut oil, and most baked goods.',
  },

  'Trans Fat': {
    whyItMatters: [
      'Trans fat is largely a manufactured fat, created by adding hydrogen to liquid oil so it behaves like a solid and lasts longer on a shelf. Small amounts also occur naturally in beef and dairy.',
      'The manufactured kind raises LDL and lowers HDL at the same time, which is why it has been phased out of the food supply across the US and much of the world. Most days now read zero.',
    ],
    foodSources: 'Increasingly rare, but still possible in some fried food, packaged frosting, and older stock of shortening and margarine. A label can read zero at under half a gram per serving, so partially hydrogenated oil in the ingredient list is the real tell.',
  },

  'Polyunsaturated Fat': {
    whyItMatters: [
      'Polyunsaturated fat includes the two fats your body cannot manufacture and has to get from food: omega 3 and omega 6. They build cell membranes and regulate inflammation, blood clotting, and brain function.',
      'Most diets carry plenty of omega 6 and not much omega 3. The omega 3 side is where the gap usually sits, and oily fish is the most direct way to close it.',
    ],
    foodSources: 'Salmon, tuna, sardines, walnuts, flaxseed, chia seeds, eggs, and sunflower or soybean oil.',
  },

  'Monounsaturated Fat': {
    whyItMatters: [
      'Monounsaturated fat is the fat that dominates olive oil, avocados, and most nuts. It is the one most consistently associated with better cholesterol numbers in the research.',
      'When guidelines suggest replacing some saturated fat, this is usually what they mean replacing it with, rather than cutting fat overall.',
    ],
    foodSources: 'Olive oil, avocado, almonds, cashews, pecans, peanut butter, olives, and canola oil.',
  },

  // ─── Core group ─────────────────────────────────────────────────────────────

  'Cholesterol': {
    whyItMatters: [
      'Cholesterol is a waxy substance your body needs to build cell walls, produce vitamin D, and make hormones including testosterone and estrogen. Your liver manufactures most of what you use.',
      'Because the liver produces the bulk of it, cholesterol in food moves blood cholesterol far less than was assumed for decades. Saturated and trans fat have a larger effect on those numbers than dietary cholesterol does.',
    ],
    foodSources: 'Eggs, shrimp, cheese, butter, red meat, and full fat dairy.',
  },

  'Sodium, Na': {
    whyItMatters: [
      'Sodium controls fluid balance, nerve signals, and muscle contraction. You genuinely need a real amount of it, and you lose it through sweat, so hard training and hot weather both raise what your body is asking for.',
      'The large majority of sodium intake comes from packaged and restaurant food rather than the salt shaker. High intake raises blood pressure in people who are sensitive to it, which is a meaningful share of the population.',
    ],
    foodSources: 'Bread, deli meat, pizza, soup, cheese, sauces, chips, and most restaurant meals. Table salt itself is a small slice of the total.',
  },

  'Potassium, K': {
    whyItMatters: [
      'Potassium works opposite sodium. Where sodium holds fluid, potassium helps release it, and the balance between the two is a large part of what regulates blood pressure. It also drives muscle contraction and your heartbeat.',
      'Most people run low on potassium and high on sodium at the same time, so bringing potassium up is often as useful as bringing sodium down.',
    ],
    foodSources: 'Potatoes, sweet potatoes, bananas, beans, lentils, yogurt, milk, spinach, avocado, and orange juice.',
  },

  'Caffeine': {
    whyItMatters: [
      'Caffeine blocks the brain chemical that builds up across the day and makes you feel sleepy. It does not create energy. It postpones the sensation of not having any.',
      'Caffeine has a half life of roughly five to six hours, so an afternoon coffee still has half its dose working at bedtime. That is the most common reason caffeine costs people sleep quality even when they fall asleep without trouble.',
    ],
    foodSources: 'Coffee, espresso, black and green tea, energy drinks, soda, pre workout, and dark chocolate.',
  },

  // ─── Vitamins ───────────────────────────────────────────────────────────────

  'Vitamin A': {
    whyItMatters: [
      'Vitamin A is what lets your eyes adjust to low light. It also maintains skin, the lining of your lungs and gut, and normal immune function.',
      'It reaches you in two forms. Animal foods deliver it ready to use, while orange and dark green plants deliver beta carotene, which your body converts only as it needs it. That means the plant form will not build up to excess, while the animal form can at supplement doses.',
    ],
    foodSources: 'Sweet potato, carrots, spinach, kale, red bell pepper, cantaloupe, eggs, butter, and cheese.',
  },

  'Vitamin C': {
    whyItMatters: [
      'Vitamin C builds collagen, which is the scaffolding for your skin, tendons, and blood vessels, and the material your body reaches for to heal a wound. It also works as an antioxidant and sharply increases how much iron you pull out of plant food.',
      'Your body does not store it, so intake matters day to day rather than week to week. Heat destroys it, which means raw and lightly cooked sources deliver noticeably more than boiled ones.',
    ],
    foodSources: 'Oranges, strawberries, kiwi, bell peppers, broccoli, tomatoes, potatoes, and cantaloupe.',
  },

  'Vitamin D': {
    whyItMatters: [
      'Vitamin D controls how much calcium you actually absorb, which makes it as important to your bones as calcium itself. It also supports immune function and muscle strength.',
      'Very few foods contain it naturally. Your skin makes it from sunlight, which is why levels commonly fall in winter, at higher latitudes, and for anyone whose day is spent indoors.',
    ],
    foodSources: 'Salmon, tuna, sardines, egg yolks, and mushrooms grown under UV light. Most of what people actually get comes from fortified milk, plant milk, orange juice, and cereal.',
  },

  'Vitamin E': {
    whyItMatters: [
      'Vitamin E is an antioxidant that protects the fats in your body from damage, starting with the fats that make up the wall around every cell. It also supports immune function and keeps blood vessels working properly.',
      'Vitamin E needs fat to be absorbed, so it lands better alongside a real meal than on its own. Shortfalls are uncommon for anyone eating a normal amount of nuts, seeds, or oil.',
    ],
    foodSources: 'Sunflower seeds, almonds, peanut butter, avocado, spinach, red bell pepper, and sunflower or olive oil.',
  },

  'Vitamin K': {
    whyItMatters: [
      'Vitamin K is what allows your blood to clot, which is why a serious shortfall shows up as easy bruising and bleeding. It also directs calcium into your bones rather than into soft tissue.',
      'Leafy greens carry so much of it that a single serving usually covers a full day. Worth knowing: vitamin K interacts directly with blood thinning medication, so anyone taking warfarin is normally told to keep intake steady rather than swing it up and down.',
    ],
    foodSources: 'Kale, spinach, broccoli, brussels sprouts, cabbage, lettuce, and green beans.',
  },

  // ─── B vitamins ─────────────────────────────────────────────────────────────

  'Vitamin B6': {
    whyItMatters: [
      'B6 helps convert the food you eat into usable energy, and it builds the brain chemicals that regulate mood and sleep, including serotonin and melatonin. Your body also needs it to make hemoglobin.',
      'B6 is spread widely across everyday food, so covering it from a normal diet is straightforward. It is also one of the few water soluble vitamins that can cause problems at high supplement doses, so this is not one to megadose.',
    ],
    foodSources: 'Chicken, turkey, salmon, tuna, potatoes, bananas, chickpeas, and fortified cereal.',
  },

  'Folate': {
    whyItMatters: [
      'Folate builds and repairs DNA, which makes it most critical wherever cells are dividing fastest. That is why it is the single most emphasized nutrient in early pregnancy, when it prevents serious birth defects in the first few weeks.',
      'Folate is also required to make red blood cells, and a shortfall produces its own form of anemia. Folate is the form found in food; folic acid is the synthetic version used in supplements and fortified grain.',
    ],
    foodSources: 'Lentils, beans, spinach, asparagus, broccoli, avocado, oranges, and fortified bread, pasta, and cereal.',
  },

  'Vitamin B12': {
    whyItMatters: [
      'B12 builds red blood cells and maintains the protective sheath around your nerves. A long running shortfall causes fatigue and nerve symptoms that can become permanent, which is why B12 gets more attention than the rest of the B vitamins.',
      'B12 occurs naturally only in animal food, so vegans and strict vegetarians need fortified food or a supplement to cover it. Absorption also declines with age regardless of what you eat.',
    ],
    foodSources: 'Beef, salmon, tuna, clams, eggs, milk, yogurt, cheese, and fortified cereal or nutritional yeast.',
  },

  'Biotin': {
    whyItMatters: [
      'Biotin helps your body break fat, carbohydrate, and protein down into energy. It is the vitamin marketed hardest for hair, skin, and nails, though that benefit is only established in people who were genuinely deficient to begin with.',
      'Deficiency is rare, because the bacteria in your gut produce some of what you need and food covers the rest. Worth knowing: high dose biotin supplements are a documented cause of false lab results, including thyroid and heart tests.',
    ],
    foodSources: 'Eggs, especially the yolk, along with salmon, pork, sweet potato, almonds, sunflower seeds, and avocado.',
  },

  'Thiamin': {
    whyItMatters: [
      'Thiamin, also called B1, is what your body uses to turn carbohydrate into energy. Demand rises with how much you eat and how active you are, and both nerve and heart function depend on it.',
      'Processing removes most of the thiamin from grain, which is why bread and cereal are routinely fortified to put it back. Deficiency is uncommon in general, but it shows up around heavy alcohol use, which blocks absorption.',
    ],
    foodSources: 'Pork, fortified bread and cereal, brown rice, black beans, sunflower seeds, and trout.',
  },

  'Riboflavin': {
    whyItMatters: [
      'Riboflavin, also called B2, helps release energy from food and keeps the other B vitamins working. B6 and folate both need riboflavin present to do their own jobs properly.',
      'Riboflavin breaks down in light, which is the actual reason milk stopped being sold in clear glass bottles. A harmless side effect of a large dose is bright yellow urine.',
    ],
    foodSources: 'Milk, yogurt, cheese, eggs, beef, chicken, mushrooms, almonds, and fortified cereal.',
  },

  'Niacin': {
    whyItMatters: [
      'Niacin, also called B3, takes part in energy production in every cell you have, and supports skin and nervous system function. Your body can also manufacture a small amount of it from the protein you eat.',
      'At the high doses once used to alter cholesterol, niacin causes a distinctive flushing of the skin. That is a supplement effect and not something food will ever do to you.',
    ],
    foodSources: 'Chicken, turkey, beef, salmon, tuna, peanuts, brown rice, and fortified cereal.',
  },

  'Choline': {
    whyItMatters: [
      'Choline builds cell membranes and produces acetylcholine, the chemical your nerves use to signal your muscles and the one most closely tied to memory. It also moves fat out of the liver.',
      'Choline was only formally recognized as an essential nutrient in 1998, so it is newer to the conversation than the vitamins sitting next to it. Most people fall short, and eggs are far and away the easiest fix.',
    ],
    foodSources: 'Eggs, especially the yolk, along with beef, chicken, salmon, soybeans, potatoes, and kidney beans.',
  },

  // ─── Minerals (voice sample, approved by Justin 2026-07-25) ─────────────────

  'Calcium, Ca': {
    whyItMatters: [
      'Nearly all of your calcium is stored in your skeleton, where it does double duty: building bone, and acting as a reserve your body draws from when intake runs short. The small amount circulating in your blood handles muscle contraction, nerve signals, and clotting, and your body defends that level fiercely. If you are not eating enough, you do not feel it. Your bones quietly cover the difference.',
      'Calcium needs vitamin D to be absorbed at all, and it absorbs best in smaller amounts spread through the day rather than all at once. A consistently high sodium intake increases how much calcium you lose.',
    ],
    foodSources: 'Milk, yogurt, and cheese are the heavy hitters. Fortified almond, oat, and soy milks are close behind, as is fortified orange juice. Broccoli, almonds, and leafy greens add smaller amounts.',
  },

  'Iron, Fe': {
    whyItMatters: [
      'Iron is what lets your blood carry oxygen. It sits at the center of hemoglobin in your red blood cells and myoglobin in your muscle, so running low shows up as exactly what you would expect: fatigue, endurance that falls off early, feeling cold.',
      'Two kinds exist and they behave very differently. Heme iron from animal food absorbs several times more readily than non heme iron from plants. Vitamin C eaten alongside plant iron pulls absorption up substantially, while coffee and tea with a meal pull it down.',
    ],
    foodSources: 'Beef and dark meat chicken are the strongest, and your body absorbs that form easily. Beans, lentils, tofu, spinach, pumpkin seeds, and fortified cereals all carry iron too, but in a form that is harder to absorb. Vitamin C is what unlocks it, so bell peppers, tomatoes, or a squeeze of citrus alongside a bean dish genuinely changes how much you get out of it.',
  },

  'Magnesium, Mg': {
    whyItMatters: [
      'Magnesium is a required partner in over 300 enzyme reactions, which is a clinical way of saying your body cannot release energy from food without it. It also governs the other half of muscle movement: calcium drives the contraction, magnesium drives the release. Around 60 percent of your supply is stored in bone.',
      'Processing strips magnesium out. White bread, white rice, and most packaged foods lose most of what the original grain had, while whole grain versions keep it. That is the single biggest reason intake tends to run low.',
    ],
    foodSources: 'Pumpkin seeds, almonds, cashews, dark chocolate, black beans, edamame, spinach, avocado, and whole grains.',
  },

  'Zinc, Zn': {
    whyItMatters: [
      'Zinc runs your immune cells, closes wounds, builds protein, and drives testosterone production. It is also tied to taste and smell, which is why food starts tasting flat when zinc runs low.',
      'Your body keeps no real reserve of zinc, so it is something you need regularly rather than something that averages out over a good week. Zinc from meat and seafood absorbs more easily than zinc from beans and grains.',
    ],
    foodSources: 'Oysters, by a wide margin over everything else. Then beef, crab, pork, chicken thighs, pumpkin seeds, cashews, chickpeas, and fortified cereal.',
  },

  'Copper, Cu': {
    whyItMatters: [
      'Copper\'s main job is making your iron usable. Without it, iron cannot be loaded into hemoglobin properly, so a copper shortfall can look exactly like an iron shortfall. Copper also builds connective tissue and blood vessels, insulates nerves, and powers several antioxidant enzymes.',
      'Copper and zinc compete for the same absorption route. Getting too little copper from food alone is uncommon, but sustained high dose zinc supplementation is a well documented way to drive copper down.',
    ],
    foodSources: 'Potatoes, mushrooms, dark chocolate, cashews, peanut butter, lentils, and whole grain bread. Copper turns up in small amounts across a lot of everyday food, which is why getting too little from diet alone is uncommon.',
  },
};

/**
 * Resolves the educational content for a drilldown item.
 * `nutrientKey` covers the 30 advanced nutrients, `directField` covers the 3 macros.
 * Returns null when nothing is written for that key, in which case the caller renders
 * no section at all rather than an empty card.
 */
export function getNutrientInfo(
  nutrientKey?: string,
  directField?: string,
): NutrientInfo | null {
  const key = nutrientKey ?? directField;
  if (!key) return null;
  return NUTRIENT_INFO[key] ?? null;
}

export default NUTRIENT_INFO;
