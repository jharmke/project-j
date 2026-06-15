// data/metricDrilldowns.ts
// Per-metric content for the Sleep & Recovery metric drill-down modal.
// The modal renders this content; the live value, status, reference line, and
// which improve tip(s) show are assembled by the screen so the tips reflect the
// user's REAL standing, not a generic one-size message (SPEC_sleep.md Section 13).
//
// Copy strings are double-quoted so apostrophes read naturally. No double-dash in
// any string: these are user-facing.

export interface MetricDrilldownContent {
  title: string;
  definition: string;   // what it is
  calculation: string;  // how it is calculated / where it comes from
  affects: string;      // what it affects / why it matters
  // Improve tips selected by the user's current standing.
  // isGood: true = healthy direction, false = worth watching, null = neutral/informational.
  improve: (isGood: boolean | null) => string[];
  informationalOnly?: boolean; // SpO2 etc: show info, never prescribe action
  disclaimer?: string;
}

export const METRIC_DRILLDOWNS: Record<string, MetricDrilldownContent> = {
  hrv: {
    title: "HRV (Overnight)",
    definition: "Heart rate variability is the tiny variation in time between your heartbeats. More variation is the good kind: it means your nervous system is relaxed and adaptable rather than under strain.",
    calculation: "Your watch measures it overnight (a metric called SDNN). We average the readings across your sleep window into one daily number, then compare it to your 7-day baseline.",
    affects: "HRV is one of the clearest recovery signals you have. At or above your baseline, your body has absorbed recent stress and training. A clear drop means it is still catching up.",
    improve: (isGood) => isGood
      ? ["Your HRV is sitting at or above your baseline, a sign your nervous system is recovered. A good day to train hard if your plan calls for it."]
      : [
          "Your HRV is below your baseline. Prioritize sleep tonight and keep today on the easier side: HRV rebounds faster with recovery than with pushing through.",
          "Late alcohol, big late meals, dehydration, and stress all suppress overnight HRV. Trimming those usually lifts it within a few days.",
        ],
  },
  rhr: {
    title: "Resting Heart Rate",
    definition: "Resting heart rate is how many times your heart beats per minute when you are fully at rest. Lower generally points to a fitter, more recovered heart.",
    calculation: "Your watch records it through the day and overnight. For your recovery read we take your overnight average across the same sleep window your HRV uses and compare it to your 7-day baseline, so daytime activity doesn't skew it.",
    affects: "An elevated resting heart rate is a classic recovery-debt signal. It tends to climb with accumulated training strain, poor sleep, stress, dehydration, or the early onset of illness.",
    improve: (isGood) => isGood
      ? ["Your resting HR is at or below your baseline, a good recovery sign. Carry on with your plan."]
      : [
          "Your resting HR is up versus your baseline. Treat today as a lighter day, hydrate well, and protect tonight's sleep.",
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
      ? ["Yesterday's activity was close to your typical day. That steadiness supports good recovery."]
      : ["Yesterday was well off your usual load. If it was a big day, expect some fatigue and scale today's intensity. If it was very light, some easy movement today keeps recovery flowing."],
  },
  sleepScore: {
    title: "Sleep Score",
    definition: "Your sleep score grades last night out of 100, based on how long you slept and how much deep and REM sleep you got.",
    calculation: "Built from your sleep duration against your goal plus your deep and REM percentages. The full stage-by-stage breakdown lives on the Sleep tab.",
    affects: "Sleep is the single biggest lever on recovery. A strong night lifts your recovery score and everything downstream: HRV, resting heart rate, and how you feel.",
    improve: (isGood) => isGood
      ? ["Last night scored well. Keeping a steady bedtime is the simplest way to repeat it."]
      : ["Last night came in low. Open the Sleep tab for the stage-by-stage breakdown and what to target. An earlier, steadier bedtime is usually the fastest win."],
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
      ? ["Your deep sleep is sitting in a healthy range. Whatever your evening routine looks like, it is working for this stage."]
      : [
          "Your deep sleep is running below the healthy range. A cooler, darker room and avoiding alcohol or big meals within three hours of bed tend to protect it.",
          "Deep sleep loads into the earlier part of the night, so an earlier, steadier bedtime usually buys you more of it.",
        ],
  },
  rem: {
    title: "REM Sleep",
    definition: "REM is the dreaming stage that supports memory, learning, and emotional reset. A healthy night spends roughly 20 to 25 percent here.",
    calculation: "We average the REM share of each night across the range you are viewing, then compare it to the healthy range and your personal norm.",
    affects: "REM is where your brain processes the day and steadies your mood. Short REM tends to show up as feeling foggy or on edge, and it is often the first stage cut when a night runs short.",
    improve: (isGood) => isGood
      ? ["Your REM is in a healthy range. Protecting your total sleep time is the simplest way to keep it there, since REM stacks up in the later hours."]
      : [
          "Your REM is below the healthy range. Most REM happens in the back half of the night, so the biggest lever is simply sleeping longer. An earlier bedtime usually adds REM, not just hours.",
          "Alcohol and late screens both suppress REM, so easing off those close to bed tends to help.",
        ],
  },
  bedtime: {
    title: "Bedtime Consistency",
    definition: "This is your typical bedtime and how tightly your nights cluster around it. Your body runs on an internal clock, and a steady bedtime is one of the strongest signals you can give it.",
    calculation: "We take your typical bedtime across your nights and measure how much it varies. Tightly clustered nights read as consistent; a wide spread reads as variable.",
    affects: "A consistent bedtime helps you fall asleep faster and lifts quality across every sleep stage. Swinging bedtimes act a bit like jet lag, even when the total hours are the same.",
    improve: (isGood) => isGood
      ? ["Your bedtimes are clustering tightly. That consistency is doing quiet work for every other sleep number."]
      : [
          "Your bedtimes are swinging more than an hour. Picking one target time and holding it within thirty minutes, weekends included, is usually the highest-leverage sleep change you can make.",
          "If a hard cutoff feels tough, anchor your wake time first. A steady morning tends to pull bedtime into line over a week or two.",
        ],
  },
  sleepBalance: {
    title: "Sleep Balance",
    definition: "Sleep balance is how your actual sleep stacks up against your goal across the range you are viewing. A surplus means you are banking enough; a deficit means you are running short.",
    calculation: "We add up your sleep across the range and compare it to your goal for those nights, then show the running surplus or deficit.",
    affects: "Short-term sleep debt is real and it accumulates. A growing deficit tends to drag down energy, recovery, and mood before you consciously notice it.",
    improve: (isGood) => isGood
      ? ["You are at or above your goal across the range. That cushion is exactly what supports steady energy and recovery."]
      : [
          "You are carrying a sleep deficit across the range. You do not need to repay it all at once. Even an extra thirty minutes a night chips away at it without disrupting your rhythm.",
          "Protecting bedtime is more reliable than sleeping in, since a later wake time tends to push the next bedtime back too.",
        ],
  },
  wakeEvents: {
    title: "Wake Events",
    definition: "This is how many times you briefly woke during the night, averaged across the range. A few brief awakenings are completely normal and most people never remember them.",
    calculation: "We average the number of awakenings your watch detected per night across the range, and compare it to your personal norm.",
    affects: "Frequent awakenings fragment sleep and eat into the deep and REM stages, so a night can look long on paper but still leave you unrested.",
    improve: (isGood) => isGood
      ? ["Your awakenings are in line with your norm. Nothing to act on here."]
      : [
          "Your awakenings are running above your norm. A cooler room, easing off fluids and alcohol before bed, and keeping the room dark all tend to reduce them.",
          "If a high number keeps showing up, caffeine timing and a warm or noisy room are the usual culprits worth ruling out first.",
        ],
  },
};
