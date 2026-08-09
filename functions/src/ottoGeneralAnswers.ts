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

// ─────────────────────────────────────────────────────────────────────────────
// SLEEP AND RECOVERY
// ⚠️ 'sleep' appears in seven of these. The `excludes` between them are the whole game.
// ─────────────────────────────────────────────────────────────────────────────
const SLEEP_RECOVERY: CannedAnswer[] = [
  {
    id: 'gen.sleep_amount',
    requires: [['sleep', 'sleeping'], ['how much', 'how many', 'hours', 'need', 'enough', 'should i get',
                                       'do i need', 'recommended', 'minimum']],
    covers: ['a night', 'per night', 'night', 'get', 'adults', 'optimal'],
    // ⚠️ Every one of these is a different sleep answer below, or the app's own sleep screens.
    excludes: ['quality', 'deep', 'rem', 'stage', 'schedule', 'consistent', 'nap', 'screen',
               'why', 'matter', 'score', 'hub', 'track', 'log', 'goal'],
    answer:
      "Seven to nine hours for most adults. Training hard pushes you toward the upper end rather than letting you get away with less. Consistently under six is where performance, appetite control and recovery start to slide together.",
  },
  {
    id: 'gen.sleep_matters',
    requires: [['sleep'], ['why', 'matter', 'matters', 'important', 'affect', 'affects', 'impact',
                           'recovery', 'results', 'gains', 'muscle']],
    covers: ['does', 'so', 'much', 'training', 'performance'],
    excludes: ['how much', 'how many', 'hours', 'quality', 'deep', 'rem', 'stage', 'nap', 'screen',
               'schedule', 'score', 'track', 'log', 'hub'],
    answer:
      "Most of your recovery happens while you sleep, and short sleep raises appetite while lowering your willingness to train hard. It is the cheapest performance change available and the one people trade away first.",
  },
  {
    id: 'gen.hrv',
    requires: [['hrv', 'heart rate variability']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'good', 'high', 'low', 'normal', 'number'],
    // ⚠️ The app's Recovery screen and its own HRV reading are app questions in the other library.
    excludes: ['my hrv', 'recovery score', 'where', 'card', 'hub', 'chart', 'graph'],
    answer:
      "Heart rate variability, the variation in time between heartbeats. Higher generally means your nervous system is in a recovered state, lower means it is under load, whether from training, stress, illness or alcohol. The absolute number matters far less than your own trend, since it varies enormously between people.",
  },
  {
    id: 'gen.soreness_meaning',
    // 🔴 MERGED FROM TWO SPEC ENTRIES ("is soreness necessary" + "what does soreness mean"). Reading them
    // side by side while writing triggers, both answers said the same thing: soreness tracks novelty and is
    // not required for progress. The house rule is explicit that two near-identical entries is exactly how
    // the wrong one of hundreds gets returned, so they are one answer. Library count 141 -> 140.
    requires: [['sore', 'soreness', 'doms', 'aching', 'ache']],
    covers: ['why', 'what does', 'mean', 'means', 'necessary', 'need', 'have to', 'good workout',
             'normal', 'so', 'am i', 'is it', 'supposed to', 'sign', 'progress', 'days'],
    // ⚠️ "Should I TRAIN while sore" is a different question with its own answer.
    excludes: ['train', 'training', 'workout while', 'work out while', 'lift while', 'gym while',
               'should i still', 'can i still'],
    answer:
      "Usually it just means you did something new, or more of something than usual, which is why an unfamiliar exercise wrecks you and a familiar one does not. It is not a measure of how good the workout was and it is not required for progress. Pain in a joint, or soreness lasting well beyond a few days, is a different thing and worth getting looked at.",
  },
  {
    id: 'gen.overtraining',
    requires: [['overtraining', 'overtrained', 'overreaching', 'training too much', 'doing too much',
                'burnt out from training', 'burning out']],
    covers: ['what is', 'whats', 'mean', 'signs', 'sign', 'how do i know', 'am i', 'symptoms'],
    excludes: ['tracking', 'logging', 'burnout from logging'],
    answer:
      "Doing more than you are recovering from, for long enough that performance drops rather than improves. Signs include stalled or falling numbers, poor sleep, low motivation and an elevated resting heart rate. True overtraining is rarer than people think. Under-recovering for a stretch is common.",
  },
  {
    id: 'gen.rest_day_activity',
    requires: [['rest day', 'rest days', 'day off', 'days off', 'active recovery'],
               ['what should i do', 'what do i do', 'what to do', 'active', 'anything', 'walk', 'move',
                'movement', 'nothing', 'okay to', 'can i']],
    covers: ['on a', 'on my', 'still', 'light', 'stretch'],
    excludes: ['how many', 'how often', 'need'],
    answer:
      "Move gently rather than doing nothing. Walking, easy cycling, mobility work. It helps blood flow without adding fatigue. A full day of stillness is fine too if that is what you need.",
  },
  {
    id: 'gen.naps',
    requires: [['nap', 'naps', 'napping']],
    covers: ['should i', 'good', 'bad', 'how long', 'okay', 'ok', 'help', 'affect', 'ruin', 'length'],
    answer:
      "A twenty to thirty minute nap helps if you are short on sleep, and it will not usually affect that night if it is early enough in the day. Longer naps leave most people groggy and can push bedtime later.",
  },
  {
    id: 'gen.sleep_quality',
    requires: [['sleep'], ['quality', 'broken', 'interrupted', 'restless', 'waking up', 'wake up',
                           'deep enough', 'poor']],
    covers: ['vs', 'versus', 'or', 'quantity', 'hours', 'better', 'matter', 'more important'],
    excludes: ['rem', 'stage', 'nap', 'screen', 'schedule', 'score', 'track', 'log', 'hub', 'what is deep'],
    answer:
      "Both matter and they are not interchangeable. Eight broken hours does not do what eight solid ones do. Quantity is the easier one to fix first, since it is a scheduling decision rather than a physiological one.",
  },
  {
    id: 'gen.deep_sleep',
    requires: [['deep sleep', 'slow wave']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'how much', 'enough', 'important', 'why',
             'percentage', 'good'],
    excludes: ['rem', 'my deep sleep', 'chart', 'graph', 'card', 'hub'],
    answer:
      "The stage where physical recovery is concentrated: tissue repair, growth hormone release, immune work. It is front loaded into the first half of the night, which is part of why going to bed late and sleeping in does not fully substitute.",
  },
  {
    id: 'gen.rem_sleep',
    requires: [['rem', 'rem sleep', 'dream sleep']],
    covers: ['what is', 'whats', 'mean', 'means', 'explain', 'how much', 'enough', 'important', 'why',
             'percentage', 'good'],
    excludes: ['deep sleep', 'my rem', 'chart', 'graph', 'card', 'hub'],
    answer:
      "The stage most associated with dreaming, memory consolidation and mental recovery. It is weighted toward the second half of the night, so cutting sleep short in the morning takes REM disproportionately.",
  },
  {
    id: 'gen.screens_before_bed',
    requires: [['screen', 'screens', 'phone before bed', 'blue light', 'tv before bed', 'scrolling']],
    covers: ['before bed', 'at night', 'bad', 'affect', 'sleep', 'should i', 'avoid', 'matter'],
    answer:
      "The bigger issue is usually what you are doing on the screen rather than the light itself. Anything stimulating keeps you alert past the point you wanted to be asleep. If you are going to use one, dull content beats an argument or a game.",
  },
  {
    id: 'gen.sleep_schedule',
    requires: [['sleep schedule', 'same time every', 'consistent sleep', 'bedtime', 'sleep routine',
                'go to bed at']],
    covers: ['matter', 'important', 'should i', 'consistent', 'regular', 'weekend', 'affect'],
    excludes: ['how much', 'hours', 'nap', 'screen'],
    answer:
      "Yes, and often more than the total. Going to bed and getting up at similar times keeps the rhythm your body schedules everything else around. A wildly different weekend is a common reason Monday feels awful.",
  },
  {
    id: 'gen.stress',
    requires: [['stress', 'stressed', 'stressful', 'anxiety at work', 'work is crazy']],
    covers: ['affect', 'affects', 'results', 'progress', 'recovery', 'training', 'matter', 'impact',
             'why', 'harder'],
    excludes: ['stress fracture'],
    answer:
      "Stress and training draw on the same recovery budget. A hard period at work makes the same program feel heavier and progress slower, which is information rather than failure. Backing off during a stressful stretch usually costs less than pushing through.",
  },
  {
    id: 'gen.sauna_cold',
    requires: [['sauna', 'cold plunge', 'ice bath', 'cold water', 'cryotherapy', 'contrast therapy',
                'cold shower']],
    covers: ['worth', 'work', 'good', 'help', 'recovery', 'should i', 'benefit', 'after', 'before'],
    answer:
      "Both have some evidence behind them, mostly modest. Sauna use has reasonable support for cardiovascular health and recovery. Cold immediately after lifting may slightly blunt muscle growth, so if you use it, putting some distance between the session and the plunge is the common advice.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHT AND PROGRESS
// 🔴 THE HARDEST CATEGORY FOR COLLISIONS. 'weight' appears in most of them and also in half the APP
// library (log a weight, weight goal, weight history). Every entry below carries app-side excludes.
// ⚠️ Also the heaviest Mindful load, which is expected: this is the category the mode exists for.
// ─────────────────────────────────────────────────────────────────────────────
const WEIGHT_PROGRESS: CannedAnswer[] = [
  {
    id: 'gen.rate_of_loss',
    requires: [['lose', 'losing', 'loss', 'drop'], ['how fast', 'how quickly', 'how long', 'per week',
                                                    'a week', 'rate', 'realistic', 'safe', 'healthy']],
    covers: ['weight', 'fat', 'pounds', 'lbs', 'kg', 'should i', 'expect', 'week'],
    excludes: ['gain', 'muscle', 'log', 'record', 'goal weight', 'plateau', 'results', 'see results'],
    // ⚠️ MINDFUL: "should" becomes "most people find", direct address softened. The real range still lands.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Around half a percent to one percent of bodyweight a week is the range most people find workable, roughly one to two pounds for many. Faster than that and more of what comes off tends to be muscle, and it is generally harder to hold onto."
        : "Around half a percent to one percent of your bodyweight a week is the usual range. For most people that is roughly one to two pounds. Faster than that and more of what you lose tends to come from muscle, and it gets harder to hold.",
  },
  {
    id: 'gen.weigh_frequency',
    requires: [['weigh myself', 'weigh in', 'weighing myself', 'step on the scale', 'weigh-in',
                'how often should i weigh']],
    covers: ['how often', 'daily', 'every day', 'weekly', 'should i', 'when', 'morning', 'best time'],
    excludes: ['weigh my food', 'raw', 'cooked', 'log', 'record', 'history', 'more after'],
    // ⚠️ MINDFUL: opens the door to not weighing at all, which the standard version does not.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "There is no requirement to weigh at all. If you do, daily readings are most useful as a weekly average rather than as individual numbers, since the day to day movement is mostly water. Weekly works just as well, and some people are better off not tracking it."
        : "Daily works well if you treat it as data rather than a verdict, because it lets you watch the weekly average instead of reacting to one number. Weekly is fine too. The trap is weighing daily and taking each reading personally.",
  },
  {
    id: 'gen.weight_fluctuation',
    requires: [['weight'], ['bounce', 'bouncing', 'fluctuate', 'fluctuation', 'jump', 'jumped', 'up and down',
                            'swing', 'went up overnight', 'change day to day', 'vary']],
    covers: ['why', 'does', 'my', 'daily', 'overnight', 'normal', 'so much'],
    excludes: ['after a workout', 'weekend', 'water weight', 'log', 'goal', 'history', 'chart'],
    answer:
      "Food volume, sodium, carbs, hydration, hormones and when you last used the bathroom. Two to four pounds of swing in a day is normal and has nothing to do with fat. The trend across weeks is the only part worth reading.",
  },
  {
    id: 'gen.time_to_results',
    requires: [['see results', 'notice results', 'how long until', 'how long before', 'see changes',
                'notice a difference', 'see a difference', 'start seeing']],
    covers: ['how long', 'when', 'takes', 'weeks', 'months', 'expect', 'progress'],
    excludes: ['plateau', 'stall', 'cut last', 'workout be'],
    answer:
      "You will usually feel changes before you see them. Strength and energy tend to move in two to four weeks, visible changes closer to eight to twelve, and other people noticing later still. Most people quit somewhere in the gap between feeling it and seeing it.",
  },
  {
    id: 'gen.plateau',
    // 🔴 MERGED FROM TWO SPEC ENTRIES ("what is a plateau" + "what do I do about a plateau"). Their triggers
    // are nearly identical and anyone asking what one IS wants to know what to DO about it. Splitting them
    // is the exact near-duplicate the house rule warns about. Library count 140 -> 139.
    requires: [['plateau', 'plateaued', 'stalled', 'stall', 'stopped losing', 'not losing', 'stuck',
                'scale is not moving', 'scale isnt moving', 'no progress']],
    covers: ['what is', 'whats', 'mean', 'what do i do', 'how do i', 'break', 'fix', 'why', 'weeks'],
    excludes: ['clothes', 'fit better', 'measurements', 'photos', 'muscle at the same time'],
    // ⚠️ MINDFUL: "worth a look rather than a reaction" instead of prescribing an adjustment.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "A stretch where the number stops moving despite doing what you were doing, and three or four weeks of no change in the weekly average is the usual threshold since anything shorter is normal noise. A month without movement is worth a look rather than a reaction. Intake often drifts upward without anyone noticing, so that is the first thing to check."
        : "A stretch where the number stops moving despite doing what you were doing, and three or four weeks of no change in the weekly average is the usual threshold since anything shorter is normal noise. Check whether intake has crept up first, because it usually has. If your logging is honest and it has stalled for a month, a small adjustment to intake or activity is the next step, not a dramatic one.",
  },
  {
    id: 'gen.recomp',
    // 🔴 MERGED FROM TWO SPEC ENTRIES ("can I lose fat and build muscle at once" + "body recomposition").
    // One is the question and the other is its name; the two answers said the same thing.  139 -> 138.
    requires: [['recomp', 'recomposition', 'body composition',
                'lose fat and build muscle', 'lose fat and gain muscle', 'build muscle and lose fat',
                'gain muscle and lose fat', 'both at the same time', 'at the same time']],
    covers: ['can i', 'is it possible', 'what is', 'whats', 'mean', 'how', 'does it work', 'muscle', 'fat'],
    excludes: ['clothes', 'fit better', 'bulk or cut', 'which first'],
    answer:
      "Yes, though usually slowly, and best in specific situations: new to training, returning after a break, or carrying more body fat. Protein and resistance training are what make it possible. If you have trained consistently for years and are lean, progress in both directions at once is very slow.",
  },
  {
    id: 'gen.scale_vs_clothes',
    requires: [['clothes fit', 'clothes are looser', 'clothes feel', 'look different but', 'fit better'],
    ],
    covers: ['scale', 'weight', 'not moving', 'same', 'but', 'why', 'is not', 'isnt'],
    answer:
      "That is usually recomposition: losing fat and gaining muscle at a similar rate, so the number holds while your shape changes. It is a good outcome that the scale is bad at reporting. Photos and measurements catch it where weight does not.",
  },
  {
    id: 'gen.measurements',
    requires: [['measurements', 'measuring tape', 'tape measure', 'waist measurement', 'measure my waist']],
    covers: ['vs', 'versus', 'or', 'scale', 'better', 'should i', 'take', 'track', 'useful', 'why'],
    excludes: ['log', 'where do i', 'body measurements screen', 'photos'],
    answer:
      "They answer different questions. Weight is easy and noisy, measurements are slower to move and better at capturing shape. Waist is the single most useful one to track alongside weight.",
  },
  {
    id: 'gen.progress_photos',
    requires: [['progress photo', 'progress photos', 'before and after photo', 'take photos', 'pictures of myself']],
    covers: ['should i', 'how often', 'worth', 'useful', 'why', 'when', 'take'],
    excludes: ['log', 'where do i', 'meal photo', 'food photo', 'profile photo'],
    answer:
      "The most honest record you have, because your mirror updates too gradually to notice. Same light, same spot, same time of day, every few weeks. Most people are surprised looking back.",
  },
  {
    id: 'gen.water_weight',
    requires: [['water weight', 'water retention', 'holding water', 'retaining water', 'bloated', 'bloating']],
    covers: ['what is', 'whats', 'why', 'mean', 'how much', 'lose', 'normal'],
    answer:
      "Shifts in fluid rather than fat. Carbs hold water, sodium holds water, and so does training soreness. A jump of several pounds overnight is water, since gaining a pound of fat takes a surplus of thousands of calories.",
  },
  {
    id: 'gen.weight_after_workout',
    requires: [['weigh more after', 'heavier after', 'gained weight after', 'weight up after'],
               ['workout', 'training', 'lifting', 'gym', 'exercise', 'session', 'run']],
    covers: ['why', 'do i', 'does', 'scale', 'normal'],
    answer:
      "Inflammation and fluid retention as your muscles repair, plus anything you drank. It is temporary, and it is a sign of the work happening rather than of anything going wrong.",
  },
  {
    id: 'gen.weekend_spike',
    requires: [['weekend'], ['weight', 'gain', 'gained', 'up', 'spike', 'damage', 'undo', 'ruin']],
    covers: ['why', 'does', 'my', 'after', 'monday', 'normal', 'so much'],
    excludes: ['schedule', 'sleep', 'train', 'workout'],
    answer:
      "Almost always food volume, sodium and carbs rather than fat gained. Two days of looser eating rarely creates real weight, but it holds water. It usually settles by midweek.",
  },
  {
    id: 'gen.goal_weight',
    requires: [['goal weight', 'target weight', 'ideal weight', 'what should i weigh', 'how much should i weigh']],
    covers: ['set', 'pick', 'choose', 'realistic', 'good', 'right', 'how do i', 'what is a'],
    // ⚠️ SETTING the goal weight in the app is a different question and lives in the other library.
    excludes: ['where do i', 'change my', 'edit', 'pace', 'projected', 'log'],
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "A weight you have lived at comfortably before is usually a better reference than a number picked from anywhere else. It is worth holding loosely too, since how you feel at a given weight varies a lot with how much muscle you carry, and the number on its own says less than people expect."
        : "Pick something you can hold, not just reach. A weight you have maintained before is a good anchor. It is worth holding loosely, since how you look and feel at a given weight varies a lot with how much muscle you carry.",
  },
  {
    id: 'gen.rate_of_gain',
    requires: [['gain', 'gaining', 'bulk', 'bulking'], ['how fast', 'how quickly', 'rate', 'per week',
                                                        'a week', 'realistic', 'healthy', 'should i']],
    covers: ['weight', 'muscle', 'pounds', 'lbs', 'kg', 'expect', 'week'],
    excludes: ['lose', 'fat loss', 'how much should i eat', 'calories', 'or cut', 'first'],
    answer:
      "Around a quarter to half a pound a week for most people. Faster tends to add fat rather than more muscle, since muscle cannot be built that quickly. Newer trainees can sit at the upper end.",
  },
  {
    id: 'gen.bmi',
    requires: [['bmi', 'body mass index']],
    covers: ['what is', 'whats', 'useful', 'accurate', 'good', 'mean', 'means', 'should i', 'matter', 'my'],
    answer:
      "Useful across populations, weak for individuals. It knows your height and weight and nothing else, so it reads a muscular person as overweight. Treat it as a rough screen rather than a judgment.",
  },
  {
    id: 'gen.body_fat_pct',
    requires: [['body fat', 'bodyfat', 'body fat percentage', 'bf percentage']],
    covers: ['what is', 'whats', 'measure', 'accurate', 'good', 'healthy', 'should i', 'track', 'scale',
             'calipers', 'dexa', 'how do i'],
    excludes: ['how much fat should', 'dietary fat', 'burner', 'belly', 'target'],
    answer:
      "A better measure than weight for what most people actually want, but hard to measure accurately. Scales and consumer devices are inconsistent, so the trend from one method matters more than the number. Do not switch methods and compare across them.",
  },
];

export const GENERAL_ANSWERS: CannedAnswer[] = [
  ...NUTRITION_CORE,
  ...NUTRITION_REST,
  ...TRAINING,
  ...SLEEP_RECOVERY,
  ...WEIGHT_PROGRESS,
];
