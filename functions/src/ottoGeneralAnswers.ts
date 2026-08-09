// functions/src/ottoGeneralAnswers.ts
//
// PLAN.md 4.13. GENERAL nutrition and fitness answers, so a free user's fitness question costs ZERO
// instead of an AI call. Source of the approved text: SPEC_otto_general_answers.md.
//
// 🔴 THIS IS A SEPARATE LIBRARY FROM `ottoCannedAnswers.ts`, DELIBERATELY.
// `matchCanned(message, ctx, answers)` already takes the answer set as a PARAMETER, so the split needs
// no matcher changes at all. The reason for splitting: the matcher's zero-wrong-answers record was set
// on 183 answers in ONE domain. Merging these in would roughly double the pool AND span two very
// different domains, and the risk here is a COLLISION, not a miss. Two pools of ~150 is a far easier
// matching problem than one of ~324, and `ottoCoachRouting.ts` already tells the two domains apart.
//
// ⚠️ HOUSE RULES, same as `ottoCannedAnswers.ts`:
//  1. NO DASHES OF ANY KIND joining two thoughts. Hyphens inside a compound word are fine.
//  2. Every `route` must be one of the real ROUTE_KEYS.
//  3. US spelling.
//  4. MERGE overlapping questions rather than splitting them. Two near-identical entries is exactly how
//     the wrong one of hundreds gets returned.
//
// 🔴 RULES SPECIFIC TO THIS FILE, FROM THE DRAFTING PASS (full reasoning in SPEC_otto_general_answers.md):
//  A. NOTHING CRISIS-ADJACENT GETS AN ANSWER HERE. `utils/faithCrisis.ts` matches chest pain, heart
//     attack, stroke and seizure CLIENT-SIDE before this code is ever reached. The danger is the
//     phrasings it MISSES ("my chest hurts when I run" does not match /\bchest pain\b/): today those fall
//     through to the AI, which carries the [[CRISIS]] instruction. An answer here catching "chest hurts"
//     would fire FIRST and hand a possible emergency a calm "see a doctor sometime" reply.
//     ➡️ Chest pain has NO entry. The dizziness entry MUST exclude chest and breathing terms.
//  B. THE SYSTEM PROMPT'S MEDICAL GUARDRAIL DOES NOT REACH THESE. The model is never called, so
//     "general educational information, never prescriptive" is carried by HAND in how each answer reads.
//  C. NO PER-FOOD OR PER-EXERCISE RULINGS ("is white rice bad"). Those are unbounded. General principles
//     only, which is a finite list with an end. Justin's line, 2026-08-08.
//  D. Possessive/own-data questions ("am I eating enough protein") are already declined by
//     OWN_DATA_SIGNALS inside the matcher, so `excludes` here does NOT need to restate them.

import type { CannedAnswer } from './ottoCannedMatcher';

