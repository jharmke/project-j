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
    calculation: "Your watch records it through the day and overnight. We take your day's resting value and compare it to your 7-day baseline.",
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
};
