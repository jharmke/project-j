// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanPassage {
  book: string;
  startChapter: number;
  endChapter: number;
}

export interface PlanDay {
  day: number; // 1-indexed
  passages: PlanPassage[];
}

export interface ReadingPlan {
  id: string;
  name: string;
  shortName: string;
  description: string;
  totalDays: number;
  icon: string;
  days: PlanDay[];
}

export interface PlanProgress {
  startDate: string; // YYYY-MM-DD
  completedDays: number[]; // 0-indexed day numbers
  enrolledAt: number;
}

export type ReadingPlansStorage = Record<string, PlanProgress>;

export const MAX_ACTIVE_PLANS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDayReading(day: PlanDay): string {
  return day.passages
    .map(p =>
      p.startChapter === p.endChapter
        ? `${p.book} ${p.startChapter}`
        : `${p.book} ${p.startChapter}-${p.endChapter}`
    )
    .join(', ');
}

export function getTodayDayIndex(startDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.max(0, days);
}

export function getPlanCompletion(
  plan: ReadingPlan,
  progress: PlanProgress
): { completed: number; total: number; pct: number } {
  const completed = progress.completedDays.filter(d => d < plan.totalDays).length;
  return { completed, total: plan.totalDays, pct: plan.totalDays > 0 ? completed / plan.totalDays : 0 };
}

export function getTodayReading(
  plan: ReadingPlan,
  progress: PlanProgress
): { day: PlanDay; dayIndex: number; isRead: boolean } | 'complete' {
  const { completed, total } = getPlanCompletion(plan, progress);
  if (completed >= total) return 'complete';
  const dayIndex = Math.min(getTodayDayIndex(progress.startDate), plan.totalDays - 1);
  const isRead = progress.completedDays.includes(dayIndex);
  return { day: plan.days[dayIndex], dayIndex, isRead };
}

// ─── Plan Generator (used for NT plan) ───────────────────────────────────────

function buildDays(
  books: { name: string; chapters: number }[],
  chapPerDay: number
): PlanDay[] {
  const days: PlanDay[] = [];
  let passages: PlanPassage[] = [];
  let dayTotal = 0;
  let dayIdx = 1;

  for (const book of books) {
    let startCh = 1;
    while (startCh <= book.chapters) {
      const canFit = chapPerDay - dayTotal;
      const endCh = Math.min(startCh + canFit - 1, book.chapters);
      passages.push({ book: book.name, startChapter: startCh, endChapter: endCh });
      dayTotal += endCh - startCh + 1;
      startCh = endCh + 1;
      if (dayTotal >= chapPerDay) {
        days.push({ day: dayIdx++, passages });
        passages = [];
        dayTotal = 0;
      }
    }
  }
  if (passages.length > 0) days.push({ day: dayIdx, passages });
  return days;
}

// ─── Plan 1: Gospels in 28 Days ───────────────────────────────────────────────
// Matthew (28) + Mark (16) + Luke (24) + John (21) = 89 chapters

