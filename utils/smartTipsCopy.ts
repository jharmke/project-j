// utils/smartTipsCopy.ts
// Copy variant pools for all 40 Smart Tips rules. Organized by ruleId.
// Data slots use {variable} notation and are filled at evaluation time.
// Discipline and Balanced share the 'db' pool (spec 8.1).
// Mindful corrective variants are in 'mindful' (growth areas ON only).
// Positive rules reuse 'db' copy for Mindful (gentle tone pass at build; spec 13.8).
// No double-dash anywhere in this file per project rules.

export interface RuleCopy {
  title: string;       // short, always visible even when blurred
  positive: boolean;
  db: Record<string, string[]>;   // discipline/balanced pools, keyed by tier_goal
  mindful: string[];               // mindful-specific variants
}

export const RULE_COPY: Record<string, RuleCopy> = {

  // ── NUTRITION ────────────────────────────────────────────────────────────────

  net_above_pace: {
    title: 'Calorie Pace',
    positive: false,
    db: {
      pattern_lose: [
        'Net has been above your deficit target most days {period}, closer to maintenance than a cut.',
        'Most days {period} landed above your deficit goal. The math on weight loss needs a consistent gap.',
        'You have been running a smaller deficit than intended on most days {period}. Worth tightening up.',
        'The deficit has been shallower than planned for most of the week. The scale responds to the weekly total, not to any single day.',
        'Eating has been landing closer to maintenance than to your target. Tightening that gap even slightly, and holding it, is what shows up on the scale.',
      ],
      pattern_maintain: [
        'You have been in a consistent surplus {period} while trying to maintain. Worth pulling things back a touch.',
        'Net has been above your maintenance target most days, a small but consistent surplus.',
        'Most days {period} have run above target. Not by a lot, but consistently.',
        'Intake has been running just above maintenance rather than on it. A steady drift like this is easier to correct now than after a month of it.',
        'You have been sitting a little above your target most of the week. Small enough to miss day to day, big enough to see over a month.',
      ],
    },
    mindful: [
      'We noticed food intake has been running a little higher than your goal most days. Just something to hold in mind.',
      'Eating has been a touch above your target most days {period}. Worth a gentle check-in.',
      'Things have been a little fuller than your goal {period}. Not a big deal, just worth noticing.',
      'Eating has been running a little above your goal lately. Nothing alarming, just a pattern showing up in the numbers.',
      'There has been a bit more food than your target on recent days. Something to sit with rather than something to fix.',
    ],
  },

  net_below_pace: {
    title: 'Intake Pace',
    positive: false,
    db: {
      pattern_gain: [
        'You have been under your intake goal for most days {period}. Hard to build when consistently under-fueling.',
        'Intake has been below target most days {period}. That shortfall makes it significantly harder to add mass.',
        'Most days {period} have been under your intake goal. On a bulk, that is the one thing you cannot afford to miss.',
      ],
      urgent_gain: [
        'Intake has been well below your bulk target for {days} of the last 5 days. Consistent under-fueling stalls progress.',
        'Significantly under your intake goal most of {period}. The surplus you need is not there.',
        'Several days in a row under your gaining target. Push intake higher or progress stalls.',
      ],
      pattern_maintain: [
        'Net has been running below your maintenance target most days {period}.',
        'You have been in a small deficit while trying to maintain. Worth checking in on intake.',
        'Intake has been running lower than your maintenance goal on most days.',
      ],
    },
    mindful: [
      'We noticed food intake has been on the lighter side {period}. Making sure you are eating enough is just as important as what you eat.',
      'Intake has been a bit lower than your target most days. Your body does its best work when it is well-fueled.',
      'Things have been a little lighter {period} in terms of eating. Worth checking in with yourself.',
    ],
  },

  cal_small_gap: {
    title: 'Consistent Small Gap',
    positive: false,
    db: {
      pattern_lose: [
        'You have been consistently just a little short of your deficit goal. The most common culprits are liquid calories, cooking oils, sauces, and bites that do not make it into the log.',
        'The deficit has been close but not quite there most days. Small unlogged things add up fast: coffee drinks, tastes while cooking, condiments.',
        'Most days {period} have been just slightly above your target, a really small gap but consistent. Liquid calories and unlogged bites are usually where it hides.',
        'The gap has been small, and it has been there nearly every day. When a miss is this consistent, the cause is usually something routine: the same drink, the same handful, the same splash of oil.',
        'Close to your target most days without quite landing under it. A steady miss this size almost always traces back to a habit rather than one big day.',
      ],
    },
    mindful: [
      'We noticed logging has been close to your goal but not quite landing there. Sometimes small things throughout the day are easy to miss.',
      'Intake has been just a little over your goal most days. The small unlogged things tend to add up quietly.',
      'There is a small but consistent gap between logged food and your goal. Worth a gentle look at what might be slipping through.',
      'Logging has been landing just above your goal fairly often. Gaps this small are usually about what is easy to forget, not about effort.',
      'There has been a consistent little distance between what you logged and what you aimed for. Easy to miss, and easy to close once you spot it.',
    ],
  },

  cal_outlier_week: {
    title: 'One Higher Day',
    positive: false,
    db: {
      insight_all: [
        'One higher day {period}, but {days} days were right on track. One meal does not make or break progress. The pattern is what matters.',
        'The week overall was solid with one outlier day. That is normal. What you do consistently is what counts.',
        'Strong week overall with one day that ran high. One data point does not define a pattern.',
      ],
    },
    mindful: [
      'One day {period} looked different from the others. That is completely normal. The overall week still looked good.',
      'There was one higher day {period} in an otherwise steady pattern. One day is just one day.',
      'The week had one day that stood out. That is part of a real, balanced life.',
    ],
  },

  protein_under: {
    title: 'Protein Pattern',
    positive: false,
    db: {
      pattern: [
        'Protein has been below your {goal}g target on {days} of your last {window} logged days. At a deficit, low protein means more of the weight you lose comes from muscle.',
        'Most days {period} came in under your protein goal. At a deficit, that gap matters more than people realize.',
        'Protein has been consistently below target {period}. It is one of those things that compounds quietly.',
        'Protein has come in under target on most of your logged days. When calories are limited, protein is what protects the muscle you already have.',
        'Your protein has been running short of goal {period}. Of everything on the plate, it is the number that decides how much of the loss is fat.',
      ],
      urgent: [
        'Protein has been significantly below your {goal}g goal for {days} of the last 5 days. At a deficit with low protein, fat loss and muscle loss start to look the same.',
        'Well under your protein target for most of the last week. That level of shortfall makes it hard to hold onto muscle while cutting.',
        'Protein has been very low for several days running. This is the one macro that really cannot slide on a cut.',
        'Protein has been well under goal for several days running. At this level the body starts covering the difference from muscle.',
        'Several days now with protein far below target. Of all the things that can slide during a cut, this is the expensive one.',
      ],
      // Added 2026-08-07. The `pattern` and `urgent` pools above are written for someone CUTTING ("at a
      // deficit", "while cutting", "on a cut") and this rule has no goal guard, so a user trying to GAIN
      // was reading all of it. ⚠️ Not an edge case: `rankCandidates` lists protein_under as a TOP priority
      // rule for the gain bucket, so it is one of the first tips a bulking user sees.
      pattern_gain: [
        'Protein has been below your {goal}g target on {days} of your last {window} logged days. On a bulk, protein is what decides whether the weight you add is muscle or not.',
        'Most days {period} came in under your protein goal. Building tissue needs the raw material, and that is protein.',
        'Protein has been under target most days {period}. A surplus without enough protein tends to add more fat than muscle.',
        'Protein has been under your target on most logged days. Extra calories build tissue only when there is protein there to build with.',
        'Your protein has been short of goal {period}. The surplus sets the ceiling on how much you can gain, but protein decides what kind of weight it is.',
      ],
      urgent_gain: [
        'Protein has been significantly below your {goal}g goal for {days} of the last 5 days. On a bulk that gap directly limits how much of the gain is muscle.',
        'Well under your protein target for most of the last week. The surplus is doing its job, but the protein is not there to use it.',
        'Protein has been very low for several days running. On a gaining goal this is the one macro that decides what the weight is made of.',
        'Protein has been far below target for several days. Right now those extra calories have nothing to build with.',
        'Several days running well short on protein. On a gaining phase this is the difference between adding muscle and simply adding weight.',
      ],
    },
    mindful: [
      'Protein has been on the lower side {period}. It plays a bigger role than most people realize in how you feel and recover day to day.',
      'We noticed protein intake has been lighter {period}. It is one of those quiet things that affects energy and how satisfied you feel after eating.',
      'Protein has been below where it could be most days. Worth thinking about, not for numbers, just for how you feel.',
      'Protein has been sitting lower than usual {period}. It tends to be the thing that quietly affects how full you feel and how well you bounce back.',
      'There has been less protein than usual on your plate lately. No need to make a project of it, though your body does notice.',
    ],
  },

  protein_high: {
    title: 'Protein Streak',
    positive: true,
    db: {
      insight_all: [
        'Protein has been consistently strong {period}, above goal on {days} of your last {window} logged days. That kind of consistency adds up.',
        'Solid protein intake across most of the week. One of the best things you can do for your body regardless of your goal.',
        'Protein above target most days {period}. That is exactly the pattern that supports recovery and keeps hunger in check.',
      ],
    },
    mindful: [
      'Protein has been consistently strong {period}. That is doing good work for your energy and recovery.',
      'You have been fueling well {period}. Strong protein across most days is something worth celebrating.',
      'Protein has been above goal most days. That quiet consistency makes a real difference in how you feel.',
    ],
  },

  fat_high: {
    title: 'Fat Pattern',
    positive: false,
    db: {
      pattern: [
        'Fat has been above your {goal}g target on {days} of your last {window} logged days. Fat is calorie dense, so it is often where extra calories hide.',
        'Most days {period} came in over your fat goal. Worth a look at the higher-fat foods, since they add up fast on the calorie side.',
        'Fat intake has been over target most of the week. Not a problem on its own, but it is the easiest macro to overshoot calories with.',
      ],
    },
    mindful: [
      'Fat has been on the higher side {period}. It is the most calorie dense macro, so small changes there move your totals more than you would expect.',
      'We noticed fat intake has been running a bit high most days. Something to be aware of, since it carries more calories per gram than carbs or protein.',
      'Fat has been above where it usually sits {period}. Worth a gentle look, just to stay aware of where your calories come from.',
    ],
  },

  carbs_high: {
    title: 'Carb Pattern',
    positive: false,
    db: {
      pattern: [
        'Carbs have been above your {goal}g target on {days} of your last {window} logged days. Worth checking whether they are fueling your training or just adding up.',
        'Most days {period} came in over your carb goal. Timing more of them around workouts can make them work harder for you.',
        'Carb intake has been over target most of the week. Not inherently a problem, but worth knowing where they are landing in your day.',
      ],
    },
    mindful: [
      'Carbs have been on the higher side {period}. They are your main fuel source, so it is more about timing than cutting.',
      'We noticed carb intake has been running a bit high most days. Something to be aware of, especially around how it lines up with your activity.',
      'Carbs have been above where they usually sit {period}. Worth a gentle look at when in the day they tend to show up.',
    ],
  },

  water_under: {
    title: 'Hydration Dip',
    positive: false,
    db: {
      pattern: [
        'Water intake has been below your {goal}oz goal on most days {period}.',
        'Hydration has been well below target most days. Easy one to let slide but it affects everything.',
        'Water has been consistently short {period}. Even a little dehydration makes a surprising difference in energy and hunger.',
      ],
      urgent: [
        'Water has been very low for several days, well under half your goal on most days. Dehydration at this level affects focus, energy, and appetite.',
        'Hydration has been significantly short for most of the last week. Worth making it a priority.',
        'Water intake has been really low for several days running. The body needs consistent hydration to function well.',
      ],
    },
    mindful: [
      'Staying hydrated makes such a difference in how you feel. We noticed it has been on the lower side lately. Small sips throughout the day add up.',
      'Water has been lighter {period}. Hydration affects energy, mood, and hunger more than most people realize.',
      'We noticed hydration has been below where it could be. Even small increases throughout the day can make a real difference in how you feel.',
    ],
  },

  water_high: {
    title: 'Hydration Streak',
    positive: true,
    db: {
      insight_all: [
        'Water goal hit on {days} of your last {window} logged days. That consistency is doing more for you than you probably realize.',
        'Hydration has been excellent {period}. Consistently hitting your water goal is one of the highest-leverage habits you can build.',
        'Nearly perfect hydration {period}. That consistency shows up in energy, focus, and recovery.',
      ],
    },
    mindful: [
      'You have been staying so well hydrated {period}. That is a real act of care for your body.',
      'Water goal hit almost every day {period}. That kind of quiet consistency matters more than most people know.',
      'Nearly perfect hydration {period}. You are giving your body something it really needs.',
    ],
  },

  fiber_low: {
    title: 'Fiber Pattern',
    positive: false,
    db: {
      pattern: [
        'Fiber has been well below the recommended {goal}g on most days {period}. Low fiber tends to go hand in hand with a more processed diet.',
        'Fiber intake has been consistently low {period}. It plays a bigger role in hunger management and food quality than most people give it credit for.',
        'Fiber has been running low most days. Worth looking at where it comes in, or does not.',
      ],
    },
    mindful: [
      'Fiber has been on the lower side {period}. Foods high in fiber tend to be the ones that keep you feeling satisfied longer.',
      'We noticed fiber has been lighter {period}. It is one of those quiet factors that affects how full and energized you feel.',
      'Fiber intake has been low most days. It tends to track with how processed the diet is, something to pay attention to.',
    ],
  },

  sodium_high: {
    title: 'Sodium Trend',
    positive: false,
    db: {
      pattern: [
        'Sodium has been running high on most days {period}, above {threshold}mg on {days} of your last {window} logged days.',
        'Consistently high sodium {period}. At these levels it can affect how you feel day to day, especially energy and bloating.',
        'Sodium has been well above recommended most days. Worth looking at where it is coming from. It hides in a lot of unexpected places.',
      ],
      urgent: [
        'Sodium has been very high for most of the last week, significantly above recommended levels. That level of intake affects energy and how the body handles water.',
        'Several days of very high sodium in a row. At this level it is worth paying attention to where it is coming from.',
        'Sodium has been running very high for {days} days. The foods that carry that much sodium tend to crowd out everything else.',
      ],
    },
    mindful: [
      'Sodium has been on the higher side {period}. High sodium can affect how rested and energized you feel, worth being aware of.',
      'We noticed sodium has been elevated lately. It can affect how your body feels in ways that are not always obvious.',
      'Sodium intake has been a bit high {period}. It is one of those things that quietly affects energy levels and how you feel overall.',
    ],
  },

  sugar_high: {
    title: 'Sugar Trend',
    positive: false,
    db: {
      pattern: [
        'Sugar has been running high on most days {period}. At these levels it can make hunger harder to manage and energy less consistent.',
        'Consistently high sugar intake {period}. Blood sugar spikes and crashes are the main way this shows up in how you feel day to day.',
        'Sugar has been above recommended most days. Worth looking at where it is coming from. Drinks and sauces are often the hidden source.',
      ],
    },
    mindful: [
      'Sugar has been a bit high {period}. It can affect how steady your energy feels throughout the day.',
      'We noticed sugar intake has been elevated. High sugar days sometimes make hunger feel harder to manage.',
      'Sugar has been running high most days. Energy tends to feel less consistent when sugar is elevated, just something to be aware of.',
    ],
  },

  cal_goal_hit: {
    title: 'Calorie Consistency',
    positive: true,
    db: {
      insight_all: [
        'Calorie goal hit {days} of your last {window} logged days. That kind of consistency is exactly what produces results over time.',
        'Nearly perfect on your calorie goal {period}. Building this as a daily habit is more valuable than any single perfect day.',
        'You have been hitting your goal almost every day {period}. Consistency like this is where the real change happens.',
        'Your calorie goal came in on {days} of the last {window} logged days. Weeks like this are what a trend line is actually made of.',
        'Close to target nearly every day {period}. Results tend to come from stacking ordinary days like these, not from any single standout one.',
      ],
    },
    mindful: [
      'You have been showing up for yourself {period}, consistently staying close to your goal. That takes real intention.',
      'Most days {period} you have been right on track. That kind of steady effort is worth acknowledging.',
      'Seven days of staying close to your goal. That is not luck. That is a habit forming.',
      'You stayed close to your goal nearly every day {period}. That steadiness is its own kind of progress.',
      'A week of landing near your target, day after day. Quiet consistency like that is easy to overlook and easy to underrate.',
    ],
  },

  // ── SLEEP ────────────────────────────────────────────────────────────────────

  sleep_score_low: {
    title: 'Sleep Quality',
    positive: false,
    db: {
      pattern: [
        'Sleep scores have been lower than usual most nights {period}. Recovery happens during sleep. It is worth prioritizing.',
        'Consistently lower sleep scores {period}. Poor sleep affects hunger, energy, and workout performance more than most people expect.',
        'Sleep quality has been lower than usual on {days} of your last {window} logged nights.',
      ],
      urgent: [
        'Sleep has been poor for {days} nights in a row, significantly below a healthy threshold. At this level, recovery, hunger, and performance are all affected.',
        'Several nights of really low sleep scores. This kind of consistent poor sleep has real downstream effects.',
        'Sleep quality has been poor for most of the last week. It is worth looking at what might be disrupting it.',
      ],
    },
    mindful: [
      'Sleep has not been great lately. Rest is where your body does its best work. Even small changes to your routine before bed can make a difference.',
      'We noticed sleep has been a little rough {period}. Your body is telling you something. It might be worth listening.',
      'Sleep has been lighter on quality lately. Rest matters so much for how you feel. Even a small improvement in your bedtime routine can shift things.',
    ],
  },

  sleep_duration_short: {
    title: 'Sleep Duration',
    positive: false,
    db: {
      pattern: [
        'You have been getting less sleep than your goal most nights {period}.',
        'Sleep has been consistently short {period}. Chronic mild sleep debt builds up faster than most people realize.',
        'Most nights {period} have come in under your sleep goal. Recovery and appetite regulation both take a hit when sleep is consistently short.',
      ],
      urgent: [
        'Sleep has been significantly short for {days} of the last 5 nights. That level of shortfall compounds quickly.',
        'Several nights of significantly short sleep in a row. Consistent sleep debt has real effects on hunger, energy, and recovery.',
        'Well under your sleep goal for most of the last week. Sleep debt this size affects how you feel across the board.',
      ],
    },
    mindful: [
      'Rest has been on the shorter side lately. Your body does its best recovery work while you sleep. Even small improvements in sleep time make a real difference.',
      'Sleep has been a bit shorter than ideal {period}. How are you feeling? It is worth finding ways to protect that rest time.',
      'We noticed sleep has been lighter {period} in terms of hours. Rest is one of the most powerful things you can do for yourself.',
    ],
  },

  sleep_bedtime_inconsistent: {
    title: 'Bedtime Rhythm',
    positive: false,
    db: {
      pattern: [
        'Your bedtime has been varying by over an hour most nights {period}. Inconsistent sleep timing disrupts your body clock even when total hours are adequate.',
        'Bedtime has been all over the place {period}. A consistent bedtime often matters more than total hours for sleep quality.',
        'Sleep timing has been inconsistent most nights. Your body clock runs on regularity. The variance is likely affecting sleep quality.',
      ],
    },
    mindful: [
      'Sleep timing has been a bit different each night {period}. A consistent bedtime is one of the simplest things you can do for sleep quality.',
      'We noticed bedtime has varied a lot lately. The body thrives on rhythm. Even a loose consistent window makes a difference.',
      'Sleep has been at different times each night. Consistency in when you sleep often matters as much as how long.',
    ],
  },

  sleep_score_high: {
    title: 'Sleep Streak',
    positive: true,
    db: {
      insight_all: [
        'Sleep scores have been excellent on {days} of your last {window} logged nights. Strong recovery like this compounds over time.',
        'Consistently excellent sleep {period}. Recovery is where adaptation happens. You are doing this right.',
        'Sleep has been strong across most of the week. That kind of recovery makes every other part of your effort work better.',
      ],
    },
    mindful: [
      'Sleep has been really good {period}, restful nights most of the time. Rest well done.',
      'What a good week for sleep. Your body is getting the recovery it needs.',
      'Sleep has been excellent {period}. You are giving yourself something really valuable.',
    ],
  },

  sleep_deep_low: {
    title: 'Deep Sleep',
    positive: false,
    db: {
      pattern: [
        'Deep sleep has been below 15% most nights {period}. Alcohol, heavy meals close to bedtime, and screen time are the most common causes.',
        'Deep sleep percentage has been consistently lower than ideal. It is the most restorative sleep stage. Worth protecting.',
        'Most nights {period} have had lower than ideal deep sleep. The usual culprits: alcohol within 3 hours of bed, eating late, and blue light exposure.',
      ],
    },
    mindful: [
      'Deep sleep has been lighter {period}. Small changes to your wind-down routine can make a real difference in how rested you feel.',
      'We noticed deep sleep has been on the lower side. A calmer evening routine tends to help, whatever that looks like for you.',
      'Sleep has been less restorative {period} in terms of deep rest. It might be worth thinking about what your evenings look like before bed.',
    ],
  },

  // ── ACTIVITY ─────────────────────────────────────────────────────────────────

  active_low: {
    title: 'Activity Level',
    positive: false,
    db: {
      pattern: [
        'Active calorie burn has been below your goal most days {period}.',
        'Burn has been below your active calorie goal most days. The gap between eat and burn numbers is tighter than it looks.',
        'Active calories have been consistently below goal {period}. That gap is bigger than most people expect.',
        'Active burn has been sitting under your goal for most of the week. Your eat and burn numbers are closer together than they look.',
        'Movement has been producing less burn than your goal assumes. That shifts what the rest of your numbers actually mean.',
      ],
      urgent_lose: [
        'Active burn has been significantly below your goal for {days} of the last 5 days. With low burn and a cut, the deficit is probably much smaller than it appears.',
        'Burn has been very low for most of the last week. That changes the math on your deficit more than most people realize.',
        'Several days of very low active burn. On a cut, this means you are probably closer to maintenance than your numbers suggest.',
        'Active burn has been far under goal for several days. With the burn side this low, your real gap is narrower than the numbers suggest.',
        'Several days now with very little active burn. On a cut that quietly moves you toward maintenance without anything on the food side changing.',
      ],
    },
    mindful: [
      'Movement has been lighter than usual lately. Even short walks can make a big difference in how you feel throughout the day.',
      'We noticed activity has been lower {period}. Any movement is good movement. It does not have to be a full workout.',
      'Things have been a bit more sedentary {period}. How are you feeling? Sometimes the body just needs to move a little.',
      'Movement has been on the lighter side this past week. Even a short walk counts, and it does not have to look like training.',
      'There has been less activity than usual lately. Bodies go through quieter stretches, and easing back in is enough.',
    ],
  },

  activity_streak_low: {
    title: 'Activity Streak',
    positive: false,
    db: {
      pattern: [
        'You have had {days} consecutive low-activity days. Even a short walk resets the pattern. Momentum matters.',
        '{days} days in a row with minimal activity. That kind of extended rest can make it harder to get back into it.',
        'Low activity for {days} days running. One session, even a short one, breaks the streak.',
      ],
    },
    mindful: [
      'Things have been pretty still for {days} days. How are you doing? Even a gentle walk can shift how you feel.',
      'We noticed movement has been lighter for a stretch. There is no pressure. Just checking in.',
      'A few quiet days in a row. When you feel ready, even a little movement can make a real difference in your energy.',
    ],
  },

  steps_low: {
    title: 'Step Count',
    positive: false,
    db: {
      pattern: [
        'Steps have been below your {goal} goal on {days} of your last {window} logged days. Daily step count is one of the most underrated variables in the whole system.',
        'Step goal missed most days {period}. Small habit changes, parking further away, taking the stairs, add up more than a single workout.',
        'Steps have been consistently below goal {period}. Movement outside of formal exercise has a big impact on total daily burn.',
      ],
    },
    mindful: [
      'Steps have been lighter {period}. Moving throughout the day, not just in workouts, makes a real difference in how you feel.',
      'We noticed steps have been below goal most days. Small bits of movement throughout the day add up in ways that are easy to underestimate.',
      'Daily steps have been lower {period}. Even short walks during the day can shift your energy and mood significantly.',
    ],
  },

  active_high: {
    title: 'Activity Streak',
    positive: true,
    db: {
      insight_all: [
        'Active calorie goal hit {days} of your last {window} logged days. That kind of sustained burn adds up significantly over a week.',
        'Nearly every day {period} has hit the active calorie goal. Strong work. This is what creates a meaningful gap between eat and burn.',
        'Active burn above goal almost every day {period}. Consistency here compounds in a way that no single workout ever will.',
      ],
    },
    mindful: [
      'You have been moving consistently {period}, hitting your activity goal most days. That is worth celebrating.',
      'Activity has been really strong {period}. You are showing up for your body in a real way.',
      'Most days {period} you have been active and moving. That consistency is doing more for you than you probably realize.',
    ],
  },

  steps_high: {
    title: 'Step Streak',
    positive: true,
    db: {
      insight_all: [
        'Step goal hit {days} of your last {window} logged days. Your daily movement habits are in a genuinely strong place.',
        'Nearly perfect steps {period}. Daily movement at this level makes everything else, sleep, hunger, mood, work better.',
        'Consistent step goal achievement all week. This is the kind of habit that silently does a lot of heavy lifting.',
      ],
    },
    mindful: [
      'You have been moving a lot {period}, hitting your step goal most days. That is a beautiful habit.',
      'Step goal hit almost every day {period}. Your body is getting so much good movement.',
      'Really strong week for steps. Moving through your day like this has ripple effects on how you feel in every way.',
    ],
  },

  workout_low: {
    title: 'Workout Completion',
    positive: false,
    db: {
      pattern: [
        'Workout completion has been below 60% on most scheduled days {period}. Finishing what is on the plan is where the adaptation actually happens.',
        'Most scheduled workouts {period} were partially completed. The reps you leave in the tank are the ones that matter most.',
        'Workout sessions have been cut short more often than not {period}. Are the sessions too long, too hard, or is something else getting in the way?',
      ],
    },
    mindful: [
      'Workouts have been a bit shorter or less complete than usual {period}. That is okay. Just checking in. Is there anything making it harder to show up?',
      'We noticed workouts have been a little less complete lately. How are you feeling? Sometimes the plan needs adjusting.',
      'Workouts have been a bit lighter {period}. There is no judgment here, just noticing.',
    ],
  },

  // ── INTERMITTENT FASTING ─────────────────────────────────────────────────────

  if_inconsistent: {
    title: 'Fasting Consistency',
    positive: false,
    db: {
      pattern: [
        'Your fasting window has been inconsistent on {days} of your last {window} logged IF days. The consistency is where the benefit comes from, more than any single day.',
        'IF window has been broken or skipped most days {period}. A consistent window, even a shorter one, is more effective than a perfect window most days.',
        'Fasting consistency has been lower {period}. The regularity of the pattern matters more than the exact hours.',
      ],
    },
    mindful: [
      'The fasting window has been a bit irregular {period}. That is okay. Sometimes life gets in the way. The consistency is what matters over time.',
      'We noticed the fasting window has been less consistent. How is it feeling? Sometimes adjusting the window itself helps more than pushing through.',
      'IF has been a bit sporadic {period}. No pressure. Even a looser consistent window is better than inconsistency.',
    ],
  },

  if_late_close: {
    title: 'Eating Window',
    positive: false,
    db: {
      pattern: [
        'The eating window has been running about {avg} hours longer than intended on most days {period}. Evening eating tends to be where extra calories sneak in.',
        'Window has been closing later than planned on {days} of your last {window} logged IF days. Late-night eating is one of the most consistent patterns in exceeding calorie goals.',
        'Most days {period} the eating window ran significantly longer than the {method} target. Worth looking at what is driving the late extension.',
      ],
    },
    mindful: [
      'The eating window has been running a bit longer than planned most days. That is really common. Worth a gentle look at what is happening in the evenings.',
      'We noticed the fasting window has been closing later than intended. Evening eating is a very common pattern. Just something to be aware of.',
      'The eating window has been extending into the evening most days. That is okay. Just holding it in mind might help.',
    ],
  },

  if_consistent: {
    title: 'Fasting Streak',
    positive: true,
    db: {
      insight_all: [
        'Fasting window hit within 30 minutes of target on {days} of your last {window} logged days. That discipline is where IF actually delivers its benefit.',
        'Incredibly consistent fasting window {period}. This level of adherence is what separates IF as a real tool from a loose concept.',
        'Window consistency has been excellent {period}. The metabolic benefit of IF comes from exactly this kind of regularity.',
      ],
    },
    mindful: [
      'Your fasting rhythm has been really consistent {period}. That kind of routine can feel grounding.',
      'The fasting window has been steady and consistent all week. Building a rhythm like this is meaningful.',
      'Really consistent with the fasting window {period}. Routines like this tend to make everything feel more manageable.',
    ],
  },

  // ── WEIGHT TREND ─────────────────────────────────────────────────────────────

  weight_plateau: {
    title: 'Weight Plateau',
    positive: false,
    db: {
      urgent_lose: [
        'Weight has been flat for about {days} days despite consistent logging. A plateau usually means one of three things: calories are closer to maintenance than they appear, burn is being overestimated, or logging has some gaps.',
        'No meaningful weight change in two weeks. Plateaus almost always have a cause. The most common are logging gaps, liquid calories, and burn accuracy.',
        'Weight has been flat for {days} days while targeting a cut. That usually means the actual deficit is smaller than the numbers suggest.',
      ],
      urgent_gain: [
        'Weight has not moved in about {days} days while targeting a gain. On a bulk, a plateau means intake probably needs to go up.',
        'Flat weight for {days} days on a gaining goal. The body needs a consistent surplus to build. Intake may need to increase.',
        'No weight change over the last two weeks while bulking. Worth checking intake. The surplus may have closed.',
      ],
    },
    mindful: [
      'Things have felt pretty steady on the scale lately. Sometimes the body needs a little shift in routine, not a big one. Just something small.',
      'We noticed things have been stable for a little while. Plateaus are really normal. If you want, we can look at what might be contributing.',
      'The body has been in a holding pattern lately. That is so common. Sometimes a small change is all it takes to shift things.',
    ],
  },

  weight_wrong_direction: {
    title: 'Weight Trend',
    positive: false,
    db: {
      pattern_lose: [
        'Weight has been trending up {period} while you are targeting a cut. The net calorie picture is worth a closer look.',
        'Moving in the wrong direction on the scale {period}. Something in the pattern, logging, burn, or intake, is not matching the goal.',
        'Weight has been climbing while you are trying to cut. That usually means the actual deficit is not as large as it appears.',
      ],
      pattern_gain: [
        'Weight has been drifting down {period} while you are trying to build. Intake probably needs to go higher.',
        'Moving in the wrong direction while bulking. The surplus may have closed. Worth pushing intake up.',
        'Weight trending down on a gaining goal. The body needs a consistent surplus to build. Intake needs to be higher.',
      ],
    },
    mindful: [
      'Things have been moving in an unexpected direction lately. It might be worth taking a gentle look at what is happening.',
      'We noticed the scale has been shifting in a way that does not match your goal. Small adjustments often make a big difference.',
      'There is a pattern forming that is working against your goal. Worth a gentle look, no pressure.',
    ],
  },

  weight_on_track: {
    title: 'Weight Progress',
    positive: true,
    db: {
      insight_lose: [
        'Weight has been trending in the right direction {period}, moving at a pace consistent with your {paceLabel} goal. The pattern is working.',
        'Solid weight trend {period}, moving toward your goal at a healthy rate. Keep doing what you are doing.',
        'Weight is moving in the right direction and at a meaningful pace. This is what consistent effort looks like.',
      ],
      insight_maintain: [
        'Weight has been remarkably stable {period}, within a very tight range. That is exactly what maintaining looks like when the pattern is right.',
        'Extremely consistent weight {period}. Maintenance is harder than most people realize. You are doing it well.',
        'Weight has barely moved all week while targeting maintenance. Solid execution.',
      ],
      insight_gain: [
        'Weight has been trending up at a healthy pace {period}, consistent with your gaining goal. The surplus is working.',
        'Good weight trend {period} on a gaining goal. Moving in the right direction at a rate that suggests quality gain.',
        'Weight is climbing at a solid pace {period}. Stay the course.',
      ],
    },
    mindful: [
      'Things feel like they are moving in a good direction. Keep showing up the same way.',
      'We noticed things are trending well. Whatever you have been doing is working.',
      'Progress is happening. You are doing something right.',
    ],
  },

  weight_infrequent: {
    title: 'Weigh-In Pattern',
    positive: false,
    db: {
      insight_all: [
        'Only {count} weigh-ins in the last two weeks. Consistent weigh-ins at the same time of day give a much clearer picture of what is actually happening.',
        'Sparse weigh-in data {period}. Hard to spot a trend with only {count} data points. Daily weigh-ins at the same time dramatically improve the signal.',
        'Few weigh-ins {period}. The trend is hard to read without consistent data. Same time of morning before eating gives the most accurate picture.',
      ],
    },
    mindful: [],
  },

  // ── CONSISTENCY ──────────────────────────────────────────────────────────────

  log_consistency_low: {
    title: 'Logging Consistency',
    positive: false,
    db: {
      pattern: [
        'Only {days} logged days {period}. The patterns we can surface are only as good as the data we have to work with.',
        'Logging has been sparse {period}, {days} out of 7 days. Consistent logging is what makes the insights useful.',
        'Light logging week, {days} days with entries. The more complete the picture, the more meaningful what we surface.',
        'Only {days} days with entries {period}. Patterns need a few more days behind them before they mean much.',
        'A thin week for logging, {days} days in total. The picture sharpens quickly once there is a little more to read.',
      ],
      urgent: [
        'Very few logged days {period}, just {days}. Without consistent data, it is hard to know what is actually happening.',
        'Almost no logging {period}. There is not enough here yet for us to surface anything useful.',
        'Only {days} logged days {period}. Even partial logs are better than none. They help us understand the picture.',
        'Just {days} logged days {period}. There is not quite enough here yet to say anything useful about what is happening.',
        'Very little logged {period}. Even a few more days would be enough to start seeing the shape of things.',
      ],
    },
    mindful: [
      'Logging has been lighter {period}. No worries at all. Even a partial log helps us understand your patterns better.',
      'We noticed fewer logged days {period}. Whatever you are able to log is helpful. There is no pressure to be perfect.',
      'Logging has been a bit sparse. That is okay. We work with whatever you give us, and every entry adds to the picture.',
      'Logging has been light {period}, and that is completely fine. Whatever you record still adds to the picture.',
      'Fewer entries than usual lately. No pressure to catch up, and anything you log from here helps.',
    ],
  },

  weekend_spike: {
    title: 'Weekend Pattern',
    positive: false,
    db: {
      insight_all: [
        'Weekdays have been on track, but weekends have averaged about {gap} kcal higher. Over a month, that difference offsets a significant portion of the weekday work.',
        'There is a clear weekday vs weekend pattern in the data. The weekend surplus tends to close the weekday deficit more than most people realize.',
        'Strong weekdays, higher weekends, a {gap} kcal average gap. It is one of the most common patterns and one of the hardest to see without the data.',
      ],
    },
    mindful: [
      'There is a pattern where weekdays look different from weekends. That kind of rhythm is really common. Just worth being aware of.',
      'We noticed things tend to shift between weekdays and weekends. That is incredibly normal. Something to gently hold in mind.',
      'Weekday patterns and weekend patterns look a bit different in the data. Super common. Something to gently be aware of.',
    ],
  },

  log_streak_strong: {
    title: 'Logging Streak',
    positive: true,
    db: {
      insight_all: [
        '{streak} consecutive days of logging. That is the kind of consistency that makes every other insight more reliable and actionable.',
        '{streak} days of logging in a row. The data is the most complete it has been. Patterns this clear are rare and valuable.',
        '{streak} days straight. Logging streaks like this are where the real signal starts to emerge.',
      ],
    },
    mindful: [
      'You have logged {streak} days in a row. That kind of showing up for yourself matters.',
      '{streak} days of logging straight. Not because you have to, because you chose to. That is real commitment.',
      '{streak} consecutive logged days. You have been showing up consistently. That is worth acknowledging.',
    ],
  },

  // ── CROSS-SIGNAL ─────────────────────────────────────────────────────────────

  cross_protein_sleep: {
    title: 'Protein and Sleep',
    positive: false,
    db: {
      insight_all: [
        'Sleep scores average {delta} points lower on nights after days when protein is below your goal. Low protein days and poor sleep nights are showing up together more often than chance.',
        'There is a real pattern in your data: sleep quality drops on nights following low-protein days, about {delta} points on average. Protein affects sleep in ways most people do not expect.',
        'Your data shows sleep scores are about {delta} points lower after low-protein days. That is not a coincidence. Protein plays a real role in sleep quality.',
      ],
    },
    mindful: [
      'We noticed sleep tends to be better on days when protein is higher. Interesting pattern worth paying attention to.',
      'There is something in your data: higher protein days seem to be followed by better nights. Worth noticing.',
      'Sleep quality and protein intake seem to be connected in your data. When protein is higher, rest tends to be better.',
    ],
  },

  cross_sodium_scale: {
    title: 'Sodium and the Scale',
    positive: false,
    db: {
      insight_all: [
        'Weight reads about {delta} lbs higher the morning after high-sodium days. That is water retention. Sodium pulls water into your cells. The scale is lying to you on those mornings.',
        'High sodium days consistently show up before higher scale readings the next morning. It is {delta} lbs on average, and it is water, not fat. Do not let it derail you.',
        'There is a {delta} lb average spike on the scale after high-sodium days. Worth knowing: that reading is water retention, not progress lost. It clears in 24 to 48 hours.',
      ],
    },
    mindful: [
      'There is a pattern where the scale reads differently after higher-sodium days. That is just how the body handles salt. It is not the full picture.',
      'We noticed scale readings tend to be higher after saltier days. That is a water thing, not a fat thing. The body is just doing what bodies do.',
      'Scale readings and sodium intake seem to be connected in your data. After higher-sodium days, the scale tends to read higher. It is just water fluctuation.',
    ],
  },

  cross_high_burn_overeating: {
    title: 'Big Burn Days',
    positive: false,
    db: {
      pattern: [
        'On days after a big burn, intake tends to run about {delta} kcal higher than usual. The deficit from the hard workout ends up mostly offset by the next day\'s eating. Worth being intentional about it.',
        'High-burn days are consistently followed by higher-intake days, about {delta} kcal higher on average. The body asks for it back. Whether you give it is the question.',
        'There is a clear pattern: big burn days lead to bigger eating days. {delta} kcal higher on average the day after. Anticipating it makes it easier to manage.',
      ],
    },
    mindful: [
      'We noticed that after big movement days, the next day tends to feel hungrier. That is really normal. Just something to be aware of.',
      'After active days, there is a pattern of eating a bit more the following day. The body is asking for what it used. That is completely natural.',
      'There is something in your data: days after big activity tend to bring bigger hunger. Your body is communicating. It is worth listening to.',
    ],
  },

  cross_sleep_intake: {
    title: 'Sleep and Appetite',
    positive: false,
    db: {
      insight_all: [
        'On days after a rough night, intake runs about {delta} kcal higher than after good sleep. Poor sleep drives hunger. Ghrelin goes up, leptin goes down. It is biology, not willpower.',
        'There is a {delta} kcal difference in intake between days following poor sleep vs good sleep. You eat more after bad nights. Understanding that pattern is the first step to managing it.',
        'Your data shows a clear connection: rough nights consistently lead to higher intake the next day, about {delta} kcal on average. Sleep and eating are more connected than most people realize.',
      ],
    },
    mindful: [
      'There is a beautiful pattern here: days after better sleep tend to feel more balanced overall. Sleep is doing more work than most people realize.',
      'We noticed something: after good nights of sleep, days tend to feel more settled, including around food. Rest really does matter.',
      'Sleep and how you eat the next day seem to be connected in your data. Better sleep, more ease. It is worth paying attention to.',
    ],
  },

  cross_workout_intake: {
    title: 'Workout vs Rest Days',
    positive: false,
    db: {
      pattern_lose: [
        'Net calories run about {delta} kcal higher on non-workout days vs workout days. Rest days are quietly becoming eating days. Worth being as intentional on rest days as training days.',
        'On days without a workout, intake tends to be about {delta} kcal higher. The discipline from training days does not always carry over, and that gap matters on a cut.',
        'Workout days and rest days are showing very different net calorie numbers, about {delta} kcal apart. Rest days are where the deficit tends to close.',
      ],
    },
    // Added 2026-08-07. This pool was EMPTY, so a Mindful user with growth areas turned on fell through to
    // the standard copy above and read "rest days are quietly becoming eating days" and "the discipline
    // from training days does not always carry over". Opting into growth areas means they want the signal,
    // not the judgment framing Mindful exists to avoid.
    mindful: [
      'We noticed eating tends to be a little fuller on days without a workout, around {delta} calories more than training days. Bodies ask for different things on different days, and noticing the pattern is the useful part.',
      'There is a gentle pattern here: intake runs about {delta} calories higher on rest days than on days you train. Worth holding in mind, not worth worrying about.',
      'Rest days and training days are showing different intake patterns, about {delta} calories apart. Nothing wrong with that. That is simply what your data is showing you.',
    ],
  },

  cross_steps_sleep: {
    title: 'Steps and Sleep',
    positive: true,
    db: {
      insight_all: [
        'Sleep scores average {delta} points higher on nights after days you hit your step goal. Daily movement, not just formal exercise, has a real impact on sleep quality.',
        'There is a {delta} point sleep score difference between high-step days and low-step days. Movement during the day is one of the most underrated sleep interventions.',
        'Your data shows a clear link: hitting your step goal is followed by better sleep, about {delta} points better. Move more during the day, sleep better at night.',
      ],
    },
    mindful: [
      'There is a lovely pattern here: days with more movement tend to be followed by better sleep. Your body knows.',
      'We noticed something beautiful: step-goal days tend to be followed by better nights. Movement and rest are connected in a real way.',
      'Days when you move more seem to lead to better sleep. Your data shows it clearly. Movement during the day is a gift to your nighttime self.',
    ],
  },

  cross_fiber_calorie: {
    title: 'Fiber and Hunger',
    positive: true,
    db: {
      insight_all: [
        'Intake runs about {delta} kcal higher on days when fiber is low. Fiber is one of the most underrated tools for hunger management. It is not just a nutrition metric.',
        'There is a {delta} kcal difference in intake between high-fiber and low-fiber days. Fiber makes you feel fuller longer. The data backs it up.',
        'Low-fiber days consistently lead to higher intake, about {delta} kcal more. Fiber slows digestion and manages hunger in ways that most people underestimate.',
      ],
    },
    mindful: [
      'Days with more fiber in the diet tend to feel more satisfying overall. It is one of those quiet factors that makes a big difference in how full and energized you feel.',
      'We noticed something in your data: higher-fiber days seem to feel more balanced around food. Fiber is doing quiet, important work.',
      'There is a pattern: days with more fiber feel more settled around hunger. Your data reflects something nutritionists have known for a long time.',
    ],
  },

  // ── RECOVERY (cross-signal, graduated from the Recovery coach) ───────────────

  rec_load_drag: {
    title: 'Recover From Your Hard Days',
    positive: false,
    db: {
      insight_all: [
        'Your recovery runs about {delta} points lower the day after your hardest training days. The fix usually is not training harder, it is protecting an easy day so your body absorbs the work.',
        'There is a clear pattern: recovery dips around {delta} points the day after your highest-effort days. Hard work only pays off if you let your body catch up after it.',
        'Recovery averages {delta} points lower following your biggest training days. An easy or deload day after hard sessions is what turns that effort into progress.',
      ],
    },
    mindful: [
      'We noticed recovery tends to be a little lower the day after your hardest sessions. That is your body asking for an easier day. Worth listening to.',
      'There is a gentle pattern here: big effort days are followed by lower recovery. Giving yourself room to rest after them is a kindness your body appreciates.',
      'After your hardest days, recovery tends to dip. That is completely normal. An easy day afterward lets the work settle in.',
    ],
  },

  rec_tracks_sleep: {
    title: 'Sleep Is Your Lever',
    positive: false,
    db: {
      insight_all: [
        'Your recovery averages about {delta} points lower after short nights than after fuller ones. Your lowest recovery days are following your shortest sleep, not your hardest workouts. Sleep looks like your main lever right now.',
        'There is a real connection in your data: recovery drops around {delta} points after nights under your sleep goal. The gym is not what is holding your recovery back, sleep is.',
        'Recovery runs {delta} points lower on the days after short sleep. If you want to move the number, sleep is the place to start, not training volume.',
      ],
    },
    mindful: [
      'We noticed recovery tends to be better after fuller nights of sleep. Rest seems to be doing more for you than anything happening in the gym.',
      'There is a beautiful pattern here: the nights you sleep more are followed by better recovery. Sleep is quietly doing a lot of work.',
      'Your recovery and your sleep seem closely connected. Fuller nights, better recovery. It is worth paying attention to.',
    ],
  },

  rec_sustained_low: {
    title: 'Time for a Lighter Week',
    positive: false,
    db: {
      pattern: [
        'Recovery has averaged {mean} across the recent stretch while your training held steady. That pattern usually means a lighter week, not more effort, is what moves it.',
        'Your recovery has run below par for most of the recent window while training stayed constant. When recovery stalls like this, backing off is what lets it climb.',
        'Recovery has settled around {mean} lately even though training has not eased up. A genuinely lighter week is often what breaks that holding pattern.',
      ],
    },
    mindful: [
      'Recovery has been sitting on the lower side for a while now, even as you have kept training. Your body might be asking for a lighter week.',
      'We noticed recovery has held low through a steady stretch of training. Sometimes the most productive thing is to ease off and let it catch up.',
      'There is a pattern of lower recovery alongside steady training lately. A softer week could be exactly what helps it recover.',
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function pickVariant(
  pool: string[],
  lastIndex: number | undefined,
): { text: string; index: number } {
  if (!pool || pool.length === 0) return { text: '', index: 0 };
  if (pool.length === 1) return { text: pool[0], index: 0 };
  const next = lastIndex !== undefined ? (lastIndex + 1) % pool.length : 0;
  return { text: pool[next], index: next };
}

export function fillSlots(template: string, slots: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(slots[key] ?? `{${key}}`));
}
