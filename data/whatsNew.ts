// data/whatsNew.ts
//
// Release notes shown on the What's New page (app/whats-new.tsx), permanently reachable from
// Settings > About, and surfaced ONCE per release via an Otto hub notification.
//
// TO PUBLISH A NEW PATCH: prepend a new WhatsNewRelease to WHATS_NEW_RELEASES with a fresh
// `releaseId`. WHATS_NEW auto-tracks the newest one (index 0) and drives the one-time notification
// (gated on releaseId, not the app version, since EAS versions remotely) + the Settings label.
// The page renders EVERY patch in the list, newest first, each under its own header.
//
// A highlight card renders `body` as a paragraph OR `bullets` as a list (the Fixes card uses bullets).

export interface WhatsNewItem {
  icon: string;       // Ionicon name
  title: string;
  body?: string;      // paragraph card
  bullets?: string[]; // bulleted card (use instead of body)
  // Renders the real gold Supporter hallmark instead of the Ionicon (see components/SupporterFoil).
  // For the card that announces the Supporter tier: it should wear the actual badge, not a stand-in.
  foil?: boolean;
}

export interface WhatsNewRelease {
  releaseId: string;   // bump/prepend a new one to re-surface the one-time notification
  version: string;     // display label, e.g. "Patch 2"
  date?: string;       // human-friendly release date shown beside the header, e.g. "July 8, 2026"
  highlights: WhatsNewItem[];
}