// ─────────────────────────────────────────────────────────────────────────────
// NUTRITION -- core
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE TRIGGER LISTS BELOW ARE DELIBERATELY WIDE (Justin, 2026-08-09: "wider the better").
// 🔴 WHY WIDE IS SAFE HERE, AND IT IS THE WHOLE REASON THIS IS ALLOWED: when two answers both explain a
// message the matcher REFUSES TO PICK and hands it to Otto (see "ambiguous ties are a FEATURE" in
// `ottoCannedMatcher.ts`). So an over-wide list fails toward COSTING A FRACTION OF A CENT, never toward
// returning the wrong answer. The number that must stay zero is wrong answers, and width does not
// threaten it. A narrow list, by contrast, just quietly costs money on every phrasing it misses.
// ⚠️ Wide `requires` therefore need wide `excludes` too, or two answers tie and BOTH are lost to Otto.
const NUTRITION_CORE: CannedAnswer[] = [
  {
    id: 'gen.protein_target',
    // 🔴 ONE `requires` ARRAY, NOT TWO. The second array used to demand a quantity word (how much, target,
    // grams, ...) and that is what made the plainest phrasings miss. THE TOPIC IS THE DISCRIMINATOR AND
    // `excludes` IS THE COLLISION BREAKER; a quantity word was never doing the work I thought it was.
    requires: [['protein']],
    covers: ['how much', 'how many', 'target', 'goal', 'need', 'required', 'should i eat', 'should i have',
             'intake', 'amount', 'grams', 'gram', 'g of', 'enough', 'daily', 'per day', 'a day',
             'recommended', 'aim for', 'shoot for', 'minimum', 'optimal', 'ideal', 'day', 'per pound',
             'bodyweight', 'body weight', 'lb', 'pound', 'eat', 'get', 'hit', 'much'],
    // ⚠️ Each of these is a DIFFERENT protein question with its own answer, or an app question. Without
    // them "do I need protein powder" fires the target answer, which is the classic collision.
    excludes: ['powder', 'shake', 'supplement', 'whey', 'casein', 'vegan', 'vegetarian', 'plant',
               'one sitting', 'absorb', 'spread', 'change', 'edit', 'set my', 'where', 'card', 'preset',
               'log', 'track'],
    answer:
      "Most people training regularly land somewhere around 0.7 to 1g per pound of bodyweight. Higher end if you are in a deficit, since protein is what protects muscle while you lose. Below about 0.5g per pound is where most people start leaving results on the table.",
  },
  {
    id: 'gen.calories_to_lose',
    // 🔴 SINGLE ARRAY, same lesson as protein above: demanding a quantity word meant the plainest question
    // anyone asks ("how do i lose weight") missed entirely.
    requires: [['lose weight', 'lose fat', 'losing weight', 'losing fat', 'fat loss', 'weight loss',
                'cutting', 'drop weight', 'slim down', 'get lean', 'deficit']],
    // ⚠️ SIZE words live in `covers`, not `requires`. "How big should my deficit be" was failing the
    // whole-message-explained test purely because "how big" was listed nowhere, which reads as a rules
    // problem and is really a vocabulary one. Same class as the "ordinary filler" misses in PLAN 4.8.
    covers: ['how much', 'how many', 'how do i', 'how big', 'how large', 'how aggressive', 'calories',
             'calorie', 'eat', 'intake', 'should i', 'target', 'need', 'daily', 'per day', 'a day',
             'amount', 'what should', 'to', 'for', 'food', 'kcal', 'day', 'best way', 'start', 'be'],
    // ⚠️ RATE questions ("how fast should I lose") are a separate answer and would otherwise tie here.
    // 🔴 THE DEFINITION-SHAPE EXCLUDES ARE NOT DECORATION. `deficit` appears in this answer AND in
    // `gen.what_is_deficit`, so "what is a calorie deficit" MATCHED BOTH and the matcher correctly refused
    // to pick, sending a very common question to Otto at full price. Found by testing real phrasings, not
    // by the probe check, which reported only that something was odd. **Ties are silent: nothing looks
    // broken, the answer just quietly costs money.**
    excludes: ['how fast', 'how quickly', 'how long', 'per week', 'a week', 'rate', 'realistic',
               'goal weight', 'plateau', 'stall', 'build muscle', 'at the same time', 'recomp',
               'what is a', 'whats a', 'what does', 'define', 'mean'],
    // ⚠️ MINDFUL BRANCH. Mindful suppresses deficit maths and weight-loss prescriptions, so the standard
    // wording ("bigger deficits", direct address) is reframed as observation. Nothing is withheld: the
    // real range still appears, per Justin's honest-numbers rule.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Most people find a gap of around 300 to 500 calories a day below what they burn is one they can live with, which usually works out around half a pound to a pound a week. Larger gaps move faster on paper and tend to be harder to sustain."
        : "A deficit of roughly 300 to 500 calories a day is the range most people can hold without feeling wrecked. That usually works out to about half a pound to a pound a week. Bigger deficits work faster on paper and get abandoned more often.",
  },
  {
    id: 'gen.calories_to_gain',
    requires: [
      ['gain muscle', 'build muscle', 'bulk', 'bulking', 'put on muscle', 'gain weight', 'add muscle',
       'get bigger', 'put on size', 'gain size', 'surplus', 'grow'],
      ['how much', 'how many', 'calories', 'calorie', 'eat', 'surplus', 'intake', 'should i', 'target',
       'need', 'daily', 'per day', 'a day', 'amount', 'what should'],
    ],
    covers: ['should', 'day', 'size', 'muscle', 'food', 'kcal'],
    // ⚠️ Same definition-shape guard as the deficit answer above: `surplus` lives in this answer and in
    // `gen.what_is_surplus`, so "what is a calorie surplus" tied and reached neither.
    excludes: ['how fast', 'how quickly', 'rate', 'per week', 'a week', 'or cut', 'first', 'protein',
               'lose fat', 'at the same time', 'recomp', 'teenager', 'too old',
               'what is a', 'whats a', 'what does', 'define', 'mean'],
    answer:
      "A surplus of roughly 200 to 300 calories a day is enough for most people. Much more than that and you gain fat alongside the muscle without building it any faster. Slow is better here, even though it does not feel like it.",
  },
  {
    id: 'gen.macros',
    requires: [['macro', 'macros', 'macronutrient', 'macronutrients']],
    covers: ['what', 'are', 'is', 'mean', 'means', 'should', 'mine', 'split', 'ratio', 'ratios',
             'breakdown', 'percentage', 'how much', 'how many', 'explain', 'work', 'good', 'best',
             'starting point', 'set', 'balance'],
    // ⚠️ App-side macro questions (changing the goal, the Macros card, presets) belong to
    // `ottoCannedAnswers.ts`. Without these, "how do I change my macros" fires this explainer.
    excludes: ['change', 'edit', 'set my', 'where', 'card', 'preset', 'goal', 'net carb', 'gear',
               'adjust', 'custom', 'log', 'track'],
    answer:
      "Protein, carbs and fat. They are the three things your calories are made of, and the split between them changes how you feel and what you keep while your weight moves. A common starting point is protein around 0.7 to 1g per pound, fat around 0.3g per pound, and carbs filling whatever is left.",
  },
  {
    id: 'gen.carbs_bad',
    requires: [
      ['carb', 'carbs', 'carbohydrate', 'carbohydrates'],
      ['bad', 'need', 'avoid', 'cut', 'cutting', 'evil', 'necessary', 'important', 'should i', 'do i',
       'fattening', 'make me fat', 'why', 'good', 'okay', 'ok to', 'fine', 'worth', 'matter'],
    ],
    covers: ['are', 'is', 'eat', 'eating', 'them', 'really'],
    // ⚠️ Every one of these is a DIFFERENT carb question with its own answer: the named low-carb and keto
    // entries, the "carbs at night" myth, net carbs (an app setting), and the fiber answer.
    excludes: ['net carb', 'after 6', 'at night', 'late', 'keto', 'low carb', 'how many', 'how much',
               'grams', 'count', 'fiber', 'fibre', 'sugar'],
    answer:
      "Carbs are not bad. They are your main fuel for hard training, and cutting them tends to hurt your sessions before it helps anything else. People often lose weight on low carb because they end up eating less overall, not because of the carbs themselves.",
  },
  {
    id: 'gen.fat_intake',
    requires: [
      ['fat', 'fats', 'dietary fat'],
      ['how much', 'how many', 'need', 'intake', 'grams', 'gram', 'g of', 'should i eat', 'should i have',
       'minimum', 'target', 'amount', 'daily', 'per day', 'a day', 'enough', 'too little', 'too low',
       'recommended', 'aim for'],
    ],
    covers: ['dietary', 'day', 'per pound', 'bodyweight', 'body weight', 'eat', 'hormones'],
    // 🔴 'fat' IS THE MOST OVERLOADED WORD IN THE WHOLE LIBRARY. These keep it off body fat percentage,
    // fat LOSS, fat burners, belly fat and the spot-reduction myth, all of which are separate answers.
    excludes: ['body fat', 'burn', 'burner', 'lose', 'losing', 'loss', 'percentage', 'belly', 'target belly',
               'saturated', 'trans', 'stubborn', 'muscle turn'],
    answer:
      "Around 0.3g per pound of bodyweight is a reasonable floor. Fat matters for hormones, so going very low for long stretches tends to backfire. Above that floor it is mostly preference, traded against carbs.",
  },
  {
    id: 'gen.fiber',
    requires: [['fiber', 'fibre']],
    covers: ['how much', 'how many', 'need', 'daily', 'day', 'per day', 'grams', 'gram', 'g of', 'enough',
             'intake', 'should', 'target', 'amount', 'why', 'important', 'benefit', 'good', 'get',
             'eat', 'recommended', 'aim for', 'more'],
    answer:
      "Around 14g per 1,000 calories is the usual guideline, so most people land between 25 and 35g a day. Fiber does a lot of the work on fullness, which makes eating less feel easier. Increase it gradually if you are well under, since jumping straight there is uncomfortable.",
  },
  {
    id: 'gen.water_intake',
    requires: [
      ['water', 'hydration', 'hydrated', 'fluid', 'fluids'],
      ['how much', 'how many', 'need', 'drink', 'drinking', 'daily', 'day', 'per day', 'a day', 'enough',
       'intake', 'should i', 'target', 'amount', 'ounces', 'oz', 'liters', 'litres', 'gallon',
       'recommended', 'aim for', 'supposed to'],
    ],
    covers: ['should', 'get', 'much', 'bodyweight', 'body weight'],
    // ⚠️ Logging water, the water goal and the quick-add presets are APP questions in the other library.
    // Coffee, sports drinks and water WEIGHT are separate answers here.
    excludes: ['log', 'goal', 'card', 'preset', 'track', 'add', 'reminder', 'coffee', 'dehydrat',
               'weight', 'retention', 'sports drink', 'electrolyte', 'soda', 'juice'],
    answer:
      "Around half an ounce to an ounce per pound of bodyweight a day is the common range, more if you sweat heavily or train in heat. Thirst and urine color are decent day to day guides. There is no prize for overdoing it.",
  },
  {
    id: 'gen.count_calories',
    requires: [
      ['count', 'counting', 'track', 'tracking', 'weigh everything', 'log everything'],
      ['calorie', 'calories', 'food', 'everything', 'macros', 'what i eat'],
    ],
    covers: ['do i have to', 'have to', 'need to', 'must i', 'necessary', 'required', 'worth it',
             'should i', 'point of', 'why', 'bother', 'obsess'],
    // 🔴 THE HARD PART OF THIS ONE: "how do I log food" is an APP question and must not land here. This
    // answer is only about WHETHER to count at all. Accuracy, raw vs cooked and tracking forever are
    // three more separate answers that would otherwise tie with it.
    excludes: ['how do i', 'where do i', 'forgot', 'past', 'yesterday', 'edit', 'delete', 'barcode',
               'recipe', 'accurate', 'accuracy', 'raw', 'cooked', 'restaurant', 'label', 'serving',
               'forever', 'homemade', 'scan'],
    answer:
      "No. Counting is the most direct way to know what you are actually eating, which is why it works, but it is not the only way. Plenty of people do fine on consistent portions and habits. The tradeoff is that when progress stalls you have less to look at.",
  },
  {
    id: 'gen.meal_timing',
    requires: [
      ['meal timing', 'timing', 'when to eat', 'when i eat', 'what time', 'time of day', 'times i eat'],
      ['matter', 'matters', 'important', 'affect', 'affects', 'eat', 'difference', 'make a difference',
       'does it', 'do i', 'worth'],
    ],
    covers: ['does', 'do', 'meals', 'window', 'schedule', 'spread', 'really'],
    excludes: ['before', 'after', 'workout', 'training', 'late', 'night', 'fasting', 'fast',
               'how many meals', 'sleep', 'bed', 'breakfast'],
    answer:
      "Much less than total intake. Once your calories and protein are where you want them, timing is a small optimization rather than the thing that decides your results. Eating in a way you can repeat matters more than eating at the right hour.",
  },
  {
    id: 'gen.meals_per_day',
    requires: [['how many meals', 'meals a day', 'meals per day', 'how often should i eat',
                'number of meals', 'how many times a day', 'how often do i eat', 'how often to eat',
                'three meals', 'six meals', 'small meals']],
    covers: ['should', 'eat', 'day', 'best', 'optimal', 'better', 'frequency', 'spread', 'ideal'],
    // ⚠️ Meal SLOTS (naming them, adding one) are an app feature in the other library.
    excludes: ['slot', 'rename', 'add a meal', 'log', 'snack', 'timing'],
    answer:
      "Whatever you can hold to. Three, five or two all work if the totals line up. Some people find fewer, bigger meals easier and others get hungry and raid the kitchen, so it is worth finding your own answer rather than copying someone else's.",
  },
  {
    id: 'gen.eat_around_workout',
    requires: [
      ['eat', 'eating', 'meal', 'food', 'protein', 'carbs', 'snack', 'fuel', 'fasted', 'shake'],
      ['workout', 'training', 'lift', 'lifting', 'gym', 'session', 'exercise', 'train'],
    ],
    covers: ['before', 'after', 'pre', 'post', 'around', 'should i', 'better', 'need to', 'important',
             'window', 'anabolic', 'empty stomach'],
    // 🔴 THE FOOD WORD PLUS THE TRAINING WORD IS THE PAIR THAT IDENTIFIES THIS, NOT before/after.
    // ⚠️ It was originally a THREE-part requires including before/after, and that broke "should I train
    // FASTED", which names no time at all. Moving before/after into `covers` fixed it.
    // ✅ The pair still keeps the rivals out on its own: "should I do cardio before or after weights" and
    // "should I stretch before training" contain no food word, so neither can reach this answer.
    excludes: ['cardio before', 'cardio after', 'order', 'stretch', 'warm up', 'warm-up', 'sore',
               'weigh', 'shower', 'how long', 'rest day', 'sleep'],
    answer:
      "Either works for most people. If you train hard and early, something small beforehand usually helps. What matters more is getting enough protein across the day rather than hitting a narrow window afterward.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NUTRITION -- supplements, habits, and the definitions
// ─────────────────────────────────────────────────────────────────────────────
const NUTRITION_REST: CannedAnswer[] = [
  {
    id: 'gen.protein_powder',
    requires: [['protein powder', 'whey', 'casein', 'protein shake', 'shakes', 'mass gainer']],
    covers: ['do i need', 'need', 'necessary', 'worth it', 'should i', 'good', 'better', 'required', 'use'],
    excludes: ['how much protein should', 'creatine', 'pre workout'],
    answer:
      "No, it is food, not magic. Powder is a convenient way to hit a protein target when whole food is inconvenient, and that is the whole of it. If you already hit your protein without it, you are not missing anything.",
  },
  {
    id: 'gen.creatine',
    requires: [['creatine']],
    covers: ['do i need', 'need', 'worth', 'worth it', 'should i', 'take', 'taking', 'dose', 'how much',
             'safe', 'work', 'works', 'good', 'loading', 'when'],
    answer:
      "Creatine is the most studied supplement in the space and one of the few with real evidence behind it. Around 3 to 5g a day is the usual dose, and timing does not matter. Whether you take it is a personal call, and worth running past a doctor or pharmacist if you take medication.",
  },
  {
    id: 'gen.supplements',
    requires: [['supplement', 'supplements', 'vitamins', 'multivitamin', 'vitamin']],
    covers: ['do i need', 'need', 'worth', 'should i', 'take', 'taking', 'any', 'which', 'best', 'help'],
    // ⚠️ Creatine, protein powder and the medication-interaction question are all separate answers.
    excludes: ['creatine', 'protein powder', 'whey', 'medication', 'medicine', 'prescription', 'interact'],
    answer:
      "Most people do not need much. Food covers the majority of it, and supplements fill specific gaps rather than replacing the basics. If you suspect a real deficiency, that is a blood test and a doctor, not a guess in a shop.",
  },
  {
    id: 'gen.how_strict',
    requires: [['cheat meal', 'cheat day', 'how strict', 'perfect', 'perfection', 'slip up', 'off plan',
                'treat', 'treats', 'flexible', 'flexibility', 'strict']],
    covers: ['do i have to be', 'need to be', 'okay', 'ok', 'allowed', 'ruin', 'ruined', 'bad', 'guilty'],
    excludes: ['fall off', 'back on track', 'week off', 'holiday', 'vacation', 'family'],
    answer:
      "Consistency beats perfection by a wide margin. Most people do well eating in a way they can hold most of the time and not treating a single meal as a failure. If a rigid plan makes you swing between strict and blown out, that is a sign the plan is too rigid.",
  },
  {
    id: 'gen.alcohol',
    requires: [['alcohol', 'drinking', 'beer', 'wine', 'liquor', 'drinks out', 'booze']],
    covers: ['okay', 'ok', 'bad', 'affect', 'affects', 'ruin', 'how much', 'calories', 'gains', 'recovery'],
    excludes: ['water', 'coffee', 'energy drink', 'sports drink', 'soda', 'juice', 'smoothie'],
    answer:
      "Alcohol carries about 7 calories per gram and tends to come with food you would not otherwise eat. It also blunts recovery and sleep quality on the nights you drink. Plenty of people fit it in, they just account for it rather than pretending it is free.",
  },
  {
    id: 'gen.eating_out',
    requires: [['eating out', 'eat out', 'restaurant', 'restaurants', 'takeout', 'take out', 'fast food',
                'ordering out', 'menu']],
    covers: ['how do i', 'handle', 'deal with', 'manage', 'track', 'log', 'estimate', 'what should i'],
    // ⚠️ Tracking restaurant food specifically is its own answer in LABELS AND TRACKING.
    excludes: ['how do i track', 'how accurate', 'calories accurate', 'family', 'holiday'],
    answer:
      "Look at the menu before you go if you can, and pick the thing you would order anyway rather than the thing that sounds virtuous. Restaurant portions run large and cooking fats are underestimated, so logging a bit above your first instinct is usually closer. One meal does not decide a week.",
  },
  {
    id: 'gen.fasting',
    requires: [['intermittent fasting', 'fasting', 'if window', 'eating window', '16 8', 'omad', 'fast']],
    covers: ['work', 'works', 'worth', 'should i', 'good', 'better', 'help', 'does', 'benefit'],
    // ⚠️ The app's own fasting timer is a feature question in the other library.
    excludes: ['timer', 'start my fast', 'end my fast', 'card', 'log', 'track my fast', 'fasted'],
    answer:
      "Fasting works for the people it suits, and the reason is usually that a shorter eating window means eating less overall. There is nothing special happening beyond that for most people. If it makes eating easier for you, it is a fine tool. If it leaves you ravenous and prone to overeating later, it is not.",
  },
  {
    id: 'gen.eating_late',
    requires: [['eating late', 'eat late', 'late at night', 'before bed', 'at night', 'after 6', 'after 8',
                'night eating', 'late night']],
    covers: ['bad', 'okay', 'ok', 'fat', 'gain', 'affect', 'matter', 'should i'],
    excludes: ['carbs after', 'screens', 'sleep quality', 'caffeine', 'nap'],
    answer:
      "Not by itself. A calorie at 9pm is the same as one at 9am. Late eating gets a bad name because it is often unplanned snacking on top of a full day rather than because of the hour.",
  },
  {
    id: 'gen.what_is_deficit',
    requires: [['calorie deficit', 'deficit']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'how does', 'work', 'works'],
    excludes: ['how much', 'how many', 'how big', 'size', 'should i eat', 'in a deficit', 'my deficit'],
    // ⚠️ MINDFUL BRANCH: "weight loss" becomes "weight changing". A definition still gets given in full.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Eating fewer calories than your body uses, so the difference comes from stored energy. That is the mechanism behind weight changing, whatever approach is wrapped around it."
        : "Eating fewer calories than you burn, so your body makes up the difference from stored energy. That is the mechanism behind weight loss regardless of which diet is wrapped around it.",
  },
  {
    id: 'gen.what_is_surplus',
    requires: [['surplus', 'calorie surplus']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'how does', 'work'],
    excludes: ['how much', 'how many', 'how big', 'gain muscle', 'bulk'],
    answer:
      "Eating more calories than you burn, which is what gives your body the material to build with. A small one is enough. A large one mostly adds fat.",
  },
  {
    id: 'gen.maintenance',
    requires: [['maintenance', 'maintain my weight', 'maintaining', 'maintenance calories']],
    covers: ['what is', 'whats', 'mean', 'how much', 'how many', 'find', 'calculate', 'work out'],
    excludes: ['reverse', 'diet break', 'after a cut'],
    answer:
      "The intake where your weight holds steady. It is not a fixed number, since it moves with your activity, your size and time, which is why it is worth rechecking rather than setting once.",
  },
  {
    id: 'gen.tdee',
    requires: [['tdee', 'total daily energy']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'stand for', 'calculate'],
    excludes: ['bmr'],
    answer:
      "Total Daily Energy Expenditure, which is everything you burn in a day: your resting burn, your movement, your training and the energy used digesting food. It is the number a calorie target is built from.",
  },
  {
    id: 'gen.bmr',
    requires: [['bmr', 'basal metabolic', 'resting metabolic', 'rmr']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'stand for', 'calculate', 'high', 'low'],
    excludes: ['tdee', 'burned', 'burn accuracy', 'active calorie'],
    answer:
      "Basal Metabolic Rate, which is what your body burns doing nothing at all: breathing, circulation, keeping you warm. For most people it is the largest single share of what they burn in a day, which surprises people who assume exercise dominates.",
  },
  {
    id: 'gen.sugar',
    requires: [['sugar', 'sweets', 'sweet stuff', 'added sugar']],
    covers: ['how much', 'too much', 'bad', 'cut out', 'avoid', 'limit', 'okay', 'ok', 'need to'],
    excludes: ['blood sugar', 'diabetes', 'sugar free', 'diet soda', 'sweetener', 'carbs'],
    answer:
      "There is no single line, and sugar is not uniquely fattening. The practical issue is that sugary food is easy to overeat and light on fullness, so it crowds out food that would have kept you satisfied. Fitting it into your totals is more useful than banning it.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING
// ⚠️ 'cardio', 'rest' and 'sore' each appear in more than one question in this library. Their `excludes`
// are doing real work; loosen one and two answers tie and BOTH are lost to Otto.
// ─────────────────────────────────────────────────────────────────────────────
const TRAINING: CannedAnswer[] = [
  {
    id: 'gen.days_per_week',
    requires: [['how many days', 'days a week', 'days per week', 'how often should i train',
                'how often should i work out', 'how often to train', 'times a week', 'how many times']],
    covers: ['train', 'training', 'workout', 'lift', 'gym', 'should i', 'best', 'optimal', 'week'],
    excludes: ['cardio', 'rest day', 'rest days', 'meals', 'eat', 'weigh'],
    answer:
      "Two to four days of resistance training a week covers most people, and three is a reasonable default. More days is not automatically better, since what you recover from is what counts. The number you can hold to every week beats the number that looks best on paper.",
  },
  {
    id: 'gen.rest_days',
    requires: [['rest day', 'rest days', 'days off', 'day off', 'take a break', 'off days']],
    covers: ['how many', 'need', 'should i', 'important', 'necessary', 'week', 'do i'],
    // ⚠️ "What should I do on a rest day" is a SEPARATE answer in SLEEP AND RECOVERY.
    excludes: ['what should i do', 'what do i do', 'active recovery', 'between sets', 'walk'],
    answer:
      "Most people do well with two or three. Rest is when the adaptation actually happens, so days off are part of the training rather than time away from it. If you are training hard and never taking one, that usually shows up as stalled progress before anything else.",
  },
  {
    id: 'gen.sets_and_reps',
    requires: [['sets', 'reps', 'repetitions', 'set and rep', 'rep range']],
    covers: ['how many', 'how much', 'should i', 'best', 'optimal', 'range', 'do', 'per exercise'],
    // ⚠️ Rest BETWEEN sets, training to failure and tempo are three separate answers.
    excludes: ['rest between', 'how long between', 'failure', 'tempo', 'superset', 'log', 'add a set'],
    answer:
      "Three to four sets of 6 to 12 reps covers most goals for most people. Lower reps with heavier weight leans toward strength, higher reps toward endurance, and the middle does a bit of both. The differences matter less than showing up and adding over time.",
  },
  {
    id: 'gen.progressive_overload',
    requires: [['progressive overload', 'overload', 'progression', 'progress in the gym', 'keep progressing']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'how do i', 'work', 'important'],
    excludes: ['plateau', 'stall', 'not moving'],
    answer:
      "Asking your body to do slightly more than last time, so it has a reason to change. More weight, more reps, more sets, better control, less rest. Without it, training becomes maintenance.",
  },
  {
    id: 'gen.how_heavy',
    requires: [['how heavy', 'how much weight', 'what weight', 'how much should i lift', 'heavy enough',
                'too light', 'too heavy']],
    covers: ['should i', 'lift', 'lifting', 'load', 'pick', 'choose', 'know'],
    excludes: ['body weight', 'bodyweight', 'lose', 'gain', 'scale', 'weigh myself', 'belt'],
    answer:
      "Heavy enough that the last couple of reps are hard while your form holds. If you could have done five more, it was too light. If your technique falls apart, it was too heavy.",
  },
  {
    id: 'gen.need_cardio',
    requires: [['cardio'], ['need', 'have to', 'must', 'required', 'necessary', 'skip', 'without',
                            'should i do', 'do i have', 'bad for', 'kill', 'hurt']],
    covers: ['gains', 'muscle', 'why', 'worth', 'benefit', 'heart'],
    excludes: ['how much', 'how many', 'how often', 'minutes', 'hours', 'before', 'after', 'order', 'first'],
    answer:
      "Not for building muscle, but it is worth doing for your heart, your recovery and your general capacity. Lifting and cardio are not in competition unless the cardio is so much that it eats into your recovery. Most people are nowhere near that line.",
  },
  {
    id: 'gen.how_much_cardio',
    requires: [['cardio'], ['how much', 'how many', 'how often', 'minutes', 'hours', 'times a week',
                            'per week', 'a week', 'how long']],
    covers: ['should i', 'do', 'week', 'session', 'steps', 'walking'],
    excludes: ['need', 'have to', 'before', 'after', 'order', 'first', 'kill', 'bad for'],
    answer:
      "The common guideline is around 150 minutes of moderate activity a week, and walking counts. If your goal is fat loss, cardio helps by adding to what you burn rather than by being special. Adding steps is usually easier to sustain than adding sessions.",
  },
  {
    id: 'gen.workout_length',
    requires: [['how long should', 'how long', 'length of', 'duration'],
               ['workout', 'training', 'session', 'gym', 'lift', 'in the gym']],
    covers: ['be', 'last', 'take', 'minutes', 'hour', 'hours', 'ideal', 'optimal'],
    excludes: ['cardio', 'rest between', 'cut last', 'deload', 'break', 'plateau', 'results'],
    answer:
      "Forty five to seventy five minutes suits most people. Past that, quality usually drops before anything useful is added. A focused thirty minutes beats a distracted ninety.",
  },
  {
    id: 'gen.split_or_full_body',
    requires: [['full body', 'split', 'splits', 'push pull', 'upper lower', 'bro split', 'ppl']],
    covers: ['should i', 'better', 'best', 'or', 'which', 'do', 'routine', 'program', 'vs'],
    // ⚠️ Saving/loading a routine or program is an APP question in the other library.
    excludes: ['save', 'load', 'create', 'build a', 'library', 'template', 'how do i make'],
    answer:
      "Full body works well at two or three days a week, and splits make more sense at four or more. Neither is better on its own. The one that fits your week is the one that works.",
  },
  {
    id: 'gen.deload',
    requires: [['deload', 'de load', 'lighter week', 'back off week']],
    covers: ['what is', 'whats', 'mean', 'need', 'should i', 'how often', 'when', 'take'],
    answer:
      "A deliberately lighter week, usually less weight or fewer sets, taken to let fatigue clear. Every six to eight weeks of hard training is a common rhythm, though plenty of people take one when they feel they need it rather than on a schedule. Progress often resumes right after.",
  },
  {
    id: 'gen.warm_up',
    requires: [['warm up', 'warmup', 'warm-up', 'warming up']],
    covers: ['need', 'should i', 'do i', 'how long', 'important', 'necessary', 'skip', 'what', 'how'],
    excludes: ['stretch', 'stretching', 'cool down', 'sauna'],
    answer:
      "Yes, and it does not need to be long. Five to ten minutes of light movement plus a couple of lighter sets of your first lift is enough for most people. The point is raising temperature and rehearsing the movement, not tiring yourself out.",
  },
  {
    id: 'gen.stretching',
    requires: [['stretch', 'stretching', 'mobility', 'flexibility']],
    covers: ['need', 'should i', 'do i', 'before', 'after', 'important', 'necessary', 'skip', 'how long',
             'static', 'dynamic'],
    excludes: ['warm up', 'warmup', 'foam roll', 'massage'],
    answer:
      "Static stretching before lifting is not required and can slightly reduce strength in the session. Save it for afterward or for its own time, and use dynamic movement to warm up instead. Mobility work is worth doing if something is actually limiting your positions.",
  },
  {
    id: 'gen.train_when_sore',
    requires: [['sore', 'soreness', 'doms', 'aching'],
               ['train', 'training', 'workout', 'work out', 'lift', 'gym', 'exercise', 'still']],
    covers: ['should i', 'can i', 'okay', 'ok', 'safe', 'through', 'rest'],
    // ⚠️ "Why am I sore" and "is soreness necessary" are SEPARATE answers in SLEEP AND RECOVERY. This one
    // is specifically about whether to TRAIN on top of it.
    excludes: ['why am i', 'why do i', 'what does', 'mean', 'necessary', 'good workout', 'normal'],
    answer:
      "Mild soreness is fine to train through, and movement often helps it. Sharp pain, joint pain, or soreness that has not eased in several days is different, and that is worth backing off and getting looked at. Soreness is not a scoreboard.",
  },
  {
    id: 'gen.missed_workout',
    requires: [['miss a workout', 'missed a workout', 'skipped a workout', 'miss a session',
                'missed the gym', 'skip a day', 'missed a day', 'make it up']],
    covers: ['what if', 'does it matter', 'should i', 'bad', 'okay', 'ok', 'double'],
    excludes: ['fall off', 'week off', 'long break', 'forgot to log'],
    answer:
      "Nothing happens. One session does not undo anything, and trying to make it up by doubling the next one usually costs more than it recovers. Pick up where the plan was and carry on.",
  },
];

export const GENERAL_ANSWERS: CannedAnswer[] = [
  ...NUTRITION_CORE,
  ...NUTRITION_REST,
  ...TRAINING,
];
