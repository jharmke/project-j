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
//  E. 🔴 LIST BOTH WORD FORMS IN `covers`: eat AND eating, lift AND lifting, run AND running. There is no
//     stemmer. This caused three separate `unexplained-remainder` misses in a row while building
//     ("what shoes should i wear to LIFT" had only 'lifting'; "is it bad to EAT carbs at night" had only
//     'eating'). ⚠️ The failure is invisible from the answer text: the entry looks complete and simply
//     never fires on half the phrasings. Same family as the "ordinary filler" misses in PLAN 4.8.
//  F. Time and unit tokens are content words to this matcher, not filler: '6pm', 'oz', 'lbs', 'grams' all
//     have to appear somewhere or the whole-message test fails on an otherwise perfect match.

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
    // ⚠️ MINDFUL BRANCH. "Higher end if you are in a deficit" and "leaving results on the table" are both
    // deficit framing and mild judgment. The number itself is unchanged, per the honest-numbers rule.
    answer: (c) =>
      c.styleMode === 'mindful'
        ? "Most people training regularly land somewhere around 0.7 to 1g per pound of bodyweight. It matters most when you are eating less than you burn, since protein is what protects muscle. Below about 0.5g per pound is where most people notice the difference."
        : "Most people training regularly land somewhere around 0.7 to 1g per pound of bodyweight. Higher end if you are in a deficit, since protein is what protects muscle while you lose. Below about 0.5g per pound is where most people start leaving results on the table.",
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
    excludes: ['how fast', 'how quick', 'how quickly', 'how soon', 'how rapidly', 'how long', 'per week',
               'a week', 'rate', 'realistic', 'goal weight', 'plateau', 'stall', 'build muscle',
               'at the same time', 'recomp', 'what is a', 'whats a', 'what does', 'define', 'mean',
               // ⚠️ DIET-CHOICE QUESTIONS BELONG TO `gen.best_diet`. "whats the best diet for fat loss"
               // was landing here, which answers a question they did not ask.
               'best diet', 'which diet', 'what diet', 'keto', 'paleo', 'vegan', 'carnivore', 'fasting'],
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
    // ⚠️ ALL THE SPEED FORMS. 'how quickly' was listed and 'how quick' was not, so "how QUICK can i lose
    // weight" fell through to the how-much-to-eat answer and returned the WRONG answer, not just a miss.
    // ⚠️ Made worse by 'quick' being a stopword: the coverage test stopped seeing it as a signal at all.
    // Rule E again, and this time it cost accuracy rather than coverage.
    requires: [['lose', 'losing', 'loss', 'drop'], ['how fast', 'how quick', 'how quickly', 'how soon',
                                                    'how rapidly', 'how long', 'per week', 'a week',
                                                    'rate', 'realistic', 'safe', 'healthy']],
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

