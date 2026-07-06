// data/whatsNew.ts
//
// Release notes shown on the What's New page (app/whats-new.tsx), permanently reachable from
// Settings > About, and surfaced ONCE per release via an Otto hub notification.
//
// TO PUBLISH A NEW RELEASE: bump `releaseId` to any new string and update `version` + `highlights`.
// Bumping releaseId re-fires the one-time notification (gated on releaseId, not the app version,
// since EAS versions remotely). The page and the Settings entry always show whatever is here.
//
// A highlight card renders `body` as a paragraph OR `bullets` as a list (the Fixes card uses bullets).

export interface WhatsNewItem {
  icon: string;       // Ionicon name
  title: string;
  body?: string;      // paragraph card
  bullets?: string[]; // bulleted card (use instead of body)
}

export interface WhatsNewRelease {
  releaseId: string;   // bump to re-surface the one-time notification
  version: string;     // display label, e.g. "July Update"
  highlights: WhatsNewItem[];
}

export const WHATS_NEW: WhatsNewRelease = {
  releaseId: '2026-07-05',
  version: 'July Update',
  highlights: [
    {
      icon: 'sparkles',
      title: 'Meet Otto',
      body: "Otto is your in-app guide. Ask him anything about how the app works, or about your own data: your workouts, food, sleep, PRs, body measurements, achievements, and more. Not sure how something works? He can pull up a quick tutorial and walk you through it. Tap his button anytime.",
    },
    {
      icon: 'heart',
      title: 'Halo is smarter now',
      body: "Tell your faith companion what you are walking through and she can point you to a devotional or reading plan that fits, with a tap to open it. She can also answer how faith features work and help you jump to Prayer, the Bible, or your Journal right from the chat.",
    },
    {
      icon: 'barbell',
      title: 'A big workout upgrade',
      body: "Strength workouts from Apple Health now show as proper sessions with your heart rate and calories. There is a manual timer for no-watch workouts, and the workout summary was redesigned with a per-lift breakdown. Plus PR tracking: your personal records are logged per lift, with an All-PRs view and full history.",
    },
    {
      icon: 'flame',
      title: 'A calorie target that adapts',
      body: "Instead of one fixed number set at signup, the app can now estimate your real daily burn from your weight trend and suggest a target that keeps up with your body. It adjusts as your results come in, so what you are aiming for stays honest instead of going stale.",
    },
    {
      icon: 'construct',
      title: 'Fixes & Improvements',
      bullets: [
        'Food photos now back up automatically, so they are never lost',
        'More accurate active calorie goals',
        'Workout stats and counts are more accurate',
        'Achievement trophies pop the moment you earn them, on the right day',
        'New Recovery Score, HRV, and VO2 Max graphs in Stats',
        'Net carbs now match everywhere in the app',
        'Sort your reading plans and devotionals',
        'A View All Achievements shortcut on the Stats tab',
      ],
    },
  ],
};
