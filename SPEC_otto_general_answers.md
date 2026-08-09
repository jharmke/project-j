# SPEC: Otto's general nutrition & fitness answer library

**Status: 141 ANSWERS DRAFTED AND APPROVED BY JUSTIN 2026-08-09. NOTHING BUILT.**
Ranking and status: `PLAN.md` 4.13. Supporter-pointed reply copy: `SPEC_otto.md`.
⚠️ These are the TEXT only. Trigger words, `excludes`, routes and Mindful branching are build-time work.

## WHY THIS EXISTS
Under PLAN 4.13 a free user's fitness question is answered from a pre-written library instead of a paid
AI call. Otto is ~84% of a free active user's AI bill and free users are ~93% of the total bill, so this
is the largest single lever left. Every answer here costs **zero**.

## 🔴 THE LINE JUSTIN DREW, AND IT IS THE WHOLE DESIGN
**General PRINCIPLES are IN** ("how much protein should I eat", "how many rest days").
**Per-food and per-exercise RULINGS are OUT** ("is white rice bad", "is quinoa better than farro").
➡️ Rulings are unbounded and would never be finished. Principles are a finite list with an end.

## 🔴 THREE OUTCOMES (full rule in `SPEC_otto.md`)
| the question | what Otto does |
|---|---|
| General ("how much protein should I eat") | **Answer it. NO PITCH.** |
| Their own data ("am I eating enough protein") | Answer generally, **then a pitch tail** |
| Uncovered | **Case B opener + closer** |

## 🔴 FOUR RULES THIS DRAFTING PASS PRODUCED. READ BEFORE ADDING ANY ANSWER.

**1. NOTHING IN THE CRISIS-ADJACENT SPACE GETS A CANNED ANSWER.**
`utils/faithCrisis.ts` has a MEDICAL category (`/\bchest pain\b/`, heart attack, stroke, seizure) that runs
**client-side, before the message reaches the server**, and shows the crisis card with a 911 button.
⚠️ **The danger is not the crisis path, it is the phrasings it MISSES.** "My chest hurts when I run" does
not match `\bchest pain\b`. Today that falls through to the AI, which carries the `[[CRISIS]]` instruction.
**A canned answer catching "chest hurts" would fire FIRST and hand a possible emergency a calm "see a
doctor sometime" reply.** ➡️ Chest pain deliberately has NO answer here. The dizziness answer must
`exclude` chest and breathing terms.

**2. THE SYSTEM PROMPT'S MEDICAL GUARDRAIL DOES NOT APPLY TO A CANNED ANSWER.**
`companionSystemPrompt.ts` instructs Otto to give general educational information, never prescriptive
personal advice, and to defer the personal decision to a professional. **A canned answer never touches the
model, so that rule is not enforced on it.** Every answer here is written to that standard by hand.
✅ Conversely, canning the 8 safety topics is the STRONGEST form of the guardrail: a pre-written "see a
professional" cannot be improvised away. That is the argument for including them, not against.

**3. NO NEW DISCLAIMER TEXT (Justin, 2026-08-09).** "Not medical advice" already appears in 25+ files
including Otto's own system prompt. Stapling it to 141 answers would read terribly. The standard is
carried in HOW the answers are written, not in a repeated footer.