// ─────────────────────────────────────────────────────────────────────────────
// MYTHS
// ✅ The highest-value entries after SAFETY: these are the questions where a confidently wrong answer
// actively harms someone, and they all have settled answers that never go stale.
// ─────────────────────────────────────────────────────────────────────────────
const MYTHS: CannedAnswer[] = [
  {
    id: 'gen.spot_reduction',
    requires: [['belly fat', 'spot reduce', 'spot reduction', 'target fat', 'lose fat from', 'tone my stomach',
                'flatten my stomach', 'love handles', 'stubborn area', 'stubborn fat', 'arm fat', 'thigh fat']],
    covers: ['how do i', 'can i', 'exercise', 'workout', 'ab', 'abs', 'crunches', 'burn', 'target', 'get rid of'],
    answer:
      "No. Spot reduction is not a thing, and no exercise burns fat from the area it works. Fat comes off in the order your body decides, which is largely genetic, and the stomach is often last. Core work builds the muscle underneath, it does not uncover it.",
  },
  {
    id: 'gen.muscle_to_fat',
    requires: [['turn to fat', 'turns to fat', 'turn into fat', 'becomes fat', 'muscle turns']],
    covers: ['does', 'will', 'my', 'muscle', 'stop', 'quit', 'if i'],
    answer:
      "No. They are different tissues and neither converts into the other. What happens when people stop training is that muscle shrinks from disuse while activity and appetite stay the same, so fat increases at the same time. Two things happening at once, not one becoming the other.",
  },
  {
    id: 'gen.starvation_mode',
    requires: [['starvation mode', 'metabolism is broken', 'broken metabolism', 'damaged my metabolism',
                'metabolic damage', 'body holding on', 'holding onto fat']],
    covers: ['is', 'real', 'am i in', 'what is', 'does', 'exist', 'eating too little', 'not eating enough'],
    answer:
      "Not in the way it is usually described. Your body does not hold onto fat because you ate too little. What does happen is that prolonged dieting lowers your burn somewhat, through less spontaneous movement and a smaller body to carry. That is real but modest, and it does not stop weight loss.",
  },
  {
    id: 'gen.carbs_at_night',
    requires: [['carb', 'carbs', 'carbohydrate'], ['after 6', 'after 7', 'after 8', 'at night', 'before bed',
                                                   'late', 'evening', 'nighttime']],
    // ⚠️ THE CLOCK TOKENS ARE LOAD-BEARING. "Are carbs after 6PM bad" failed the whole-message test purely
    // because "6pm" was listed nowhere, which reads as a rules failure and is really a vocabulary gap.
    covers: ['bad', 'are', 'is it', 'okay', 'ok', 'fat', 'store', 'avoid', 'should i', 'after', 'pm',
             '6pm', '7pm', '8pm', '9pm', '10pm', 'evening', 'night', 'bed', 'eat', 'eating'],
    answer:
      "No. Your body does not check the clock. Total intake across the day is what matters. Evening carbs get blamed because evening is when unplanned eating usually happens.",
  },
  {
    id: 'gen.sweating',
    requires: [['sweat', 'sweating', 'sweat more', 'sweaty']],
    covers: ['burn', 'burning', 'fat', 'mean', 'means', 'more', 'harder', 'good', 'workout', 'sauna suit',
             'does', 'is'],
    excludes: ['sauna', 'cold plunge', 'hydrat', 'water'],
    answer:
      "No. Sweat is temperature regulation, not a measure of effort or fat loss. A hot room makes you sweat more without burning more. Any weight lost during a sweaty session is water and returns when you drink.",
  },
  {
    id: 'gen.detox',
    requires: [['detox', 'cleanse', 'juice cleanse', 'flush out', 'reset my body']],
    covers: ['work', 'works', 'worth', 'should i', 'do', 'good', 'need', 'help'],
    answer:
      "Not for what they claim. Your liver and kidneys handle that continuously and do not need help from a juice. People often feel better on one because they stopped eating badly for a few days, which is the actual change.",
  },
  {
    id: 'gen.fat_burners',
    requires: [['fat burner', 'fat burners', 'waist trainer', 'sweat belt', 'diet pill', 'diet pills',
                'skinny tea', 'weight loss pill']],
    covers: ['work', 'works', 'worth', 'should i', 'good', 'safe', 'help', 'do'],
    answer:
      "Fat burners are mostly caffeine with a markup, and the effect is small enough that it will not decide anything. Waist trainers change your shape while worn and nothing after. Neither touches what actually drives fat loss.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GYM PRACTICALITIES
// ─────────────────────────────────────────────────────────────────────────────
const GYM: CannedAnswer[] = [
  {
    id: 'gen.bulky',
    requires: [['bulky', 'too big', 'too muscular', 'look manly', 'get huge', 'bulk up by accident']],
    covers: ['will', 'make me', 'lifting', 'weights', 'am i going to', 'worried', 'afraid'],
    excludes: ['bulking', 'surplus', 'how much should i eat'],
    answer:
      "No, and this is the most common worry in the gym. Building noticeable size takes years of deliberate training and eating for it, and it does not happen by accident. Lifting is what gives you shape while losing weight, rather than just ending up smaller.",
  },
  {
    id: 'gen.what_to_wear',
    requires: [['what should i wear', 'what to wear', 'gym clothes', 'clothes to the gym', 'outfit']],
    covers: ['wear', 'clothing', 'gym', 'workout'],
    excludes: ['shoes', 'trainers', 'sneakers', 'lifting shoes', 'fit better'],
    answer:
      "Whatever you can move in and are not thinking about. Comfort and being able to see your own form beat anything else.",
  },
  {
    id: 'gen.shoes',
    requires: [['shoes', 'sneakers', 'trainers', 'footwear', 'barefoot']],
    covers: ['what', 'which', 'best', 'lift', 'lifting', 'lifts', 'running', 'run', 'should i', 'wear',
             'flat', 'squat', 'gym', 'training', 'workout', 'deadlift'],
    answer:
      "For lifting, a flat and firm sole gives you a stable base. Running shoes are cushioned, which is what you want for running and works against you under a heavy bar. Anything flat works fine to start.",
  },
  {
    id: 'gen.equipment',
    requires: [['equipment', 'what do i need to start', 'dumbbells', 'home gym', 'gear', 'buy']],
    covers: ['need', 'start', 'starting', 'beginner', 'minimum', 'what', 'should i', 'worth', 'essential'],
    excludes: ['belt', 'straps', 'sleeves', 'spotter', 'shoes', 'app', 'watch'],
    answer:
      "Less than you think. A pair of adjustable dumbbells covers an enormous amount at home, and a gym membership covers the rest. Everything else stays optional for a long time.",
  },
  {
    id: 'gen.gym_anxiety',
    requires: [['intimidated', 'intimidating', 'nervous about the gym', 'scared of the gym', 'gym anxiety',
                'embarrassed', 'people watching', 'everyone is looking', 'self conscious']],
    covers: ['gym', 'feel', 'i am', 'im', 'how do i', 'get over', 'help'],
    answer:
      "Almost everyone is at first, and nearly nobody is watching. Going at a quieter hour helps, and so does turning up with a plan so you are not deciding what to do while standing there. It wears off faster than you expect.",
  },
  {
    id: 'gen.trainer',
    requires: [['personal trainer', 'a trainer', 'coach', 'hire someone', 'pt sessions']],
    covers: ['need', 'should i', 'worth', 'get', 'hire', 'help', 'good idea'],
    excludes: ['coaching mode', 'coaching style', 'my coach', 'smart tip'],
    answer:
      "A few sessions to learn the main lifts is money well spent for most beginners, more for the technique than the motivation. It is not required. If you go this route, a handful of focused sessions usually beats an open ended commitment.",
  },
  {
    id: 'gen.cardio_order',
    requires: [['cardio'], ['before or after', 'after or before', 'first', 'order', 'then weights',
                            'then lifting', 'before weights', 'after weights', 'before lifting', 'after lifting']],
    covers: ['should i', 'do', 'which', 'same session', 'better'],
    answer:
      "After, if you are lifting for strength or size, since cardio first leaves you with less to give the part that matters most. If cardio is your priority, flip it. Separate days beat either if your schedule allows.",
  },
  {
    id: 'gen.exercise_order',
    requires: [['what order', 'which order', 'order should i', 'order of exercises', 'compound first',
                'isolation first', 'order to do']],
    covers: ['exercises', 'lifts', 'workout', 'should i', 'does it matter', 'best'],
    excludes: ['cardio'],
    answer:
      "Hardest first, generally. Compound lifts while you are fresh, isolation work after. If one thing matters most to you right now, do that first regardless of what the usual order says.",
  },
  {
    id: 'gen.need_a_gym',
    requires: [['need a gym', 'without a gym', 'no gym', 'at home', 'home workouts', 'bodyweight only',
                'gym membership']],
    covers: ['do i', 'can i', 'work', 'enough', 'good', 'results', 'train'],
    excludes: ['equipment', 'dumbbells', 'what do i need to start'],
    answer:
      "No. Bodyweight training and a couple of dumbbells take most people a long way, especially in the first year. A gym gives you heavier loading and more variety, which starts to matter more as you progress.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NAMED DIETS. Finite by nature: there are perhaps ten famous ones, which is why they belong here while
// per-food rulings ("is white rice bad") never can.
// ─────────────────────────────────────────────────────────────────────────────
const DIETS: CannedAnswer[] = [
  {
    id: 'gen.keto',
    requires: [['keto', 'ketogenic', 'ketosis']],
    covers: ['what is', 'whats', 'work', 'works', 'worth', 'should i', 'good', 'try', 'diet', 'do',
             'better', 'effective', 'safe', 'bad'],
    answer:
      "Very low carb, high fat, enough to shift your body toward burning fat for fuel. It works for the people it suits, and the weight lost is the same weight lost on any deficit. The tradeoffs are that hard training often suffers without carbs, and it is socially restrictive, which is why adherence is the usual failure point rather than the science.",
  },
  {
    id: 'gen.paleo',
    requires: [['paleo', 'paleolithic', 'caveman diet']],
    covers: ['what is', 'whats', 'work', 'works', 'worth', 'should i', 'good', 'try', 'diet', 'do', 'better'],
    answer:
      "Built around foods available before agriculture: meat, fish, vegetables, fruit, nuts. No grains, legumes or dairy. The food quality tends to be good and people often eat less without trying. The historical reasoning behind it is shaky, though that does not stop it working for people who enjoy eating that way.",
  },
  {
    id: 'gen.plant_based',
    requires: [['vegan', 'vegetarian', 'plant based', 'plant-based', 'meatless', 'no meat']],
    covers: ['what is', 'work', 'works', 'can i', 'build muscle', 'protein', 'enough', 'should i', 'diet',
             'good', 'healthy', 'gains', 'get'],
    answer:
      "Both work fine for training and body composition. The thing to watch is protein, since plant sources are generally lower and less complete, so hitting a target takes more deliberate planning. Worth keeping an eye on B12, iron and omega 3 as well, and worth a conversation with a dietitian if you are going fully plant based.",
  },
  {
    id: 'gen.mediterranean',
    requires: [['mediterranean']],
    covers: ['what is', 'whats', 'work', 'works', 'worth', 'should i', 'good', 'try', 'diet', 'healthy',
             'best', 'evidence'],
    answer:
      "Vegetables, fish, olive oil, legumes, whole grains, not much processed food. It has the strongest long term health evidence of any named diet by a wide margin. It is less a weight loss protocol than a way of eating, which is probably why it lasts.",
  },
  {
    id: 'gen.carnivore',
    requires: [['carnivore', 'meat only', 'all meat diet', 'lion diet']],
    covers: ['what is', 'whats', 'work', 'works', 'worth', 'should i', 'good', 'try', 'diet', 'safe', 'healthy'],
    answer:
      "Animal foods only. The evidence base is thin and it eliminates entire food groups including all fiber. Some people report feeling well on it, largely because it is extremely restrictive and they end up eating less. Worth talking to a doctor before going down that road, especially long term.",
  },
  {
    id: 'gen.whole30',
    requires: [['whole30', 'whole 30', 'elimination diet']],
    covers: ['what is', 'whats', 'work', 'works', 'worth', 'should i', 'good', 'try', 'diet', 'do'],
    answer:
      "Thirty days without sugar, alcohol, grains, legumes and dairy, then a structured reintroduction. It is designed as an elimination protocol to spot what does not agree with you, not as a weight loss diet, though people usually lose some. The reintroduction is the part most people skip and the part that carries the value.",
  },
  {
    id: 'gen.low_carb',
    requires: [['low carb', 'low-carb', 'lowcarb', 'cutting carbs', 'cut carbs', 'no carb']],
    covers: ['work', 'works', 'worth', 'should i', 'good', 'better', 'diet', 'try', 'best', 'why'],
    excludes: ['keto', 'net carb', 'at night', 'after 6'],
    answer:
      "Works for plenty of people, mostly because cutting a whole category means eating less overall. Carbs are not causing weight gain by themselves. If you train hard, going very low tends to cost you in the gym before it gains you anything.",
  },
  {
    id: 'gen.best_diet',
    requires: [['best diet', 'which diet', 'what diet', 'diet is best', 'diet should i', 'right diet']],
    // ⚠️ A "which diet" question almost always names a GOAL ("best diet for fat loss"), so the goal words
    // have to be accounted for here or the whole-message test hands the question to the deficit answer.
    covers: ['for me', 'work', 'works', 'pick', 'choose', 'follow', 'good', 'better', 'compare',
             'fat loss', 'fat', 'loss', 'weight loss', 'lose weight', 'muscle', 'gain', 'health',
             'results', 'beginner'],
    answer:
      "The one you can stay on. Compared head to head over a year the named diets land in roughly the same place, because they all end up creating a deficit. Adherence is the variable that separates them, so pick by what fits your life rather than by the mechanism.",
  },
  {
    id: 'gen.need_a_diet',
    requires: [['need to diet', 'need a diet', 'have to diet', 'follow a diet', 'be on a diet', 'go on a diet']],
    covers: ['do i', 'should i', 'must i', 'without', 'just', 'instead'],
    excludes: ['best', 'which', 'what diet', 'break'],
    answer:
      "No. A named diet is a set of rules that makes eating less feel automatic, which helps some people and feels like a cage to others. Plenty of people do well tracking loosely and eating mostly whole food.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LABELS AND TRACKING (the general skill, not the app's own logging screens)
// ─────────────────────────────────────────────────────────────────────────────
const LABELS: CannedAnswer[] = [
  {
    id: 'gen.read_label',
    requires: [['nutrition label', 'food label', 'read a label', 'reading labels', 'nutrition facts',
                'the label', 'panel']],
    covers: ['how do i', 'read', 'reading', 'understand', 'what', 'look at', 'daily value', 'percent'],
    excludes: ['scan', 'barcode', 'accurate', 'serving size'],
    answer:
      "Check the serving size first, because everything else on the panel refers to it and it is often smaller than what you would actually eat. Then calories, then protein. The percent daily values are based on a 2,000 calorie diet, which may be nothing like your target.",
  },
  {
    id: 'gen.serving_size',
    requires: [['serving size', 'servings', 'a serving', 'portion size', 'per serving']],
    covers: ['what is', 'whats', 'mean', 'means', 'how', 'decide', 'chosen', 'realistic', 'why'],
    excludes: ['log', 'change the', 'edit', 'custom food', 'create'],
    answer:
      "The portion the manufacturer chose for the label, not a recommendation. It is often smaller than a realistic portion, so a package holding two and a half servings is easy to read as one.",
  },
  {
    id: 'gen.label_accuracy',
    requires: [['label'], ['accurate', 'accuracy', 'correct', 'right', 'trust', 'off by', 'wrong']],
    // ⚠️ Both number forms, per rule E in the header. "Are CALORIE labels accurate" missed on the singular.
    covers: ['calorie', 'calories', 'are', 'how', 'the', 'numbers', 'percent', 'labels', 'food'],
    answer:
      "Close but not exact. Regulations allow a margin, commonly cited at around twenty percent, and rounding rules let small amounts be listed as zero. Over a week it evens out for most people.",
  },
  {
    id: 'gen.tracking_accuracy',
    requires: [['tracking', 'counting', 'logging'], ['accurate', 'accuracy', 'correct', 'trust', 'off by',
                                                     'precise', 'exact', 'reliable']],
    covers: ['how', 'is', 'calorie', 'calories', 'my', 'really', 'does it matter', 'food', 'macros'],
    excludes: ['label', 'raw', 'cooked'],
    answer:
      "Usually within ten to twenty percent for someone tracking carefully, and further off than people think for someone eyeballing it. The value is not perfect precision, it is consistency: the same method over time shows you the trend even if the absolute number is a little off.",
  },
  {
    id: 'gen.raw_or_cooked',
    requires: [['raw or cooked', 'cooked or raw', 'before or after cooking', 'weigh it raw', 'weigh raw',
                'weigh cooked', 'dry or cooked']],
    covers: ['do i', 'should i', 'weigh', 'weighing', 'measure', 'log', 'food', 'meat', 'rice', 'pasta',
             'which', 'difference'],
    answer:
      "Raw is more consistent, since cooking changes water content and therefore weight. A hundred grams of raw chicken is not a hundred grams of cooked chicken. Pick one and stay with it, and make sure the entry you log matches which one you used.",
  },
  {
    id: 'gen.track_restaurant',
    requires: [['restaurant', 'eating out', 'takeout', 'take out', 'fast food', 'chain'],
               ['track', 'tracking', 'log', 'logging', 'estimate', 'count', 'guess', 'accurate']],
    covers: ['how do i', 'what', 'should i', 'food', 'meal', 'calories'],
    answer:
      "Use the chain's published numbers if they exist, and pick the closest generic entry if they do not. Restaurant portions and cooking fats both run higher than people estimate, so rounding up lands closer than rounding down.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DRINKS
// ─────────────────────────────────────────────────────────────────────────────
const DRINKS: CannedAnswer[] = [
  {
    id: 'gen.coffee',
    requires: [['coffee', 'caffeine', 'espresso']],
    covers: ['dehydrat', 'dehydrating', 'water', 'count', 'counts', 'bad', 'how much', 'too much', 'sleep',
             'affect', 'okay', 'ok', 'does', 'is'],
    excludes: ['energy drink', 'pre workout', 'creatine'],
    answer:
      "Not meaningfully. Caffeine has a mild diuretic effect but the fluid in the coffee more than covers it, so normal intake counts toward your water. Where coffee does matter is sleep, since caffeine has a long half life and an afternoon cup can still be in your system at bedtime.",
  },
  {
    id: 'gen.diet_soda',
    requires: [['diet soda', 'diet coke', 'zero sugar', 'artificial sweetener', 'sweeteners', 'aspartame',
                'sucralose', 'stevia']],
    covers: ['bad', 'okay', 'ok', 'safe', 'drink', 'affect', 'cravings', 'weight', 'should i', 'is', 'are'],
    answer:
      "Fine for most people, and a useful tool if it stops you drinking the sugared version. The claims that it drives weight gain have not held up well. If you notice it drives cravings for you personally, that is worth acting on, but it is not a general rule.",
  },
  {
    id: 'gen.sports_drinks',
    requires: [['sports drink', 'gatorade', 'powerade', 'electrolyte drink', 'electrolytes']],
    covers: ['need', 'do i', 'should i', 'worth', 'good', 'when', 'during', 'after', 'workout', 'water'],
    answer:
      "Built for sessions long or hot enough to lose real salt and fluid, roughly over an hour of hard work. For a normal gym session they are sugar you did not need. Water covers most training.",
  },
  {
    id: 'gen.energy_drinks',
    requires: [['energy drink', 'energy drinks', 'monster', 'red bull', 'celsius', 'pre workout', 'preworkout']],
    covers: ['bad', 'okay', 'ok', 'safe', 'need', 'should i', 'work', 'worth', 'how much', 'drink'],
    excludes: ['coffee', 'creatine', 'protein powder'],
    answer:
      "Mostly caffeine and sugar, or caffeine and sweetener in the zero versions. They work as a pre workout and carry the same sleep caveat as coffee. Worth knowing your total caffeine across the day rather than counting drinks.",
  },
  {
    id: 'gen.smoothies_juice',
    requires: [['smoothie', 'smoothies', 'juice', 'juicing', 'fruit juice']],
    covers: ['bad', 'good', 'healthy', 'okay', 'ok', 'should i', 'better', 'fiber', 'calories', 'filling',
             'is', 'are', 'drink'],
    excludes: ['cleanse', 'detox'],
    answer:
      "Both are easy to drink far more of than you would ever eat. Juice loses the fiber entirely, and a smoothie keeps it but still goes down fast, so neither fills you the way whole fruit would. They are not bad, they are just easy to underestimate.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSISTENCY AND MINDSET
// ⚠️ These are already observational in tone, so almost none need a Mindful branch. That is not an
// oversight: Mindful's rules govern deficit maths and weight-loss prescriptions, which these never touch.
// ─────────────────────────────────────────────────────────────────────────────
const CONSISTENCY: CannedAnswer[] = [
  {
    id: 'gen.stay_consistent',
    requires: [['consistent', 'consistency', 'stick to it', 'stick with it', 'stay on track', 'keep going',
                'keep it up', 'discipline myself']],
    covers: ['how do i', 'stay', 'be', 'more', 'help', 'struggle', 'cant', 'hard'],
    excludes: ['fall off', 'back on track', 'motivation vs', 'habit', 'burnout'],
    answer:
      "Make the standard low enough that a bad week still clears it. Most people set a plan for their best self, then miss it, and the miss feels like failure and ends the whole thing. A plan you can hit at your worst is worth more than one you can hit at your best.",
  },
  {
    id: 'gen.fell_off',
    requires: [['fell off', 'fallen off', 'fall off', 'week off', 'took a break', 'stopped for a week',
                'been slacking', 'gave up for', 'off the wagon']],
    covers: ['what if', 'i', 'ruined', 'undone', 'lost', 'progress', 'start over', 'restart', 'bad'],
    excludes: ['back on track', 'miss a workout', 'long break'],
    answer:
      "Nothing meaningful happened physically. A week does not undo months, and most of what comes back is water and habit rather than fat. The damage is almost always the story people tell themselves about it, not the week.",
  },
  {
    id: 'gen.build_habit',
    requires: [['habit', 'habits', 'routine going', 'make it stick', 'automatic']],
    covers: ['how do i', 'build', 'form', 'create', 'start', 'keep', 'new', 'stick', 'long'],
    excludes: ['workout routine', 'save a routine', 'program', 'sleep routine'],
    answer:
      "Attach it to something you already do reliably, and keep the first version small enough that skipping feels sillier than doing it. Consistency comes from lowering the friction, not from wanting it more.",
  },
  {
    id: 'gen.motivation',
    requires: [['motivation', 'motivated', 'discipline', 'willpower', 'lazy', 'cant be bothered']],
    covers: ['how do i', 'find', 'get', 'stay', 'lack', 'lacking', 'vs', 'versus', 'or', 'more', 'no',
             'have', 'got', 'zero', 'none', 'lost', 'losing', 'any'],
    excludes: ['coaching mode', 'discipline mode', 'style'],
    answer:
      "Motivation is what gets you started and it is not reliable. Discipline is really just a system: a set time, a plan you do not have to think about, and a standard low enough to hold on a bad day. When people say they lack discipline they usually lack a system.",
  },
  {
    id: 'gen.all_or_nothing',
    requires: [['all or nothing', 'ruined the day', 'ruined my day', 'blew it', 'blown it', 'wrote off',
                'might as well', 'screwed up today']],
    covers: ['thinking', 'i', 'feel', 'why', 'stop', 'help', 'so'],
    answer:
      "The most expensive habit in fitness. One off plan meal becomes a written off day, which becomes a written off week. Nothing about one meal requires the rest to follow it. The next choice is always available.",
  },
  {
    id: 'gen.back_on_track',
    requires: [['back on track', 'get back into it', 'get back to it', 'restart', 'start again',
                'start over', 'getting back']],
    covers: ['how do i', 'after', 'break', 'best way', 'again'],
    answer:
      "Do the next ordinary thing rather than something dramatic. People try to atone with a punishing week and it rarely survives contact with real life. Log the next meal, do the next session, and let the average pull itself back.",
  },
  {
    id: 'gen.tracking_burnout',
    requires: [['sick of tracking', 'tired of logging', 'hate logging', 'hate tracking', 'tracking burnout',
                'obsessed with tracking', 'chore', 'exhausting to log', 'burnt out on tracking']],
    covers: ['i am', 'im', 'feel', 'should i stop', 'quit', 'take a break', 'help'],
    answer:
      "Common, and worth taking seriously. If logging has become a chore you dread, loosening it beats quitting entirely: track protein and calories only, or track weekdays. The goal was awareness, not a perfect record.",
  },
  {
    id: 'gen.comparing',
    requires: [['comparing myself', 'compare myself', 'everyone else', 'other people are', 'social media',
                'instagram', 'someone else is']],
    covers: ['how do i stop', 'why', 'feel', 'better than me', 'faster', 'progress'],
    answer:
      "You are seeing their result and not their years, their genetics, or what it cost them. The only comparison with any information in it is against your own earlier self.",
  },
  {
    id: 'gen.set_a_goal',
    requires: [['set a goal', 'setting goals', 'what goal', 'goal should i set', 'good goal', 'realistic goal']],
    covers: ['how do i', 'pick', 'choose', 'what', 'kind of', 'type'],
    // ⚠️ Setting the app's own goals (calorie, water, step) is an APP question in the other library.
    excludes: ['calorie goal', 'water goal', 'step goal', 'sleep goal', 'macro goal', 'goal weight',
               'where do i', 'change my'],
    answer:
      "Pick something you control. You control sessions completed, meals logged, steps taken. You do not directly control the number on the scale, which moves on its own schedule. Outcome goals are fine to hold, but the ones you act on should be behaviors.",
  },
  {
    id: 'gen.slow_results',
    requires: [['slow progress', 'progress is slow', 'results are slow', 'going so slow', 'taking forever',
                'not fast enough', 'discouraged']],
    covers: ['why', 'is my', 'feel', 'normal', 'should i', 'change', 'wrong'],
    excludes: ['plateau', 'stalled', 'stuck', 'how long until'],
    answer:
      "Slow is what real progress looks like most of the time. Visible changes arrive in steps rather than smoothly, with long flat stretches between them. Check that the trend over a month is moving rather than judging by the week.",
  },
  {
    id: 'gen.track_forever',
    requires: [['track forever', 'log forever', 'count forever', 'rest of my life', 'always have to track',
                'do this forever']],
    covers: ['do i', 'have to', 'will i', 'need to', 'stop', 'ever'],
    answer:
      "No. Most people track closely for a while, learn what portions and meals actually look like, then loosen off. Coming back to it when things drift is a common pattern, and a reasonable one.",
  },
  {
    id: 'gen.social_pressure',
    requires: [['family', 'friends', 'my wife', 'my husband', 'my partner', 'social pressure',
                'people give me', 'party', 'holidays', 'thanksgiving', 'christmas']],
    covers: ['eat', 'eating', 'with', 'how do i', 'handle', 'deal', 'pressure', 'judge', 'awkward', 'meal'],
    excludes: ['restaurant', 'takeout', 'menu', 'track'],
    answer:
      "Decide before you go rather than at the table, and do not announce it. Most pressure comes from people feeling judged by your choices, which drops away when you make them quietly. One meal with people you love is not the problem.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INJURY PREVENTION (general, non-medical). Anything clinical belongs in SAFETY below.
// ─────────────────────────────────────────────────────────────────────────────
const INJURY: CannedAnswer[] = [
  {
    id: 'gen.avoid_injury',
    requires: [['avoid injury', 'prevent injury', 'get injured', 'getting hurt', 'injury prevention',
                'stay injury free', 'not get hurt']],
    covers: ['how do i', 'what', 'tips', 'safe', 'safely', 'lifting', 'training'],
    excludes: ['around an injury', 'already injured', 'my injury', 'joint pain', 'doctor'],
    answer:
      "Progress gradually, respect technique when you are tired, and warm up. Most gym injuries come from adding load faster than tissue adapts, or from chasing a number with form that has already broken down. Sleep and recovery matter here too, since fatigue is when technique slips.",
  },
  {
    id: 'gen.good_vs_bad_pain',
    requires: [['good pain', 'bad pain', 'normal pain', 'pain or soreness', 'soreness or pain',
                'difference between pain']],
    covers: ['what is', 'whats', 'the', 'tell', 'know', 'difference', 'vs', 'versus'],
    answer:
      "Muscle burn during a set and general soreness after are normal. Sharp pain, pain in a joint, pain that gets worse as you continue, or anything lingering well beyond a few days is not. That is a stop and get it looked at, not a push through.",
  },
  {
    id: 'gen.belt_straps',
    requires: [['lifting belt', 'a belt', 'straps', 'wrist wraps', 'knee sleeves', 'sleeves', 'gloves',
                'lifting gear']],
    covers: ['need', 'do i', 'should i', 'worth', 'when', 'use', 'help', 'good'],
    excludes: ['equipment to start', 'dumbbells', 'shoes'],
    answer:
      "None of them are required. A belt helps on heavy squats and deadlifts by giving your core something to brace against, straps help when your grip fails before the target muscle does, and sleeves are mostly comfort and warmth. All are tools for specific situations rather than things a beginner needs.",
  },
  {
    id: 'gen.spotter',
    requires: [['spotter', 'spot me', 'training alone', 'lifting alone', 'safety bars', 'get stuck under']],
    covers: ['need', 'do i', 'should i', 'when', 'bench', 'squat', 'safe', 'without'],
    answer:
      "For heavy barbell bench pressing, yes, or use safety bars in a rack. For most other lifts you can bail safely without one. If you train alone, staying a rep or two away from failure on anything that can pin you is the sensible habit.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// POPULATION
// ─────────────────────────────────────────────────────────────────────────────
const POPULATION: CannedAnswer[] = [
  {
    id: 'gen.menopause',
    requires: [['menopause', 'perimenopause', 'menopausal', 'hormonal changes']],
    covers: ['training', 'exercise', 'weight', 'harder', 'affect', 'affects', 'what', 'how', 'should i',
             'muscle', 'bone'],
    answer:
      "Hormonal changes through this period commonly affect body composition, recovery and sleep, and many people find the same effort produces different results than it used to. Resistance training and protein become more important rather than less, particularly for bone density and muscle. This is worth a conversation with a doctor who knows your history, since the individual picture varies a lot.",
  },
  {
    id: 'gen.age_recovery',
    requires: [['older', 'my age', 'getting older', 'over 40', 'over 50', 'over 60', 'too old', 'age']],
    covers: ['recovery', 'recover', 'slower', 'harder', 'start', 'train', 'still', 'can i', 'does', 'affect'],
    excludes: ['teenager', 'teen', 'kid', 'menopause'],
    answer:
      "Somewhat, though less than commonly assumed, and much of the difference tracks sleep, stress and training history rather than age itself. The practical change is usually needing a bit more warm up, a bit more recovery between hard sessions, and more attention to sleep. Training does not stop working.",
  },
  {
    id: 'gen.teenager',
    requires: [['teenager', 'teen', 'my son', 'my daughter', 'kid', 'child', '15 year old', '16 year old',
                'stunt growth', 'stunt their growth']],
    covers: ['lift', 'lifting', 'train', 'training', 'safe', 'okay', 'ok', 'should', 'weights', 'can'],
    answer:
      "Resistance training is safe for teenagers with proper technique and sensible loading, and the old idea that it stunts growth is not supported. Technique before weight matters even more at that stage. Worth getting proper coaching early rather than learning from videos.",
  },
  {
    id: 'gen.gluten_free',
    requires: [['gluten', 'gluten free', 'gluten-free', 'coeliac', 'celiac']],
    covers: ['healthier', 'better', 'should i', 'need', 'avoid', 'bad', 'is', 'cut out', 'why'],
    answer:
      "Not unless you have coeliac disease or a diagnosed sensitivity, in which case it is essential. For everyone else it removes nothing harmful, and gluten free versions of processed foods are often no better nutritionally. People sometimes feel better on it because they cut back on processed food at the same time.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GOAL SETTING
// ─────────────────────────────────────────────────────────────────────────────
const GOALS: CannedAnswer[] = [
  {
    id: 'gen.bulk_or_cut',
    requires: [['bulk or cut', 'cut or bulk', 'bulk first', 'cut first', 'which first', 'lose first',
                'gain first']],
    covers: ['should i', 'do i', 'what', 'order', 'start with', 'better'],
    answer:
      "If you are carrying enough body fat that you would want to lose some regardless, start there, since it is easier to build afterward and you will see the muscle you already have. If you are already lean and want size, build. Most people bounce between the two too quickly to get anywhere with either.",
  },
  {
    id: 'gen.cut_length',
    requires: [['how long should a cut', 'how long to cut', 'length of a cut', 'how long should i diet',
                'how long to diet', 'diet break']],
    covers: ['last', 'be', 'weeks', 'months', 'should i', 'take', 'when to stop', 'maintenance'],
    answer:
      "Eight to sixteen weeks is a common range, then a period at maintenance before deciding whether to continue. Very long deficits wear people down, and adherence usually breaks before the physiology does. Planning the end at the start makes it far easier to hold.",
  },
  {
    id: 'gen.switch_goals',
    requires: [['switch goals', 'change goals', 'change my goal', 'new goal', 'switch to', 'time to change']],
    covers: ['when', 'should i', 'how do i know', 'from', 'bored'],
    excludes: ['calorie goal', 'water goal', 'step goal', 'sleep goal', 'goal weight', 'where do i',
               'macro goal'],
    answer:
      "When you have reached the goal, when progress has stalled for a month with honest logging, or when your life has changed enough that the goal no longer fits. Switching because you are bored is the common one, and it is usually the wrong reason.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🔴 SAFETY. The highest-value entries in the library.
// ✅ Canning these IS the safeguard, not a limitation: the model is never called, so it cannot improvise
// medical advice on the topics where improvising is worst. The system prompt's medical guardrail does NOT
// reach a canned answer (rule B in the header), so the deferral is written by hand into every one.
// 🔴 CHEST PAIN HAS NO ENTRY, DELIBERATELY. See rule A. `utils/faithCrisis.ts` catches it client-side, and
// an answer here catching a phrasing IT misses would fire first and hand an emergency a calm reply.
// ─────────────────────────────────────────────────────────────────────────────
const SAFETY: CannedAnswer[] = [
  {
    id: 'gen.train_around_injury',
    requires: [['injury', 'injured', 'hurt my', 'pulled a', 'strained', 'torn', 'sprained', 'tweaked'],
               ['train', 'training', 'workout', 'work out', 'lift', 'exercise', 'around', 'still', 'with']],
    covers: ['can i', 'should i', 'how do i', 'safe', 'okay', 'ok', 'my', 'back', 'shoulder', 'knee'],
    excludes: ['avoid injury', 'prevent injury', 'injury free'],
    answer:
      "That one needs someone who can actually see it. Working around an injury is normal and often possible, but what is safe depends on what the injury is, and guessing at that from a chat is how a small problem becomes a long one. A physio or doctor can tell you what to avoid and what is fine, and that answer is worth having before you train through anything.",
  },
  {
    id: 'gen.see_a_doctor',
    requires: [['see a doctor', 'go to the doctor', 'need a doctor', 'worth seeing someone',
                'should i get checked', 'get it checked']],
    covers: ['do i', 'should i', 'when', 'about', 'worth it'],
    answer:
      "If you are asking, usually yes. That is not a dodge. The cost of a checked out worry is an appointment, and the cost of an unchecked one can be a great deal more. Anything persistent, worsening, or new and unexplained is worth a professional look.",
  },
  {
    id: 'gen.medical_condition',
    requires: [['diabetes', 'diabetic', 'thyroid', 'pcos', 'high blood pressure', 'heart condition',
                'medical condition', 'health condition', 'asthma', 'arthritis', 'ibs', 'crohns',
                'kidney', 'liver disease', 'cancer']],
    covers: ['can i', 'should i', 'safe', 'train', 'training', 'exercise', 'workout', 'eat', 'diet',
             'with', 'affect', 'okay', 'ok'],
    answer:
      "Exercise is beneficial for most conditions, and what is safe for you specifically is a medical question rather than a fitness one. Your doctor can tell you what to avoid and at what intensity, and many conditions have specific guidance worth having. Once you have that, we can work within it.",
  },
  {
    id: 'gen.medication',
    requires: [['medication', 'medicine', 'prescription', 'my meds', 'beta blocker', 'antidepressant',
                'blood thinner', 'statin', 'birth control']],
    covers: ['affect', 'affects', 'training', 'exercise', 'workout', 'safe', 'can i', 'should i', 'with',
             'while', 'heart rate'],
    excludes: ['supplement interact', 'creatine'],
    answer:
      "Some medications affect heart rate, blood pressure, hydration, temperature regulation or how you recover, which changes what training feels like and sometimes what is sensible. That is a question for your doctor or pharmacist, who knows what you are taking and why. Not something to work out by trial and error.",
  },
  {
    id: 'gen.pregnancy',
    requires: [['pregnant', 'pregnancy', 'expecting', 'postpartum', 'post partum', 'breastfeeding',
                'nursing', 'trying to conceive']],
    covers: ['can i', 'should i', 'safe', 'train', 'training', 'exercise', 'workout', 'lift', 'eat',
             'diet', 'calories', 'while'],
    answer:
      "Exercise during pregnancy is generally encouraged, and the specifics depend on your history, your stage and your own doctor's guidance. Recommendations have changed a lot and vary case by case, so this is one to take to the professional looking after you rather than to general advice.",
  },
  {
    id: 'gen.joint_pain',
    requires: [['joint pain', 'my knee hurts', 'my shoulder hurts', 'my back hurts', 'knees hurt',
                'elbow pain', 'hip pain', 'lower back pain', 'wrist pain']],
    // ⚠️ The exercise names are needed: "my knee hurts WHEN I SQUAT" left 'squat' unexplained and missed.
    covers: ['what', 'should i', 'do', 'train', 'training', 'through', 'why', 'normal', 'stop', 'rest',
             'hurt', 'hurts', 'hurting', 'pain', 'painful', 'knee', 'knees', 'shoulder', 'back', 'hip',
             'elbow', 'wrist', 'squat', 'squats', 'deadlift', 'bench', 'press', 'run', 'running',
             'lift', 'lifting', 'when'],
    // 🔴 CHEST AND BREATHING TERMS ARE EXCLUDED FROM EVERY SAFETY ANSWER. See rule A in the header.
    // ⚠️ Same safety list as the dizziness answer, and for the same reason: "breath" does not catch
    // "breathe". See the note there.
    excludes: ['chest', 'breath', 'breathe', 'breathing', 'breathless', 'winded', 'wheeze', 'wheezing',
               'gasping', 'gasp', 'dizzy', 'dizziness', 'lightheaded', 'faint', 'heart', 'palpitation',
               'palpitations', 'numb', 'tingling'],
    answer:
      "Joint pain is different from muscle soreness and is worth taking seriously rather than training through. Sometimes it is technique or load and sometimes it is not, and telling those apart needs someone who can watch you move. Back off the movement causing it and get it looked at, particularly if it persists past a week or two.",
  },
  {
    id: 'gen.supplement_interaction',
    requires: [['supplement'], ['medication', 'medicine', 'prescription', 'interact', 'interaction',
                                'my meds', 'safe with', 'mix with']],
    covers: ['can i', 'is it', 'take', 'taking', 'together', 'while', 'ask'],
    answer:
      "Real interactions exist and some are significant. A pharmacist is the right person to ask and will usually check for free, faster than a doctor's appointment. Worth doing before starting anything new rather than after.",
  },
  {
    id: 'gen.dizziness',
    requires: [['dizzy', 'dizziness', 'lightheaded', 'light headed', 'faint', 'fainted', 'vision went',
                'saw stars', 'nearly passed out']],
    covers: ['why', 'what', 'should i', 'do', 'during', 'after', 'training', 'workout', 'gym', 'normal',
             'stop', 'lift', 'lifting', 'lifts', 'exercise', 'run', 'running', 'stand', 'standing',
             'when', 'sometimes', 'get', 'feel', 'felt'],
    // 🔴 THE MOST IMPORTANT `excludes` IN THE LIBRARY. Dizziness WITH chest discomfort or breathing trouble
    // is not a fitness question. `faithCrisis.ts` catches the clear phrasings client-side, but if it misses
    // one, this answer must NOT be the thing that catches it: a calm "sit down and rest" reply to a cardiac
    // event is the worst failure this feature could produce. Unmatched, it falls through to the AI, which
    // carries the [[CRISIS]] instruction.
    // 🔴 EVERY FORM OF EVERY WORD, AND THIS LIST IS SAFETY CRITICAL. The matcher matches WHOLE WORDS, not
    // substrings, so "breath" did NOT catch **"i went dizzy and could not BREATHE properly"** and this
    // answer fired on it. A calm "sit down and rest" reply to someone describing a possible cardiac event
    // is the single worst thing this feature could do, and it was one missing letter away.
    // ⚠️ Rule E in the header exists for coverage; here the same omission costs safety. Add forms
    // generously and never trim this list.
    excludes: ['chest', 'breath', 'breathe', 'breathing', 'breathless', 'winded', 'wheeze', 'wheezing',
               'gasping', 'gasp', 'heart', 'palpitation', 'palpitations', 'racing', 'pounding',
               'arm', 'jaw', 'sweating cold', 'clammy', 'numb', 'tingling'],
    answer:
      "Stop when it happens, sit down, and do not push on through. Occasional lightheadedness from standing up quickly or training with very little food is common, but dizziness that is repeated, severe, or comes alongside anything else is a reason to get checked rather than to work around. If it comes with any chest discomfort or trouble breathing, treat that as urgent and get help immediately.",
  },
];

export const GENERAL_ANSWERS: CannedAnswer[] = [
  ...NUTRITION_CORE,
  ...NUTRITION_REST,
  ...TRAINING,
  ...SLEEP_RECOVERY,
  ...WEIGHT_PROGRESS,
  ...MYTHS,
  ...GYM,
  ...DIETS,
  ...LABELS,
  ...DRINKS,
  ...CONSISTENCY,
  ...INJURY,
  ...POPULATION,
  ...GOALS,
  ...SAFETY,
];