const GOSPELS_DAYS: PlanDay[] = [
  { day: 1,  passages: [{ book: 'Matthew', startChapter: 1,  endChapter: 3  }] },
  { day: 2,  passages: [{ book: 'Matthew', startChapter: 4,  endChapter: 6  }] },
  { day: 3,  passages: [{ book: 'Matthew', startChapter: 7,  endChapter: 9  }] },
  { day: 4,  passages: [{ book: 'Matthew', startChapter: 10, endChapter: 12 }] },
  { day: 5,  passages: [{ book: 'Matthew', startChapter: 13, endChapter: 15 }] },
  { day: 6,  passages: [{ book: 'Matthew', startChapter: 16, endChapter: 18 }] },
  { day: 7,  passages: [{ book: 'Matthew', startChapter: 19, endChapter: 21 }] },
  { day: 8,  passages: [{ book: 'Matthew', startChapter: 22, endChapter: 24 }] },
  { day: 9,  passages: [{ book: 'Matthew', startChapter: 25, endChapter: 28 }] },
  { day: 10, passages: [{ book: 'Mark', startChapter: 1,  endChapter: 3  }] },
  { day: 11, passages: [{ book: 'Mark', startChapter: 4,  endChapter: 6  }] },
  { day: 12, passages: [{ book: 'Mark', startChapter: 7,  endChapter: 9  }] },
  { day: 13, passages: [{ book: 'Mark', startChapter: 10, endChapter: 12 }] },
  { day: 14, passages: [{ book: 'Mark', startChapter: 13, endChapter: 14 }] },
  { day: 15, passages: [{ book: 'Mark', startChapter: 15, endChapter: 16 }] },
  { day: 16, passages: [{ book: 'Luke', startChapter: 1,  endChapter: 3  }] },
  { day: 17, passages: [{ book: 'Luke', startChapter: 4,  endChapter: 6  }] },
  { day: 18, passages: [{ book: 'Luke', startChapter: 7,  endChapter: 9  }] },
  { day: 19, passages: [{ book: 'Luke', startChapter: 10, endChapter: 12 }] },
  { day: 20, passages: [{ book: 'Luke', startChapter: 13, endChapter: 15 }] },
  { day: 21, passages: [{ book: 'Luke', startChapter: 16, endChapter: 18 }] },
  { day: 22, passages: [{ book: 'Luke', startChapter: 19, endChapter: 21 }] },
  { day: 23, passages: [{ book: 'Luke', startChapter: 22, endChapter: 24 }] },
  { day: 24, passages: [{ book: 'John', startChapter: 1,  endChapter: 4  }] },
  { day: 25, passages: [{ book: 'John', startChapter: 5,  endChapter: 8  }] },
  { day: 26, passages: [{ book: 'John', startChapter: 9,  endChapter: 12 }] },
  { day: 27, passages: [{ book: 'John', startChapter: 13, endChapter: 16 }] },
  { day: 28, passages: [{ book: 'John', startChapter: 17, endChapter: 21 }] },
];

// ─── Plan 2: Psalms & Proverbs in 30 Days ────────────────────────────────────
// 5 Psalms + 1 Proverb per day; day 30 includes Proverbs 30-31

const PSALMS_PROVERBS_DAYS: PlanDay[] = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  passages: [
    { book: 'Psalms',   startChapter: i * 5 + 1, endChapter: i * 5 + 5 },
    { book: 'Proverbs', startChapter: i + 1,      endChapter: i === 29 ? 31 : i + 1 },
  ],
}));

// ─── Plan 3: New Testament in 90 Days ────────────────────────────────────────
// All 27 NT books, 3 chapters per day (~87 days)

const NT_BOOKS = [
  { name: 'Matthew',         chapters: 28 },
  { name: 'Mark',            chapters: 16 },
  { name: 'Luke',            chapters: 24 },
  { name: 'John',            chapters: 21 },
  { name: 'Acts',            chapters: 28 },
  { name: 'Romans',          chapters: 16 },
  { name: '1 Corinthians',   chapters: 16 },
  { name: '2 Corinthians',   chapters: 13 },
  { name: 'Galatians',       chapters: 6  },
  { name: 'Ephesians',       chapters: 6  },
  { name: 'Philippians',     chapters: 4  },
  { name: 'Colossians',      chapters: 4  },
  { name: '1 Thessalonians', chapters: 5  },
  { name: '2 Thessalonians', chapters: 3  },
  { name: '1 Timothy',       chapters: 6  },
  { name: '2 Timothy',       chapters: 4  },
  { name: 'Titus',           chapters: 3  },
  { name: 'Philemon',        chapters: 1  },
  { name: 'Hebrews',         chapters: 13 },
  { name: 'James',           chapters: 5  },
  { name: '1 Peter',         chapters: 5  },
  { name: '2 Peter',         chapters: 3  },
  { name: '1 John',          chapters: 5  },
  { name: '2 John',          chapters: 1  },
  { name: '3 John',          chapters: 1  },
  { name: 'Jude',            chapters: 1  },
  { name: 'Revelation',      chapters: 22 },
];

