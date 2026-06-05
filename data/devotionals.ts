// ─── Types ───────────────────────────────────────────────────────────────────
//
// Devotionals are DISTINCT from reading plans (data/readingPlans.ts).
// Reading plan = a pure reading schedule, no interactivity, no AI.
// Devotional  = shorter, can jump around, and each day carries our own written
//               reflection, a reflection question the user can answer in a text
//               box, and an optional inline Halo conversation that saves to the day.
//
// This file holds the STATIC devotional content (the long pole) plus the shapes.
// User progress + saved answers + saved Halo threads live in AsyncStorage under
// pj_devotionals (shape below); storage detail is refined when the screen is built.

export interface DevotionalPassage {
  book: string;
  startChapter: number;
  startVerse?: number;
  endChapter: number;
  endVerse?: number;
}

export interface DevotionalDay {
  day: number;            // 1-indexed
  title: string;          // short title for the day
  passage: DevotionalPassage;
  reflection: string;     // our own written reflection (original prose)
  question: string;       // the reflection question (answerable in a text box)
}

export interface Devotional {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;       // from the starter slate, e.g. 'Rest and Recovery'
  totalDays: number;
  icon: string;           // Ionicons name
  days: DevotionalDay[];
}

// ─── User progress (pj_devotionals) ──────────────────────────────────────────

export interface DevotionalHaloTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface DevotionalDayEntry {
  answer?: string;                    // the user's typed reflection answer
  answeredAt?: number;
  haloThread?: DevotionalHaloTurn[];  // saved Halo conversation for this day
  completed?: boolean;
  completedAt?: number;
}

export interface DevotionalProgress {
  startDate: string;                  // YYYY-MM-DD
  enrolledAt: number;
  entries: Record<number, DevotionalDayEntry>;  // keyed by day number
}

export type DevotionalsStorage = Record<string, DevotionalProgress>; // keyed by devotional id

// Cap on simultaneously-active devotionals, mirroring reading plans (MAX_ACTIVE_PLANS in
// data/readingPlans.ts). Keeps the faith "Bible and Plans" card bounded so it never balloons.
export const MAX_ACTIVE_DEVOTIONALS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDevotionalPassage(p: DevotionalPassage): string {
  if (p.startChapter === p.endChapter) {
    if (p.startVerse != null && p.endVerse != null) {
      return p.startVerse === p.endVerse
        ? `${p.book} ${p.startChapter}:${p.startVerse}`
        : `${p.book} ${p.startChapter}:${p.startVerse}-${p.endVerse}`;
    }
    return `${p.book} ${p.startChapter}`;
  }
  if (p.startVerse != null && p.endVerse != null) {
    return `${p.book} ${p.startChapter}:${p.startVerse}-${p.endChapter}:${p.endVerse}`;
  }
  return `${p.book} ${p.startChapter}-${p.endChapter}`;
}

export function getDevotionalCompletion(
  dev: Devotional,
  progress: DevotionalProgress
): { completed: number; total: number; pct: number } {
  const completed = Object.values(progress.entries).filter(e => e.completed).length;
  return { completed, total: dev.totalDays, pct: dev.totalDays > 0 ? completed / dev.totalDays : 0 };
}

// ─── Devotional 1: Rest and Recovery (3 days) ─────────────────────────────────
// Wellness-tied moat category. Connects physical rest/recovery to the rest the
// gospel offers, without spiritualizing metrics or prosperity-gospel framing.

const REST_AND_RECOVERY_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'The Invitation to Rest',
    passage: { book: 'Matthew', startChapter: 11, startVerse: 28, endChapter: 11, endVerse: 30 },
    reflection:
      'Jesus said this to people who were worn down by the religious system of their day. Hundreds of rules, a constant sense of never quite measuring up, always one failure away from condemnation. Into that exhaustion he does not say clean yourself up and then come. He says come to me, all you who are weary. Come tired. Come heavy. Come as you are.\n\n' +
      'Then he uses a strange picture. A yoke is the wooden beam laid across an ox to pull a load, and the teachers of that time called their whole system of rules a yoke. Jesus says take my yoke instead, and he calls it easy and light. That is a surprising thing to say about following him, because it is not a promise of no load at all. It is the promise of a load carried with him, paced by him, instead of the crushing weight of trying to earn your own worth.\n\n' +
      'You probably know what it is to push past empty. To tie how you feel about yourself to how you performed today. To treat rest as something you have to earn once you have finally done enough. This passage cuts straight against that. Rest is not the prize waiting at the end of your striving. It is the invitation at the very start. The same God who built recovery into your body built it into your soul, and coming to him is not quitting. It is trading a weight you were never strong enough to carry for one that actually fits.',
    question: 'What weight are you carrying right now that you have not handed to God?',
  },
  {
    day: 2,
    title: 'He Restores',
    passage: { book: 'Psalms', startChapter: 23, startVerse: 1, endChapter: 23, endVerse: 3 },
    reflection:
      'David wrote this as a shepherd who later became a king. He knew exactly what a sheep needs because he had spent long nights in the field with them. A sheep is not built to keep going forever. It needs to be led to food, to water, and to a place safe enough to lie down. David looks at his own life and says that is what God is to me.\n\n' +
      'Notice the verbs. He makes me lie down. He leads me beside still waters. He restores my soul. Every one of them is something the shepherd does, not something the sheep produces. Sheep will not lie down when they are anxious or hungry or afraid, so a shepherd who gets his flock to rest has first made them feel safe and provided for. Rest, in this psalm, is the fruit of being cared for, not another task on a list.\n\n' +
      'There is a reason the word here is restore. To restore something is to bring it back to what it was meant to be. You feel this in your body after real recovery, when the soreness fades and the strength returns. Your soul works the same way. It wears down under constant output, and it comes back when you let yourself be led to still water. Letting God restore you is not laziness. It is trusting that you are cared for enough to stop.',
    question: 'Where do you need to let God lead you to rest instead of pushing through?',
  },
  {
    day: 3,
    title: 'Come Away a While',
    passage: { book: 'Mark', startChapter: 6, startVerse: 31, endChapter: 6, endVerse: 32 },
    reflection:
      'The disciples had just come back from a stretch of hard work, healing and teaching and pouring themselves out. So many people were coming and going that they did not even have time to eat. If anyone had earned the right to keep grinding, it was them, right in the middle of doing real good for real people.\n\n' +
      'Jesus’ response is the surprising part. He does not praise them for skipping meals or tell them the work is too important to pause. He says come away by yourselves to a quiet place and rest a while. Then they actually leave, get in a boat, and go. The Son of God, with endless needs pressing in around him, builds a deliberate stop into the middle of the mission. He treats rest as part of the work, not a betrayal of it.\n\n' +
      'It is easy to believe the lie that pausing means falling behind, that the people who matter most are the ones who never stop. This passage says otherwise. Even good work, maybe especially good work, has a limit, and the rhythm of stepping away is how you keep showing up over the long haul. A pause is not the opposite of a faithful life. It is part of how a faithful life lasts.',
    question: 'What would a real pause look like in your week this week?',
  },
];

// ─── Exported Devotionals ─────────────────────────────────────────────────────

export const DEVOTIONALS: Devotional[] = [
  {
    id: 'rest_recovery_3',
    name: 'Rest and Recovery',
    shortName: 'Rest and Recovery',
    description:
      'Three days on the rest your body and your soul were built to need: striving, restoration, and the rhythm of work and rest.',
    category: 'Rest and Recovery',
    totalDays: REST_AND_RECOVERY_DAYS.length,
    icon: 'moon-outline',
    days: REST_AND_RECOVERY_DAYS,
  },
];
