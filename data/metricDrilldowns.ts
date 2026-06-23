// data/metricDrilldowns.ts
// Per-metric content for the Sleep & Recovery metric drill-down modal.
// The modal renders this content; the live value, status, reference line, and
// which improve tip(s) show are assembled by the screen so the tips reflect the
// user's REAL standing, not a generic one-size message (SPEC_sleep.md Section 13).
//
// improve() returns a POOL of tips per standing. The screen shows 2 at a time and
// rotates which 2 across opens (sleep.tsx pickTwo + drillTipRotRef), so repeat
// visits surface different, genuinely useful tips instead of the same pair forever.
//
// Copy strings are double-quoted so apostrophes read naturally. No double-dash in
// any string: these are user-facing. Avoid the word "lever" per app voice.

export interface MetricDrilldownContent {
  title: string;
  definition: string;   // what it is
  calculation: string;  // how it is calculated / where it comes from
  affects: string;      // what it affects / why it matters
  // Improve-tip POOL selected by the user's current standing. Most metrics pass a boolean
  // (true = healthy direction, false = worth watching, null = informational). Sleep Score
  // passes its raw 0-100 number so it can return a 3-tier pool (strong / decent / low).
  // The screen picks 2 from the returned pool and rotates them across opens.
  improve: (standing: boolean | number | null) => string[];
  informationalOnly?: boolean; // SpO2 etc: show info, never prescribe action
  disclaimer?: string;
}