const NT_DAYS = buildDays(NT_BOOKS, 3);

// ─── Plan 4: Epistles in 21 Days ─────────────────────────────────────────────
// Key epistles: Romans through 1 John (101 chapters, ~5/day)

const EPISTLES_DAYS: PlanDay[] = [
  { day: 1,  passages: [{ book: 'Romans',         startChapter: 1,  endChapter: 5  }] },
  { day: 2,  passages: [{ book: 'Romans',         startChapter: 6,  endChapter: 10 }] },
  { day: 3,  passages: [{ book: 'Romans',         startChapter: 11, endChapter: 16 }] },
  { day: 4,  passages: [{ book: '1 Corinthians',  startChapter: 1,  endChapter: 4  }] },
  { day: 5,  passages: [{ book: '1 Corinthians',  startChapter: 5,  endChapter: 9  }] },
  { day: 6,  passages: [{ book: '1 Corinthians',  startChapter: 10, endChapter: 13 }] },
  { day: 7,  passages: [{ book: '1 Corinthians',  startChapter: 14, endChapter: 16 }, { book: '2 Corinthians', startChapter: 1, endChapter: 1 }] },
  { day: 8,  passages: [{ book: '2 Corinthians',  startChapter: 2,  endChapter: 6  }] },
  { day: 9,  passages: [{ book: '2 Corinthians',  startChapter: 7,  endChapter: 11 }] },
  { day: 10, passages: [{ book: '2 Corinthians',  startChapter: 12, endChapter: 13 }, { book: 'Galatians', startChapter: 1, endChapter: 3 }] },
  { day: 11, passages: [{ book: 'Galatians',      startChapter: 4,  endChapter: 6  }, { book: 'Ephesians', startChapter: 1, endChapter: 2 }] },
  { day: 12, passages: [{ book: 'Ephesians',      startChapter: 3,  endChapter: 6  }, { book: 'Philippians', startChapter: 1, endChapter: 1 }] },
  { day: 13, passages: [{ book: 'Philippians',    startChapter: 2,  endChapter: 4  }, { book: 'Colossians', startChapter: 1, endChapter: 2 }] },
  { day: 14, passages: [{ book: 'Colossians',     startChapter: 3,  endChapter: 4  }, { book: '1 Thessalonians', startChapter: 1, endChapter: 3 }] },
  { day: 15, passages: [{ book: '1 Thessalonians', startChapter: 4, endChapter: 5  }, { book: '2 Thessalonians', startChapter: 1, endChapter: 3 }] },
  { day: 16, passages: [{ book: 'Hebrews',        startChapter: 1,  endChapter: 4  }] },
  { day: 17, passages: [{ book: 'Hebrews',        startChapter: 5,  endChapter: 9  }] },
  { day: 18, passages: [{ book: 'Hebrews',        startChapter: 10, endChapter: 13 }, { book: 'James', startChapter: 1, endChapter: 1 }] },
  { day: 19, passages: [{ book: 'James',          startChapter: 2,  endChapter: 5  }] },
  { day: 20, passages: [{ book: '1 Peter',        startChapter: 1,  endChapter: 5  }] },
  { day: 21, passages: [{ book: '1 John',         startChapter: 1,  endChapter: 5  }] },
];

// ─── Plan 5: Genesis in 25 Days ──────────────────────────────────────────────
// 50 chapters, 2 per day

const GENESIS_DAYS: PlanDay[] = Array.from({ length: 25 }, (_, i) => ({
  day: i + 1,
  passages: [{ book: 'Genesis', startChapter: i * 2 + 1, endChapter: i * 2 + 2 }],
}));

// ─── Plan 6: John in 21 Days ──────────────────────────────────────────────────
// 21 chapters, 1 per day