// Newest patch FIRST. WHATS_NEW (below) tracks index 0.
export const WHATS_NEW_RELEASES: WhatsNewRelease[] = [
  {
    releaseId: '2026-07-24',
    version: 'Patch 5',
    date: 'July 24, 2026',
    highlights: [
      {
        icon: 'book',
        title: 'A second Bible translation',
        body: "The World English Bible is here as a second translation option, and it's now the default (KJV is still there if you prefer it). The reader, Today's Message, Gratitude, Favorites, your saved verses, and even Halo's scripture all follow whichever one you pick.",
      },
      {
        icon: 'scan',
        title: 'Scan a nutrition label',
        body: "Point your camera at a nutrition facts panel and the app reads it for you: calories, macros, vitamins, minerals, even values only printed as a percent. A review screen shows exactly what it found before anything saves, with anything unclear flagged so you can double check it.",
      },
      {
        icon: 'resize',
        title: 'Serving sizes, your way',
        body: "Every place you set a food's amount (Create Food, Edit Food, logging, the Recipe Builder) now offers the right units for what you're measuring: ounces and pounds for weight, cups and milliliters for liquids. Foods remember which unit they were built in. You can also link a barcode straight to a food from its detail screen.",
      },
      {
        icon: 'bookmark',
        title: 'Save a meal, find a meal',
        body: "Save any combination of foods you've logged together as a named, reusable meal. Find a Meal (previously Repeat a Meal) now pulls from your recent history or your own saved meals, and works even after you've already started logging that mealtime.",
      },
      {
        icon: 'person-circle',
        title: 'Custom profile pictures',
        body: "Set a real photo for your profile, with a quick crop step built in, replacing your initials across the app.",
      },
      {
        icon: 'camera',
        title: 'Photos for your meals',
        body: "Attach a photo to any mealtime on the Log tab, separate from your individual foods, and see it on your Day Detail summary too. Recipes get the same option.",
      },
      {
        icon: 'calendar',
        title: 'Reading plans, refined',
        body: "Both reading plans and devotionals now track true completion, so a missed day no longer throws off your pace, and both get a Restart option once finished. Reading plans also have a full schedule page you can browse week by week.",
      },
      {
        icon: 'water',
        title: 'Water pace at a glance',
        body: "Your water card now shows a subtle marker for where you should be by this point in the day, without needing to open the detail view.",
      },
      {
        icon: 'construct',
        title: 'Fixes & Improvements',
        bullets: [
          "Food, water, and weight reminders no longer fire after you've already logged for the day",
          'Fixed a navigation haptic delay; taps now respond instantly',
          "Otto's floating button now glides between positions instead of jumping",
          'Fixed an account-restore edge case that could leave an old screen showing after switching accounts',
          'Sign-in now handles a few more account-linking edge cases gracefully',
          'Recovery comparison charts (Effort vs Results) redesigned for clarity',
          "Progress bars across HR zones and workout stats now match the app's polished look everywhere",
        ],
      },
    ],
  },
  {
    releaseId: '2026-07-18',
    version: 'Patch 4',
    date: 'July 18, 2026',
    highlights: [
      {
        icon: 'sparkles',
        title: 'GoodForge',
        body: "The app has a new name. Nothing else has changed: your account, your history, and your data are all exactly where you left them. Same app, now wearing its real name.",
      },
      {
        icon: 'color-palette',
        title: 'A Sharper Look',
        body: "Titles and numbers now catch a subtle shine instead of sitting flat, every card has real depth and shadow, and the whole app glows just a touch warmer. Same experience, considerably more polished.",
      },
      {
        icon: 'construct',
        title: 'Fixes & Improvements',
        bullets: [
          'Editing a food from a logged entry no longer silently blanks fiber, sodium, and other extended nutrition fields on save',
          'The Log tab now has its own quick-add button for creating food, creating a recipe, scanning a barcode, or adding to a meal',
          'Renaming a brand-new report now actually works',
          "Stats' Weight Change now updates correctly when you switch time periods",
          'Workout achievement trophies no longer over-count from imported Apple Health history',
          'Momentum no longer breaks around midnight',
          "The Recipe Builder's unit dropdown no longer opens off-screen",
          'Stats sections no longer flash into the wrong order when you switch tabs',
          'The floating save bar on Settings > Goals no longer looks see-through on Light and Slate themes',
          "Otto's floating button no longer covers the bottom of your food list when adding food",
        ],
      },
    ],
  },
  {
    releaseId: '2026-07-13',
    version: 'Patch 3',
    date: 'July 13, 2026',
    highlights: [
      {
        icon: 'leaf',
        foil: true,   // wears the real gold Supporter hallmark
        title: 'Support the Mission',
        body: "The app is now something you can support. Nothing you already use has been taken away. The basics stay free, and faith features are never behind a paywall. Supporters get more room with Otto and the meal estimator, plus Custom Reports, Comparison, a gold badge, and a gold app icon you can switch on in Appearance. As thanks for testing this thing while it was still rough: your account has a full year of Supporter on the house.",
      },
      {
        icon: 'repeat',
        title: 'Repeat a meal',
        body: "Eating the same breakfast again? Tap Repeat Yesterday on an empty meal and the whole thing logs at once, photos, macros and all. Or pick any past day to copy from. You can also clear an entire meal in one tap.",
      },
      {
        icon: 'analytics',
        title: 'Your weight history, editable',
        body: "Fix a bad weigh-in, delete one, or add a day you forgot to log. Your starting weight comes from your earliest weigh-in and can be corrected, and your milestones recalculate to match.",
      },
      {
        icon: 'construct',
        title: 'Fixes & Improvements',
        bullets: [
          'Rest and hold timers now sit in a compact chip instead of blocking the screen mid-set',
          'The Workout tab no longer reloads from scratch every time you add an exercise',
          'Food names no longer show long decimals like 113.33304999999999g',
          'The Weight card no longer says "Total Lost" when you have gained',
          'Effort vs Results insights write properly again instead of falling back to a stub',
          'Onboarding now asks how often you actually train, not what you are aiming for',
        ],
      },
    ],
  },
  {
    releaseId: '2026-07-08',
    version: 'Patch 2',
    date: 'July 8, 2026',
    highlights: [
      {
        icon: 'stopwatch',
        title: 'Log lifts your way',
        body: "Set each exercise in pounds or kilograms, your choice per lift. And any exercise can track a timed hold instead of reps, great for planks, dead hangs, and loaded carries: a built-in timer counts you down, logs the hold, and checks the set for you. Your longest hold becomes its own personal record.",
      },
      {
        icon: 'bar-chart',
        title: 'Build your own reports',
        body: "Assemble a report from a library of ready-made blocks: weight trends, macros, sleep, workout history, records, and more. Pick a date range, arrange the sections you care about, and export or share it as an image. Start from a template or build one from scratch.",
      },
      {
        icon: 'trophy',
        title: 'Records for your cardio',
        body: "Your Apple Health cardio now sets records too. Furthest distance and longest duration are tracked for each activity, so beating your best walk, run, ride, or swim shows up right in your workout summary.",
      },
      {
        icon: 'watch',
        title: 'Apple workouts in your library',
        body: "Workouts synced from Apple Health now live in your Exercise Library as their own history, kept separate for indoor and outdoor. Rename them however you like, and every past session is right there to look back on.",
      },
      {
        icon: 'shield-checkmark',
        title: 'A safer calorie target',
        body: "If a weight goal would push your daily calories too low, the app now flags it and offers a healthier path instead of just letting it happen. It never blocks you: it makes sure you are choosing a target that actually supports you.",
      },
      {
        icon: 'construct',
        title: 'Fixes & Improvements',
        bullets: [
          'New weekly pace options: lose 0.25 or 0.75 lb per week',
          'AI meal favorites now keep their protein, carbs, and fat, and show as one serving',
          'Day Score no longer rewards a day logged with very few calories',
          'Recovery numbers now line up across every screen',
          'The create-food button now shows when you add straight to a meal',
          'Add and Edit Exercise no longer slide under the keyboard',
          'Recipe entries show full nutrition when edited, and food rows show a loading state',
        ],
      },
    ],
  },
  {
    releaseId: '2026-07-05',
    version: 'Patch 1',
    date: 'July 5, 2026',
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
  },
];

// The newest patch. Drives the one-time Otto notification (index.tsx) + the Settings > About label.
export const WHATS_NEW: WhatsNewRelease = WHATS_NEW_RELEASES[0];