export const METRIC_DRILLDOWNS: Record<string, MetricDrilldownContent> = {
  hrv: {
    title: "HRV (Overnight)",
    definition: "Heart rate variability is the tiny variation in time between your heartbeats. More variation is the good kind: it means your nervous system is relaxed and adaptable rather than under strain.",
    calculation: "Your watch measures it overnight (a metric called SDNN). We average the readings across your sleep window into one daily number, then compare it to your 7-day baseline. Devices measure HRV differently, so watch your own trend rather than comparing this number to a friend's ring or strap.",
    affects: "HRV is one of the clearest recovery signals you have. At or above your baseline, your body has absorbed recent stress and training. A clear drop means it is still catching up.",
    improve: (isGood) => isGood
      ? [
          "Your HRV is at or above your baseline, a sign your nervous system has recovered. A good day to train hard if your plan calls for it.",
          "High HRV nights tend to follow days with steady nutrition, moderate activity, and manageable stress. Worth noting what yesterday looked like.",
          "HRV above baseline is a good sign, but stability over weeks tells you more than any single strong reading.",
          "Strong HRV means your body absorbed recent training and stress well. Trust it when deciding how hard to push today.",
          "When your HRV is this healthy, the goal is to protect the habits that got you here: consistent sleep and a sensible training load.",
        ]
      : [
          "Slow breathing at five to six breaths per minute stimulates the nerve that calms your heart rate. Ten minutes before bed is a good window to try it.",
          "Alcohol suppresses overnight HRV even in small amounts, often more than a hard workout does. The effect shows up even when sleep feels normal.",
          "Your HRV is below baseline. Prioritize sleep tonight and keep today on the easier side: it rebounds faster with recovery than with pushing through.",
          "A sudden drop with no training reason can show up a day or two before you feel run down, so watch how you feel before training hard.",
          "Getting to bed earlier tends to lift HRV, since when you sleep affects it almost as much as how long you sleep.",
        ],
  },
  rhr: {
    title: "Resting Heart Rate",
    definition: "Resting heart rate is how many times your heart beats per minute when you are fully at rest. Lower generally points to a fitter, more recovered heart.",
    calculation: "Your watch records it through the day and overnight. For your recovery read we take your overnight average across the same sleep window your HRV uses and compare it to your 7-day baseline, so daytime activity doesn't skew it.",
    affects: "An elevated resting heart rate is a classic recovery-debt signal. It tends to climb with accumulated training strain, poor sleep, stress, dehydration, or the early onset of illness.",
    improve: (isGood) => isGood
      ? [
          "Your resting HR is at or below your baseline, a good recovery sign. Carry on with your plan.",
          "A low resting heart rate reflects cardiac efficiency built over time. It is one of the most reliable long-term fitness markers there is.",
          "Resting HR is a lagging signal. What you do this week tends to show up in next week's number.",
          "At this level your heart is doing the same work with less effort, and that efficiency carries straight into your training.",
          "Steady moderate cardio is what keeps resting HR low over time, more so than hard interval work. Consistency is doing the job here.",
        ]
      : [
          "Your resting HR is up versus baseline. Treat today as a lighter day, hydrate well, and protect tonight's sleep.",
          "Even mild dehydration raises resting HR by several beats. Check your water intake on the days it reads higher.",
          "Caffeine in the afternoon keeps resting HR elevated into the night, even when you fall asleep fine. Pulling your last cup earlier can help.",
          "Resting HR climbs before you feel fatigued or ill, so an elevated reading with no clear training reason is a fair signal to back off.",
          "If it stays elevated for several days with no obvious cause, it can be an early illness signal worth keeping an eye on.",
        ],
  },
  resp: {
    title: "Respiratory Rate",
    definition: "Respiratory rate is how many breaths you take per minute overnight. For most people it is remarkably steady from night to night.",
    calculation: "Measured by your watch during sleep. We average your sleep-window reading and compare it to your 7-day baseline.",
    affects: "Because it is normally so stable, even a small jump in overnight breathing can flag stress, illness, alcohol, or a hard day before you consciously feel it.",
    improve: (isGood) => isGood
      ? ["Your respiratory rate is steady and in line with your baseline. Nothing to act on here."]
      : ["Your overnight breathing is running a touch high versus your norm. It often leads how you feel by a day or two, so keep today sensible and watch how you bounce back."],
  },
  activity: {
    title: "Previous Day Activity",
    definition: "This is how many active calories you burned yesterday, the day that most shapes how recovered you are today.",
    calculation: "Pulled from Apple Health and adjusted by your burn accuracy setting, then compared to your 7-day average daily burn.",
    affects: "Recovery is two-sided here. A much bigger day than usual adds fatigue you are still clearing. A much lighter day can mean less of the easy movement that actually helps you recover.",
    improve: (isGood) => isGood
      ? [
          "Yesterday's activity was close to your typical day, and that steadiness supports good recovery.",
          "Moderate activity tends to support recovery rather than tax it. Your body responds well to consistent movement.",
          "The balance between yesterday's load and today is working. Worth maintaining.",
          "Consistent moderate activity builds the cardiovascular efficiency that shows up long-term in your resting HR and HRV.",
        ]
      : [
          "If yesterday was a big day, expect some fatigue today and scale the intensity. Your body rebuilds during recovery, not during the work itself.",
          "Elevated resting HR and lower HRV after a hard session are normal physiological responses, not warning signs.",
          "A hard day followed by a dip in recovery is what productive training looks like. The goal is bouncing back, not avoiding the dip.",
          "If yesterday was very light, some easy movement today keeps recovery flowing. Too little activity can stall it as much as too much.",
        ],
  },
  sleepScore: {
    title: "Sleep Score",
    definition: "Your sleep score grades last night out of 100, based on how long you slept and how much deep and REM sleep you got.",
    calculation: "Built from your sleep duration against your goal plus your deep and REM percentages. The full stage-by-stage breakdown lives on the Sleep tab.",
    affects: "Sleep is the single biggest driver of recovery. A strong night lifts your recovery score and everything downstream: HRV, resting heart rate, and how you feel.",
    improve: (standing) => {
      const score = typeof standing === 'number' ? standing : standing === true ? 100 : standing === false ? 0 : null;
      if (score === null) return [];
      return score >= 85
        ? [
            "Last night scored well. Keeping a steady bedtime is the simplest way to repeat it.",
            "A strong score reflects the right combination working together: enough hours, efficient sleep, and a good stage balance.",
            "Consecutive strong nights build on each other. Your body rebuilds best when recovery is consistent rather than occasional.",
            "Your score reflects genuine recovery, so trust it when deciding how hard to push today.",
          ]
        : score >= 70
        ? [
            "A solid night with room to climb. An earlier, steadier bedtime usually nudges your deep and REM up.",
            "If your hours look fine but the score sits here, stage balance is usually the reason. Your deep and REM percentages are the place to look.",
            "Consistent sleep timing often moves this number more than simply adding hours does.",
            "You are close. Tightening your bedtime by half an hour tends to be what pushes a decent night into a strong one.",
          ]
        : [
            "Open the Sleep tab for the stage-by-stage breakdown. An earlier, steadier bedtime is usually the fastest win.",
            "A low score reflects the full picture: duration, efficiency, and stage balance all matter, and one strong piece does not carry the rest.",
            "Erratic bedtimes tend to show up here first. Holding a consistent time, weekends included, is often what turns it around.",
            "If duration looks okay but the score is low, your deep and REM percentages are where to focus.",
          ];
    },
  },
  spo2: {
    title: "Blood Oxygen (SpO2)",
    definition: "Blood oxygen is the percentage of oxygen your red blood cells are carrying. For most people at rest it sits between 95 and 100 percent.",
    calculation: "Spot-measured by your watch, often overnight. We show your most recent reading. It is not part of your recovery score.",
    affects: "It is shown for awareness only. Occasional dips can come from how you slept or from sensor placement rather than anything meaningful.",
    improve: () => [],
    informationalOnly: true,
    disclaimer: "This is informational only and not a medical measurement. If you have ongoing concerns about your blood oxygen, talk to a doctor.",
  },

  // Sleep tab metrics (Sleep Metrics card rows).
  deep: {
    title: "Deep Sleep",
    definition: "Deep sleep is the most physically restorative stage, when your body repairs muscle, strengthens the immune system, and releases most of its growth hormone. A healthy night spends roughly 13 to 23 percent here.",
    calculation: "We average the deep-sleep share of each night across the range you are viewing, then compare it to the healthy range and your personal norm.",
    affects: "Deep sleep is where most physical recovery happens. Consistently low deep sleep tends to show up as feeling unrested even after enough hours in bed.",
    improve: (isGood) => isGood
      ? [
          "Your deep sleep is in a healthy range. Whatever your evening routine looks like, it is working for this stage.",
          "Strong deep sleep means your body is getting the physical repair it needs. You should feel it in your energy and recovery.",
          "Deep sleep above the healthy range after hard training is your body taking what it earned. A good sign, not a problem.",
          "Deep sleep is hard to fake, so a solid number reflects real recovery. Protecting your bedtime keeps it there.",
          "Most of your deep sleep loads into the first half of the night, so the steady bedtime you are keeping is doing quiet work.",
        ]
      : [
          "Deep sleep loads into the first part of the night, so an earlier bedtime adds more of it than a later one of the same length.",
          "Alcohol reliably cuts deep sleep even when it helps you fall asleep faster. Total time looks fine but the quality takes the hit.",
          "A large meal close to bed keeps your core temperature up, which competes with the cooling your body needs to drop into deep sleep.",
          "Your body temperature falling is what triggers deep sleep, so a cooler room genuinely helps. Even a small reduction makes a difference.",
          "Deep sleep is when your body does most of its physical repair, so protecting it matters most the night after a hard workout.",
        ],
  },
  rem: {
    title: "REM Sleep",
    definition: "REM is the dreaming stage that supports memory, learning, and emotional reset. A healthy night spends roughly 20 to 25 percent here.",
    calculation: "We average the REM share of each night across the range you are viewing, then compare it to the healthy range and your personal norm.",
    affects: "REM is where your brain processes the day and steadies your mood. Short REM tends to show up as feeling foggy or on edge, and it is often the first stage cut when a night runs short.",
    improve: (isGood) => isGood
      ? [
          "Your REM is in a healthy range. Protecting your total sleep time keeps it there, since REM stacks up in the later hours.",
          "Strong REM supports mood, memory, and emotional processing, doing real work even when you do not notice it.",
          "Good REM tends to follow consistent sleep timing more than anything else. Your body knows when to expect it.",
          "REM above your baseline after a mentally demanding stretch is your brain catching up. Let it.",
          "Since REM comes mostly in the back half of the night, the full nights you are getting are exactly what protect it.",
        ]
      : [
          "Most REM happens in the last couple hours of sleep, so cutting your night short by even ninety minutes removes a disproportionate amount.",
          "An earlier bedtime usually adds REM, not just total hours, because it gives those final REM-heavy cycles room to happen.",
          "Alcohol suppresses REM in the second half of the night even after it has metabolized, so the disruption comes later than you would expect.",
          "Stress and late screens both reduce REM by keeping your nervous system partly switched on. A real wind-down routine helps more than most sleep tips.",
          "Low REM over several nights often shows up as feeling foggy or on edge before you notice any physical tiredness.",
        ],
  },
  bedtime: {
    title: "Bedtime Consistency",
    definition: "This is your typical bedtime and how tightly your nights cluster around it. Your body runs on an internal clock, and a steady bedtime is one of the strongest signals you can give it.",
    calculation: "We take your typical bedtime across your nights and measure how much it varies. Tightly clustered nights read as consistent; a wide spread reads as variable.",
    affects: "A consistent bedtime helps you fall asleep faster and lifts quality across every sleep stage. Swinging bedtimes act a bit like jet lag, even when the total hours are the same.",
    improve: (isGood) => isGood
      ? [
          "Your bedtimes are clustering tightly. That consistency is doing quiet work for every other sleep number.",
          "A steady bedtime directly supports HRV, deep sleep, and REM quality over time. It is one of the most impactful sleep habits there is.",
          "Your body clock is well anchored, and that predictability does more for your sleep quality than most supplements or sleep aids.",
          "This kind of consistency shows up quietly in every other sleep metric over the following weeks.",
          "The hard part is holding this on weekends. Keeping it steady through days off is what locks in the benefit.",
        ]
      : [
          "Pick one target time and hold it within thirty minutes, weekends included. It is usually the single highest-impact sleep change you can make.",
          "If a hard cutoff feels tough, anchor your wake time first. A steady morning tends to pull your bedtime into line over a week or two.",
          "A shifting bedtime disrupts your body clock even when the total hours look fine, since your body uses consistent timing to run its overnight rhythm.",
          "Weekend drift is the usual culprit. Even a one-hour shift creates a mini jet lag effect that carries into the week.",
          "Your body starts winding down a couple hours before your usual bedtime, so an unpredictable schedule keeps that preparation from happening on time.",
        ],
  },
  sleepBalance: {
    title: "Sleep Balance",
    definition: "Sleep balance is how your actual sleep stacks up against your goal across the range you are viewing. A surplus means you are banking enough; a deficit means you are running short.",
    calculation: "We add up your sleep across the range and compare it to your goal for those nights, then show the running surplus or deficit.",
    affects: "Short-term sleep debt is real and it accumulates. A growing deficit tends to drag down energy, recovery, and mood before you consciously notice it.",
    improve: (isGood) => isGood
      ? [
          "You are at or above your goal across the range. That cushion is exactly what supports steady energy and recovery.",
          "Hitting your sleep goal night after night is where the real benefit builds. The effect compounds over weeks.",
          "Banking extra sleep ahead of a demanding stretch genuinely helps. Your body stores some of the benefit.",
          "A surplus after a run of short nights is your body catching up. Let it.",
          "Matching your goal consistently is harder than it sounds, and you are doing it.",
        ]
      : [
          "You do not need to repay sleep debt all at once. Even an extra thirty minutes a night chips away at it without disrupting your rhythm.",
          "Protecting your bedtime is more reliable than sleeping in, since a later wake time tends to push the next bedtime back too.",
          "Sleep debt builds faster than most people expect. Two nights of six hours takes more than one full night to recover from.",
          "A small ongoing shortfall, even thirty to sixty minutes a night, drags on mood and performance in ways that start to feel normal.",
          "Your brain is the last thing to tell you it is short on sleep, so performance and focus slip well before you feel tired.",
        ],
  },
  wakeEvents: {
    title: "Wake Events",
    definition: "This is how many times you briefly woke during the night, averaged across the range. A few brief awakenings are completely normal and most people never remember them.",
    calculation: "We average the number of awakenings your watch detected per night across the range, and compare it to your personal norm.",
    affects: "Frequent awakenings fragment sleep and eat into the deep and REM stages, so a night can look long on paper but still leave you unrested.",
    improve: (isGood) => isGood
      ? [
          "Your awakenings are in line with your norm. Nothing to act on here.",
          "Brief awakenings overnight are completely normal. What matters is falling back asleep quickly, and yours reflects that.",
          "A low number of wake events means your sleep is staying in the deeper stages longer, which is where recovery happens.",
          "Steady, unbroken sleep like this is what lets deep and REM run their full cycles.",
          "Whatever your current sleep setup is, it is keeping the night intact. Worth protecting.",
        ]
      : [
          "A cooler, dark room and easing off fluids before bed tend to reduce overnight awakenings.",
          "Alcohol fragments the second half of the night, causing more wake events even after it has metabolized.",
          "Side sleeping reduces airway obstruction, a common and overlooked cause of frequent waking.",
          "Caffeine later in the day and a warm or noisy room are the usual culprits worth ruling out first.",
          "If a high number keeps showing up with no clear cause, it is worth mentioning to a doctor. Sleep apnea is underdiagnosed and shows up exactly this way.",
        ],
  },
};