const JOHN_DAYS: PlanDay[] = Array.from({ length: 21 }, (_, i) => ({
  day: i + 1,
  passages: [{ book: 'John', startChapter: i + 1, endChapter: i + 1 }],
}));

// ─── Plan 7: Acts in 28 Days ──────────────────────────────────────────────────
// 28 chapters, 1 per day

const ACTS_DAYS: PlanDay[] = Array.from({ length: 28 }, (_, i) => ({
  day: i + 1,
  passages: [{ book: 'Acts', startChapter: i + 1, endChapter: i + 1 }],
}));

// ─── Plan 8: Proverbs in 31 Days ─────────────────────────────────────────────
// 31 chapters, 1 per day

const PROVERBS_DAYS: PlanDay[] = Array.from({ length: 31 }, (_, i) => ({
  day: i + 1,
  passages: [{ book: 'Proverbs', startChapter: i + 1, endChapter: i + 1 }],
}));

// ─── Plan 9: Bible in a Year ──────────────────────────────────────────────────
// All 66 books, 3 chapters per day (~396 readings)

const ALL_BIBLE_BOOKS = [
  { name: 'Genesis',          chapters: 50  },
  { name: 'Exodus',           chapters: 40  },
  { name: 'Leviticus',        chapters: 27  },
  { name: 'Numbers',          chapters: 36  },
  { name: 'Deuteronomy',      chapters: 34  },
  { name: 'Joshua',           chapters: 24  },
  { name: 'Judges',           chapters: 21  },
  { name: 'Ruth',             chapters: 4   },
  { name: '1 Samuel',         chapters: 31  },
  { name: '2 Samuel',         chapters: 24  },
  { name: '1 Kings',          chapters: 22  },
  { name: '2 Kings',          chapters: 25  },
  { name: '1 Chronicles',     chapters: 29  },
  { name: '2 Chronicles',     chapters: 36  },
  { name: 'Ezra',             chapters: 10  },
  { name: 'Nehemiah',         chapters: 13  },
  { name: 'Esther',           chapters: 10  },
  { name: 'Job',              chapters: 42  },
  { name: 'Psalms',           chapters: 150 },
  { name: 'Proverbs',         chapters: 31  },
  { name: 'Ecclesiastes',     chapters: 12  },
  { name: 'Song of Solomon',  chapters: 8   },
  { name: 'Isaiah',           chapters: 66  },
  { name: 'Jeremiah',         chapters: 52  },
  { name: 'Lamentations',     chapters: 5   },
  { name: 'Ezekiel',          chapters: 48  },
  { name: 'Daniel',           chapters: 12  },
  { name: 'Hosea',            chapters: 14  },
  { name: 'Joel',             chapters: 3   },
  { name: 'Amos',             chapters: 9   },
  { name: 'Obadiah',          chapters: 1   },
  { name: 'Jonah',            chapters: 4   },
  { name: 'Micah',            chapters: 7   },
  { name: 'Nahum',            chapters: 3   },
  { name: 'Habakkuk',         chapters: 3   },
  { name: 'Zephaniah',        chapters: 3   },
  { name: 'Haggai',           chapters: 2   },
  { name: 'Zechariah',        chapters: 14  },
  { name: 'Malachi',          chapters: 4   },
  { name: 'Matthew',          chapters: 28  },
  { name: 'Mark',             chapters: 16  },
  { name: 'Luke',             chapters: 24  },
  { name: 'John',             chapters: 21  },
  { name: 'Acts',             chapters: 28  },
  { name: 'Romans',           chapters: 16  },
  { name: '1 Corinthians',    chapters: 16  },
  { name: '2 Corinthians',    chapters: 13  },
  { name: 'Galatians',        chapters: 6   },
  { name: 'Ephesians',        chapters: 6   },
  { name: 'Philippians',      chapters: 4   },
  { name: 'Colossians',       chapters: 4   },
  { name: '1 Thessalonians',  chapters: 5   },
  { name: '2 Thessalonians',  chapters: 3   },
  { name: '1 Timothy',        chapters: 6   },
  { name: '2 Timothy',        chapters: 4   },
  { name: 'Titus',            chapters: 3   },
  { name: 'Philemon',         chapters: 1   },
  { name: 'Hebrews',          chapters: 13  },
  { name: 'James',            chapters: 5   },
  { name: '1 Peter',          chapters: 5   },
  { name: '2 Peter',          chapters: 3   },
  { name: '1 John',           chapters: 5   },
  { name: '2 John',           chapters: 1   },
  { name: '3 John',           chapters: 1   },
  { name: 'Jude',             chapters: 1   },
  { name: 'Revelation',       chapters: 22  },
];