**4. MERGE, NEVER NEAR-DUPLICATE.** Two similar entries is exactly how the wrong one of hundreds gets
returned (house rule, `ottoCannedAnswers.ts`).
- ❌ **"Does soreness mean a good workout" CUT** -- already answered twice in SLEEP AND RECOVERY.
- ❌ **"How do I track homemade food" CUT** -- `nav.recipe` already exists and is better ("Log tab, tap
  Library, then the plus, then Create Recipe"). ➡️ **Widen `nav.recipe`'s triggers** to catch "homemade",
  "from scratch", "my own meal" instead of writing a general answer.
- ❌ **"What if I forget to log something" CUT** -- an existing answer covers logging a past day.
  ➡️ **Widen its triggers** to catch "forgot to log".
- ➡️ **"Do I eat back exercise calories" BELONGS IN THE APP LIBRARY**, not here. It is written below for
  safekeeping but must move.

⚠️ **BANNED WORD THAT KEPT SLIPPING IN: "genuinely".** It is on the intensifier list in `SPEC_otto.md`.
Three instances were caught and removed during drafting. **Grep for it at merge time.**
✅ **7 answers need MINDFUL versions, marked 🟣 below. WRITTEN 2026-08-09, section at the bottom.**
🔴 An earlier "~25" here was a guess and was WRONG. The audit is in that section.

---

# THE ANSWERS

## NUTRITION -- core (12)

**How much protein should I eat**
> Most people training regularly land somewhere around 0.7 to 1g per pound of bodyweight. Higher end if you are in a deficit, since protein is what protects muscle while you lose. Below about 0.5g per pound is where most people start leaving results on the table.

**How much should I eat to lose weight** 🟣
> A deficit of roughly 300 to 500 calories a day is the range most people can hold without feeling wrecked. That usually works out to about half a pound to a pound a week. Bigger deficits work faster on paper and get abandoned more often.

**How much to gain muscle**
> A surplus of roughly 200 to 300 calories a day is enough for most people. Much more than that and you gain fat alongside the muscle without building it any faster. Slow is better here, even though it does not feel like it.

**What are macros**
> Protein, carbs and fat. They are the three things your calories are made of, and the split between them changes how you feel and what you keep while your weight moves. A common starting point is protein around 0.7 to 1g per pound, fat around 0.3g per pound, and carbs filling whatever is left.

**Are carbs bad**
> Carbs are not bad. They are your main fuel for hard training, and cutting them tends to hurt your sessions before it helps anything else. People often lose weight on low carb because they end up eating less overall, not because of the carbs themselves.

**How much fat**
> Around 0.3g per pound of bodyweight is a reasonable floor. Fat matters for hormones, so going very low for long stretches tends to backfire. Above that floor it is mostly preference, traded against carbs.

**How much fiber**
> Around 14g per 1,000 calories is the usual guideline, so most people land between 25 and 35g a day. Fiber does a lot of the work on fullness, which makes eating less feel easier. Increase it gradually if you are well under, since jumping straight there is uncomfortable.

**How much water**
> Around half an ounce to an ounce per pound of bodyweight a day is the common range, more if you sweat heavily or train in heat. Thirst and urine color are decent day to day guides. There is no prize for overdoing it.

**Do I have to count calories**
> No. Counting is the most direct way to know what you are actually eating, which is why it works, but it is not the only way. Plenty of people do fine on consistent portions and habits. The tradeoff is that when progress stalls you have less to look at.

**Does meal timing matter**
> Much less than total intake. Once your calories and protein are where you want them, timing is a small optimization rather than the thing that decides your results. Eating in a way you can repeat matters more than eating at the right hour.

**How many meals a day**
> Whatever you can hold to. Three, five or two all work if the totals line up. Some people find fewer, bigger meals easier and others get hungry and raid the kitchen, so it is worth finding your own answer rather than copying someone else's.

**Should I eat before or after a workout**
> Either works for most people. If you train hard and early, something small beforehand usually helps. What matters more is getting enough protein across the day rather than hitting a narrow window afterward.

## NUTRITION -- rest (14 general + 1 app-bound)

**Do I need protein powder**
> No, it is food, not magic. Powder is a convenient way to hit a protein target when whole food is inconvenient, and that is the whole of it. If you already hit your protein without it, you are not missing anything.

**Do I need creatine**
> Creatine is the most studied supplement in the space and one of the few with real evidence behind it. Around 3 to 5g a day is the usual dose, and timing does not matter. Whether you take it is a personal call, and worth running past a doctor or pharmacist if you take medication.

**Do I need supplements**
> Most people do not need much. Food covers the majority of it, and supplements fill specific gaps rather than replacing the basics. If you suspect a real deficiency, that is a blood test and a doctor, not a guess in a shop.

**How strict do I have to be**
> Consistency beats perfection by a wide margin. Most people do well eating in a way they can hold most of the time and not treating a single meal as a failure. If a rigid plan makes you swing between strict and blown out, that is a sign the plan is too rigid.

**Alcohol**
> Alcohol carries about 7 calories per gram and tends to come with food you would not otherwise eat. It also blunts recovery and sleep quality on the nights you drink. Plenty of people fit it in, they just account for it rather than pretending it is free.

**How do I handle eating out**
> Look at the menu before you go if you can, and pick the thing you would order anyway rather than the thing that sounds virtuous. Restaurant portions run large and cooking fats are underestimated, so logging a bit above your first instinct is usually closer. One meal does not decide a week.

**Does intermittent fasting work**
> Fasting works for the people it suits, and the reason is usually that a shorter eating window means eating less overall. There is nothing special happening beyond that for most people. If it makes eating easier for you, it is a fine tool. If it leaves you ravenous and prone to overeating later, it is not.

**Is eating late bad**
> Not by itself. A calorie at 9pm is the same as one at 9am. Late eating gets a bad name because it is often unplanned snacking on top of a full day rather than because of the hour.

**What is a calorie deficit** 🟣
> Eating fewer calories than you burn, so your body makes up the difference from stored energy. That is the mechanism behind weight loss regardless of which diet is wrapped around it.

**What is a surplus**
> Eating more calories than you burn, which is what gives your body the material to build with. A small one is enough. A large one mostly adds fat.

**What is maintenance**
> The intake where your weight holds steady. It is not a fixed number, since it moves with your activity, your size and time, which is why it is worth rechecking rather than setting once.

**What is TDEE**
> Total Daily Energy Expenditure, which is everything you burn in a day: your resting burn, your movement, your training and the energy used digesting food. It is the number a calorie target is built from.

**What is BMR**
> Basal Metabolic Rate, which is what your body burns doing nothing at all: breathing, circulation, keeping you warm. For most people it is the largest single share of what they burn in a day, which surprises people who assume exercise dominates.

**How much sugar is too much**
> There is no single line, and sugar is not uniquely fattening. The practical issue is that sugary food is easy to overeat and light on fullness, so it crowds out food that would have kept you satisfied. Fitting it into your totals is more useful than banning it.

**Do I eat back exercise calories** ➡️ **MOVE TO THE APP LIBRARY.** Every fact below verified in code 2026-08-09.
> On days with activity data, GoodForge judges your day on net calories: your food minus your active burn minus the resting burn your body has earned. So your training is already counted rather than something you add back by hand. If you think your watch overstates the burn, Active Calorie Accuracy under Settings > Health lets you scale it to 90, 80 or 70 percent. That correction applies to the active half only, since resting burn is a formula off your own weight, age and sex and there is nothing there to correct.

⚠️ **A NAMING TRAP VERIFIED HERE, AND IT NEARLY CAUSED A WRONG "FIX".** The section's collapsed preview
subtitle says **"Burn Accuracy"**, the heading INSIDE says **"Active Calorie Accuracy"** (`settings.tsx:2321`),
and the tooltip modal is titled **"Burn Accuracy"**. The KB (`assistantAppKnowledge.ts:720`) matches the real
HEADINGS and is CORRECT. **Do not "fix" the KB to say Burn Accuracy.** The 100/90/80/70 options are verified.
🟡 Open, minor, Justin's call: two names for one setting on one screen is mildly confusing. Not a bug.

## TRAINING (14)

**How many days a week should I train**
> Two to four days of resistance training a week covers most people, and three is a reasonable default. More days is not automatically better, since what you recover from is what counts. The number you can hold to every week beats the number that looks best on paper.

**How many rest days**
> Most people do well with two or three. Rest is when the adaptation actually happens, so days off are part of the training rather than time away from it. If you are training hard and never taking one, that usually shows up as stalled progress before anything else.

**How many sets and reps**
> Three to four sets of 6 to 12 reps covers most goals for most people. Lower reps with heavier weight leans toward strength, higher reps toward endurance, and the middle does a bit of both. The differences matter less than showing up and adding over time.

**What is progressive overload**
> Asking your body to do slightly more than last time, so it has a reason to change. More weight, more reps, more sets, better control, less rest. Without it, training becomes maintenance.

**How heavy should I lift**
> Heavy enough that the last couple of reps are hard while your form holds. If you could have done five more, it was too light. If your technique falls apart, it was too heavy.

**Do I need cardio**
> Not for building muscle, but it is worth doing for your heart, your recovery and your general capacity. Lifting and cardio are not in competition unless the cardio is so much that it eats into your recovery. Most people are nowhere near that line.

**How much cardio**
> The common guideline is around 150 minutes of moderate activity a week, and walking counts. If your goal is fat loss, cardio helps by adding to what you burn rather than by being special. Adding steps is usually easier to sustain than adding sessions.

**How long should a workout be**
> Forty five to seventy five minutes suits most people. Past that, quality usually drops before anything useful is added. A focused thirty minutes beats a distracted ninety.

**Full body or a split**
> Full body works well at two or three days a week, and splits make more sense at four or more. Neither is better on its own. The one that fits your week is the one that works.

**What is a deload**
> A deliberately lighter week, usually less weight or fewer sets, taken to let fatigue clear. Every six to eight weeks of hard training is a common rhythm, though plenty of people take one when they feel they need it rather than on a schedule. Progress often resumes right after.

**Do I need to warm up**
> Yes, and it does not need to be long. Five to ten minutes of light movement plus a couple of lighter sets of your first lift is enough for most people. The point is raising temperature and rehearsing the movement, not tiring yourself out.

**Do I need to stretch**
> Static stretching before lifting is not required and can slightly reduce strength in the session. Save it for afterward or for its own time, and use dynamic movement to warm up instead. Mobility work is worth doing if something is actually limiting your positions.

**Should I train when sore**
> Mild soreness is fine to train through, and movement often helps it. Sharp pain, joint pain, or soreness that has not eased in several days is different, and that is worth backing off and getting looked at. Soreness is not a scoreboard.

**What if I miss a workout**
> Nothing happens. One session does not undo anything, and trying to make it up by doubling the next one usually costs more than it recovers. Pick up where the plan was and carry on.

## SLEEP AND RECOVERY (15)

**How much sleep do I need**
> Seven to nine hours for most adults. Training hard pushes you toward the upper end rather than letting you get away with less. Consistently under six is where performance, appetite control and recovery start to slide together.

**Why does sleep matter for results**
> Most of your recovery happens while you sleep, and short sleep raises appetite while lowering your willingness to train hard. It is the cheapest performance change available and the one people trade away first.

**What is HRV**
> Heart rate variability, the variation in time between heartbeats. Higher generally means your nervous system is in a recovered state, lower means it is under load, whether from training, stress, illness or alcohol. The absolute number matters far less than your own trend, since it varies enormously between people.

**Is soreness necessary**
> No. Soreness mostly tracks novelty rather than how effective a session was, which is why a new exercise wrecks you and a familiar one does not. You can make excellent progress without it.

**What does soreness mean**
> Usually that you did something new, or more of something than usual. It is not a measure of how good the workout was and it is not required for progress. Pain in a joint, or soreness lasting well beyond a few days, is a different thing and worth getting looked at.

**What is overtraining**
> Doing more than you are recovering from, for long enough that performance drops rather than improves. Signs include stalled or falling numbers, poor sleep, low motivation and an elevated resting heart rate. True overtraining is rarer than people think. Under-recovering for a stretch is common.

**What should I do on a rest day**
> Move gently rather than doing nothing. Walking, easy cycling, mobility work. It helps blood flow without adding fatigue. A full day of stillness is fine too if that is what you need.

**Naps**
> A twenty to thirty minute nap helps if you are short on sleep, and it will not usually affect that night if it is early enough in the day. Longer naps leave most people groggy and can push bedtime later.

**Sleep quality vs quantity**
> Both matter and they are not interchangeable. Eight broken hours does not do what eight solid ones do. Quantity is the easier one to fix first, since it is a scheduling decision rather than a physiological one.

**What is deep sleep**
> The stage where physical recovery is concentrated: tissue repair, growth hormone release, immune work. It is front loaded into the first half of the night, which is part of why going to bed late and sleeping in does not fully substitute.

**What is REM**
> The stage most associated with dreaming, memory consolidation and mental recovery. It is weighted toward the second half of the night, so cutting sleep short in the morning takes REM disproportionately.

**Screens before bed**
> The bigger issue is usually what you are doing on the screen rather than the light itself. Anything stimulating keeps you alert past the point you wanted to be asleep. If you are going to use one, dull content beats an argument or a game.

**Does a consistent sleep schedule matter**
> Yes, and often more than the total. Going to bed and getting up at similar times keeps the rhythm your body schedules everything else around. A wildly different weekend is a common reason Monday feels awful.

**Stress and results**
> Stress and training draw on the same recovery budget. A hard period at work makes the same program feel heavier and progress slower, which is information rather than failure. Backing off during a stressful stretch usually costs less than pushing through.

**Sauna and cold plunge**
> Both have some evidence behind them, mostly modest. Sauna use has reasonable support for cardiovascular health and recovery. Cold immediately after lifting may slightly blunt muscle growth, so if you use it, putting some distance between the session and the plunge is the common advice.

## WEIGHT AND PROGRESS (18) -- heaviest Mindful load

**How fast should I lose weight** 🟣
> Around half a percent to one percent of your bodyweight a week is the usual range. For most people that is roughly one to two pounds. Faster than that and more of what you lose tends to come from muscle, and it gets harder to hold.

**How often should I weigh myself** 🟣
> Daily works well if you treat it as data rather than a verdict, because it lets you watch the weekly average instead of reacting to one number. Weekly is fine too. The trap is weighing daily and taking each reading personally.

**Why does my weight bounce day to day**
> Food volume, sodium, carbs, hydration, hormones and when you last used the bathroom. Two to four pounds of swing in a day is normal and has nothing to do with fat. The trend across weeks is the only part worth reading.

**How long until I see results**
> You will usually feel changes before you see them. Strength and energy tend to move in two to four weeks, visible changes closer to eight to twelve, and other people noticing later still. Most people quit somewhere in the gap between feeling it and seeing it.

**What is a plateau**
> A stretch where the number stops moving despite doing what you were doing. Three or four weeks of no change in the weekly average is the usual threshold, since anything shorter is normal noise.

**What do I do about a plateau**
> Check whether intake has crept up first, because it usually has. Portions drift and untracked bites add up. If your logging is honest and it has stalled for a month, a small adjustment to intake or activity is the next step, not a dramatic one.

**Can I lose fat and build muscle at once**
> Yes, though usually slowly, and best in specific situations: new to training, returning after a break, or carrying more body fat. Protein and resistance training are what make it possible. If you have trained consistently for years and are lean, progress in both directions at once is very slow.

**Scale is not moving but clothes fit better**
> That is usually recomposition: losing fat and gaining muscle at a similar rate, so the number holds while your shape changes. It is a good outcome that the scale is bad at reporting. Photos and measurements catch it where weight does not.

**Body recomposition**
> Changing your body composition without much change in weight, losing fat while building muscle. Slower than doing either alone, but it does not require an aggressive deficit. Protein and consistent resistance training are the two things that matter most.

**Measurements vs scale**
> They answer different questions. Weight is easy and noisy, measurements are slower to move and better at capturing shape. Waist is the single most useful one to track alongside weight.

**Progress photos**
> The most honest record you have, because your mirror updates too gradually to notice. Same light, same spot, same time of day, every few weeks. Most people are surprised looking back.

**Water weight**
> Shifts in fluid rather than fat. Carbs hold water, sodium holds water, and so does training soreness. A jump of several pounds overnight is water, since gaining a pound of fat takes a surplus of thousands of calories.

**Why do I weigh more after a workout**
> Inflammation and fluid retention as your muscles repair, plus anything you drank. It is temporary, and it is a sign of the work happening rather than of anything going wrong.

**Weekend weight spike**
> Almost always food volume, sodium and carbs rather than fat gained. Two days of looser eating rarely creates real weight, but it holds water. It usually settles by midweek.

**Setting a realistic goal weight** 🟣
> Pick something you can hold, not just reach. A weight you have maintained before is a good anchor. It is worth holding loosely, since how you look and feel at a given weight varies a lot with how much muscle you carry.

**Healthy rate of gain**
> Around a quarter to half a pound a week for most people. Faster tends to add fat rather than more muscle, since muscle cannot be built that quickly. Newer trainees can sit at the upper end.

**Is BMI useful**
> Useful across populations, weak for individuals. It knows your height and weight and nothing else, so it reads a muscular person as overweight. Treat it as a rough screen rather than a judgment.

**Body fat percentage**
> A better measure than weight for what most people actually want, but hard to measure accurately. Scales and consumer devices are inconsistent, so the trend from one method matters more than the number. Do not switch methods and compare across them.

## MYTHS (7)

**Can I target belly fat**
> No. Spot reduction is not a thing, and no exercise burns fat from the area it works. Fat comes off in the order your body decides, which is largely genetic, and the stomach is often last. Core work builds the muscle underneath, it does not uncover it.

**Does muscle turn to fat**
> No. They are different tissues and neither converts into the other. What happens when people stop training is that muscle shrinks from disuse while activity and appetite stay the same, so fat increases at the same time. Two things happening at once, not one becoming the other.

**Is starvation mode real**
> Not in the way it is usually described. Your body does not hold onto fat because you ate too little. What does happen is that prolonged dieting lowers your burn somewhat, through less spontaneous movement and a smaller body to carry. That is real but modest, and it does not stop weight loss.

**Are carbs after 6pm bad**
> No. Your body does not check the clock. Total intake across the day is what matters. Evening carbs get blamed because evening is when unplanned eating usually happens.

**Does sweating mean fat burning**
> No. Sweat is temperature regulation, not a measure of effort or fat loss. A hot room makes you sweat more without burning more. Any weight lost during a sweaty session is water and returns when you drink.

**Do detoxes and cleanses work**
> Not for what they claim. Your liver and kidneys handle that continuously and do not need help from a juice. People often feel better on one because they stopped eating badly for a few days, which is the actual change.

**Do fat burners and waist trainers work**
> Fat burners are mostly caffeine with a markup, and the effect is small enough that it will not decide anything. Waist trainers change your shape while worn and nothing after. Neither touches what actually drives fat loss.

## GYM PRACTICALITIES (9)

**Will lifting weights make me bulky**
> No, and this is the most common worry in the gym. Building noticeable size takes years of deliberate training and eating for it, and it does not happen by accident. Lifting is what gives you shape while losing weight, rather than just ending up smaller.

**What should I wear**
> Whatever you can move in and are not thinking about. Comfort and being able to see your own form beat anything else.

**What shoes**
> For lifting, a flat and firm sole gives you a stable base. Running shoes are cushioned, which is what you want for running and works against you under a heavy bar. Anything flat works fine to start.

**What equipment do I need to start**
> Less than you think. A pair of adjustable dumbbells covers an enormous amount at home, and a gym membership covers the rest. Everything else stays optional for a long time.

**I am intimidated at the gym**
> Almost everyone is at first, and nearly nobody is watching. Going at a quieter hour helps, and so does turning up with a plan so you are not deciding what to do while standing there. It wears off faster than you expect.

**Should I get a trainer**
> A few sessions to learn the main lifts is money well spent for most beginners, more for the technique than the motivation. It is not required. If you go this route, a handful of focused sessions usually beats an open ended commitment.

**Cardio before or after weights**
> After, if you are lifting for strength or size, since cardio first leaves you with less to give the part that matters most. If cardio is your priority, flip it. Separate days beat either if your schedule allows.

**What order should I do exercises**
> Hardest first, generally. Compound lifts while you are fresh, isolation work after. If one thing matters most to you right now, do that first regardless of what the usual order says.

**Do I need a gym at all**
> No. Bodyweight training and a couple of dumbbells take most people a long way, especially in the first year. A gym gives you heavier loading and more variety, which starts to matter more as you progress.

## NAMED DIETS (9)

**Keto**
> Very low carb, high fat, enough to shift your body toward burning fat for fuel. It works for the people it suits, and the weight lost is the same weight lost on any deficit. The tradeoffs are that hard training often suffers without carbs, and it is socially restrictive, which is why adherence is the usual failure point rather than the science.

**Paleo**
> Built around foods available before agriculture: meat, fish, vegetables, fruit, nuts. No grains, legumes or dairy. The food quality tends to be good and people often eat less without trying. The historical reasoning behind it is shaky, though that does not stop it working for people who enjoy eating that way.

**Vegan and vegetarian**
> Both work fine for training and body composition. The thing to watch is protein, since plant sources are generally lower and less complete, so hitting a target takes more deliberate planning. Worth keeping an eye on B12, iron and omega 3 as well, and worth a conversation with a dietitian if you are going fully plant based.

**Mediterranean**
> Vegetables, fish, olive oil, legumes, whole grains, not much processed food. It has the strongest long term health evidence of any named diet by a wide margin. It is less a weight loss protocol than a way of eating, which is probably why it lasts.

**Carnivore**
> Animal foods only. The evidence base is thin and it eliminates entire food groups including all fiber. Some people report feeling well on it, largely because it is extremely restrictive and they end up eating less. Worth talking to a doctor before going down that road, especially long term.

**Whole30**
> Thirty days without sugar, alcohol, grains, legumes and dairy, then a structured reintroduction. It is designed as an elimination protocol to spot what does not agree with you, not as a weight loss diet, though people usually lose some. The reintroduction is the part most people skip and the part that carries the value.

**Low carb generally**
> Works for plenty of people, mostly because cutting a whole category means eating less overall. Carbs are not causing weight gain by themselves. If you train hard, going very low tends to cost you in the gym before it gains you anything.

**Which diet is best**
> The one you can stay on. Compared head to head over a year the named diets land in roughly the same place, because they all end up creating a deficit. Adherence is the variable that separates them, so pick by what fits your life rather than by the mechanism.

**Do I even need to follow a diet**
> No. A named diet is a set of rules that makes eating less feel automatic, which helps some people and feels like a cage to others. Plenty of people do well tracking loosely and eating mostly whole food.

## LABELS AND TRACKING (6)

**How do I read a nutrition label**
> Check the serving size first, because everything else on the panel refers to it and it is often smaller than what you would actually eat. Then calories, then protein. The percent daily values are based on a 2,000 calorie diet, which may be nothing like your target.

**What is a serving size**
> The portion the manufacturer chose for the label, not a recommendation. It is often smaller than a realistic portion, so a package holding two and a half servings is easy to read as one.

**Are the calories on labels accurate**
> Close but not exact. Regulations allow a margin, commonly cited at around twenty percent, and rounding rules let small amounts be listed as zero. Over a week it evens out for most people.

**How accurate is calorie tracking**
> Usually within ten to twenty percent for someone tracking carefully, and further off than people think for someone eyeballing it. The value is not perfect precision, it is consistency: the same method over time shows you the trend even if the absolute number is a little off.

**Do I weigh food raw or cooked**
> Raw is more consistent, since cooking changes water content and therefore weight. A hundred grams of raw chicken is not a hundred grams of cooked chicken. Pick one and stay with it, and make sure the entry you log matches which one you used.

**How do I track restaurant food**
> Use the chain's published numbers if they exist, and pick the closest generic entry if they do not. Restaurant portions and cooking fats both run higher than people estimate, so rounding up lands closer than rounding down.

## DRINKS (5)

**Is coffee dehydrating**
> Not meaningfully. Caffeine has a mild diuretic effect but the fluid in the coffee more than covers it, so normal intake counts toward your water. Where coffee does matter is sleep, since caffeine has a long half life and an afternoon cup can still be in your system at bedtime.

**Diet soda**
> Fine for most people, and a useful tool if it stops you drinking the sugared version. The claims that it drives weight gain have not held up well. If you notice it drives cravings for you personally, that is worth acting on, but it is not a general rule.

**Sports drinks**
> Built for sessions long or hot enough to lose real salt and fluid, roughly over an hour of hard work. For a normal gym session they are sugar you did not need. Water covers most training.

**Energy drinks**
> Mostly caffeine and sugar, or caffeine and sweetener in the zero versions. They work as a pre workout and carry the same sleep caveat as coffee. Worth knowing your total caffeine across the day rather than counting drinks.

**Smoothies and juice**
> Both are easy to drink far more of than you would ever eat. Juice loses the fiber entirely, and a smoothie keeps it but still goes down fast, so neither fills you the way whole fruit would. They are not bad, they are just easy to underestimate.

## CONSISTENCY (12)

**How do I stay consistent**
> Make the standard low enough that a bad week still clears it. Most people set a plan for their best self, then miss it, and the miss feels like failure and ends the whole thing. A plan you can hit at your worst is worth more than one you can hit at your best.

**What if I fall off for a week**
> Nothing meaningful happened physically. A week does not undo months, and most of what comes back is water and habit rather than fat. The damage is almost always the story people tell themselves about it, not the week.

**How do I build a habit**
> Attach it to something you already do reliably, and keep the first version small enough that skipping feels sillier than doing it. Consistency comes from lowering the friction, not from wanting it more.

**Motivation vs discipline**
> Motivation is what gets you started and it is not reliable. Discipline is really just a system: a set time, a plan you do not have to think about, and a standard low enough to hold on a bad day. When people say they lack discipline they usually lack a system.

**All or nothing thinking**
> The most expensive habit in fitness. One off plan meal becomes a written off day, which becomes a written off week. Nothing about one meal requires the rest to follow it. The next choice is always available.

**How do I get back on track**
> Do the next ordinary thing rather than something dramatic. People try to atone with a punishing week and it rarely survives contact with real life. Log the next meal, do the next session, and let the average pull itself back.

**Tracking burnout**
> Common, and worth taking seriously. If logging has become a chore you dread, loosening it beats quitting entirely: track protein and calories only, or track weekdays. The goal was awareness, not a perfect record.

**Comparing myself to others**
> You are seeing their result and not their years, their genetics, or what it cost them. The only comparison with any information in it is against your own earlier self.

**How do I set a goal**
> Pick something you control. You control sessions completed, meals logged, steps taken. You do not directly control the number on the scale, which moves on its own schedule. Outcome goals are fine to hold, but the ones you act on should be behaviors.

**What if results are slow**
> Slow is what real progress looks like most of the time. Visible changes arrive in steps rather than smoothly, with long flat stretches between them. Check that the trend over a month is moving rather than judging by the week.

**Do I have to track forever**
> No. Most people track closely for a while, learn what portions and meals actually look like, then loosen off. Coming back to it when things drift is a common pattern, and a reasonable one.

**Eating with family and social pressure**
> Decide before you go rather than at the table, and do not announce it. Most pressure comes from people feeling judged by your choices, which drops away when you make them quietly. One meal with people you love is not the problem.

## INJURY PREVENTION (4)

**How do I avoid injury**
> Progress gradually, respect technique when you are tired, and warm up. Most gym injuries come from adding load faster than tissue adapts, or from chasing a number with form that has already broken down. Sleep and recovery matter here too, since fatigue is when technique slips.

**Good pain vs bad pain**
> Muscle burn during a set and general soreness after are normal. Sharp pain, pain in a joint, pain that gets worse as you continue, or anything lingering well beyond a few days is not. That is a stop and get it looked at, not a push through.

**Do I need a belt, straps or sleeves**
> None of them are required. A belt helps on heavy squats and deadlifts by giving your core something to brace against, straps help when your grip fails before the target muscle does, and sleeves are mostly comfort and warmth. All are tools for specific situations rather than things a beginner needs.

**Do I need a spotter**
> For heavy barbell bench pressing, yes, or use safety bars in a rack. For most other lifts you can bail safely without one. If you train alone, staying a rep or two away from failure on anything that can pin you is the sensible habit.

## POPULATION (4)

**Perimenopause and menopause**
> Hormonal changes through this period commonly affect body composition, recovery and sleep, and many people find the same effort produces different results than it used to. Resistance training and protein become more important rather than less, particularly for bone density and muscle. This is worth a conversation with a doctor who knows your history, since the individual picture varies a lot.

**Does recovery slow with age**
> Somewhat, though less than commonly assumed, and much of the difference tracks sleep, stress and training history rather than age itself. The practical change is usually needing a bit more warm up, a bit more recovery between hard sessions, and more attention to sleep. Training does not stop working.

**Training as a teenager**
> Resistance training is safe for teenagers with proper technique and sensible loading, and the old idea that it stunts growth is not supported. Technique before weight matters even more at that stage. Worth getting proper coaching early rather than learning from videos.

**Is gluten free healthier**
> Not unless you have coeliac disease or a diagnosed sensitivity, in which case it is essential. For everyone else it removes nothing harmful, and gluten free versions of processed foods are often no better nutritionally. People sometimes feel better on it because they cut back on processed food at the same time.

## GOAL SETTING (3)

**Should I bulk or cut first**
> If you are carrying enough body fat that you would want to lose some regardless, start there, since it is easier to build afterward and you will see the muscle you already have. If you are already lean and want size, build. Most people bounce between the two too quickly to get anywhere with either.

**How long should a cut last**
> Eight to sixteen weeks is a common range, then a period at maintenance before deciding whether to continue. Very long deficits wear people down, and adherence usually breaks before the physiology does. Planning the end at the start makes it far easier to hold.

**When do I switch goals**
> When you have reached the goal, when progress has stalled for a month with honest logging, or when your life has changed enough that the goal no longer fits. Switching because you are bored is the common one, and it is usually the wrong reason.

## 🔴 SAFETY (8) -- the highest-value entries in the library

These are the topics where an improvised answer is worst, which is exactly why canning them is the
safeguard rather than a limitation.

**Training around an injury**
> That one needs someone who can actually see it. Working around an injury is normal and often possible, but what is safe depends on what the injury is, and guessing at that from a chat is how a small problem becomes a long one. A physio or doctor can tell you what to avoid and what is fine, and that answer is worth having before you train through anything.

**Should I see a doctor**
> If you are asking, usually yes. That is not a dodge. The cost of a checked out worry is an appointment, and the cost of an unchecked one can be a great deal more. Anything persistent, worsening, or new and unexplained is worth a professional look.

**Working out with a medical condition**
> Exercise is beneficial for most conditions, and what is safe for you specifically is a medical question rather than a fitness one. Your doctor can tell you what to avoid and at what intensity, and many conditions have specific guidance worth having. Once you have that, we can work within it.

**Medication and training**
> Some medications affect heart rate, blood pressure, hydration, temperature regulation or how you recover, which changes what training feels like and sometimes what is sensible. That is a question for your doctor or pharmacist, who knows what you are taking and why. Not something to work out by trial and error.

**Pregnancy**
> Exercise during pregnancy is generally encouraged, and the specifics depend on your history, your stage and your own doctor's guidance. Recommendations have changed a lot and vary case by case, so this is one to take to the professional looking after you rather than to general advice.

**Joint pain**
> Joint pain is different from muscle soreness and is worth taking seriously rather than training through. Sometimes it is technique or load and sometimes it is not, and telling those apart needs someone who can watch you move. Back off the movement causing it and get it looked at, particularly if it persists past a week or two.

**Supplements and medication**
> Real interactions exist and some are significant. A pharmacist is the right person to ask and will usually check for free, faster than a doctor's appointment. Worth doing before starting anything new rather than after.

**Dizziness during exercise** ⚠️ **TRIGGERS MUST `exclude` CHEST AND BREATHING TERMS. See rule 1.**
> Stop when it happens, sit down, and do not push on through. Occasional lightheadedness from standing up quickly or training with very little food is common, but dizziness that is repeated, severe, or comes alongside anything else is a reason to get checked rather than to work around. If it comes with any chest discomfort or trouble breathing, treat that as urgent and get help immediately.

**❌ CHEST PAIN HAS NO ANSWER HERE, DELIBERATELY.** See rule 1 at the top of this file.

---

## 🟣 MINDFUL VERSIONS (7) -- written and approved 2026-08-09

🔴 **AN EARLIER ESTIMATE OF "~25" IN THIS FILE AND IN PLAN WAS WRONG. IT IS 7.** Audited rather than
guessed: Mindful's rules are about deficit maths, weight-loss prescriptions and judgment language, and most
of the library never touches any of those. The CONSISTENCY answers are already observational, and "scale is
not moving but clothes fit better" is arguably MORE Mindful than the standard version.
✅ **NOTHING IS WITHHELD FROM A MINDFUL USER.** Justin's honest-numbers rule holds: they still get the real
range. What changes is framing. "Should" becomes "most people find", direct address softens, and the
weigh-in answer opens the door to not weighing at all.

**How much should I eat to lose weight**
> Most people find a gap of around 300 to 500 calories a day below what they burn is one they can live with, which usually works out around half a pound to a pound a week. Larger gaps move faster on paper and tend to be harder to sustain.

**What is a calorie deficit**
> Eating fewer calories than your body uses, so the difference comes from stored energy. That is the mechanism behind weight changing, whatever approach is wrapped around it.

**How much protein should I eat**
> Most people training regularly land somewhere around 0.7 to 1g per pound of bodyweight. It matters most when you are eating less than you burn, since protein is what protects muscle. Below about 0.5g per pound is where most people notice the difference.

**How fast should I lose weight**
> Around half a percent to one percent of bodyweight a week is the range most people find workable, roughly one to two pounds for many. Faster than that and more of what comes off tends to be muscle, and it is generally harder to hold onto.

**How often should I weigh myself**
> There is no requirement to weigh at all. If you do, daily readings are most useful as a weekly average rather than as individual numbers, since the day to day movement is mostly water. Weekly works just as well, and some people are better off not tracking it.

**Setting a realistic goal weight**
> A weight you have lived at comfortably before is usually a better reference than a number picked from anywhere else. It is worth holding loosely too, since how you feel at a given weight varies a lot with how much muscle you carry, and the number on its own says less than people expect.

**What do I do about a plateau**
> A month without movement is worth a look rather than a reaction. Intake often drifts upward without anyone noticing, so that is the first thing to check. If everything has been consistent, small adjustments are the usual next step rather than large ones.

## COUNT AND THE HONEST GAP
**141 answers written.** 140 general + 1 ("do I eat back exercise calories") that belongs in the app library.
⚠️ **The original topic sweep estimated ~198.** The difference is NOT skipped work: the original list had
internal duplicates, three entries were cut as near-duplicates of existing app answers, and several topics
collapsed into one another. **Worth reconciling against the original sweep before this is called complete.**

## STILL OPEN ON PLAN 4.13
- The ~25 🟣 Mindful versions
- The escalated repeat-miss copy (3 lines, `SPEC_otto.md`)
- Faith failing open
- The Support the Mission route key and the "See what Supporters get" button
- Widening `nav.recipe` and the past-day answer to catch "homemade", "from scratch", "forgot to log"
- Trigger words, `excludes` and collision testing for all 141 (**the risk is collisions, not coverage**)