const BIBLE_YEAR_DAYS = buildDays(ALL_BIBLE_BOOKS, 3);

// ─── Exported Plans ───────────────────────────────────────────────────────────

export const READING_PLANS: ReadingPlan[] = [
  {
    id: 'gospels_28',
    name: 'Gospels in 28 Days',
    shortName: 'The Gospels',
    description: 'Walk through the life of Jesus in Matthew, Mark, Luke, and John.',
    totalDays: GOSPELS_DAYS.length,
    icon: 'sunny-outline',
    days: GOSPELS_DAYS,
  },
  {
    id: 'psalms_proverbs_30',
    name: 'Psalms & Proverbs in 30 Days',
    shortName: 'Psalms & Proverbs',
    description: 'Five Psalms and one chapter of Proverbs each day — wisdom and worship in 30 days.',
    totalDays: PSALMS_PROVERBS_DAYS.length,
    icon: 'leaf-outline',
    days: PSALMS_PROVERBS_DAYS,
  },
  {
    id: 'nt_90',
    name: 'New Testament in 90 Days',
    shortName: 'New Testament',
    description: 'The complete New Testament from the Gospels through Revelation.',
    totalDays: NT_DAYS.length,
    icon: 'book-outline',
    days: NT_DAYS,
  },
  {
    id: 'epistles_21',
    name: 'Epistles in 21 Days',
    shortName: 'The Epistles',
    description: 'Romans through 1 John — the letters that define Christian doctrine and life.',
    totalDays: EPISTLES_DAYS.length,
    icon: 'mail-outline',
    days: EPISTLES_DAYS,
  },
  {
    id: 'genesis_25',
    name: 'Genesis in 25 Days',
    shortName: 'Genesis',
    description: 'The beginning of everything — creation, the fall, Noah, Abraham, Joseph, and the foundation of faith.',
    totalDays: GENESIS_DAYS.length,
    icon: 'earth-outline',
    days: GENESIS_DAYS,
  },
  {
    id: 'john_21',
    name: 'John in 21 Days',
    shortName: 'Gospel of John',
    description: 'One chapter a day through the Gospel of John — the most personal and theological portrait of Jesus.',
    totalDays: JOHN_DAYS.length,
    icon: 'heart-outline',
    days: JOHN_DAYS,
  },
  {
    id: 'acts_28',
    name: 'Acts in 28 Days',
    shortName: 'Acts',
    description: 'The explosive birth and spread of the early church — one chapter a day through Acts.',
    totalDays: ACTS_DAYS.length,
    icon: 'people-outline',
    days: ACTS_DAYS,
  },
  {
    id: 'proverbs_31',
    name: 'Proverbs in 31 Days',
    shortName: 'Proverbs',
    description: 'One chapter of Proverbs a day for a month — practical wisdom for every area of life.',
    totalDays: PROVERBS_DAYS.length,
    icon: 'bulb-outline',
    days: PROVERBS_DAYS,
  },
  {
    id: 'bible_year',
    name: 'Bible in a Year',
    shortName: 'Bible in a Year',
    description: 'The complete Bible from Genesis to Revelation, 3 chapters a day.',
    totalDays: BIBLE_YEAR_DAYS.length,
    icon: 'library-outline',
    days: BIBLE_YEAR_DAYS,
  },
];
