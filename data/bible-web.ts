import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface Book {
  name: string;
  shortName: string;
  testament: 'OT' | 'NT';
  chapters: Chapter[];
}

// Book name as it appears in the aruljohn/Bible-kjv repo filenames
const BOOK_FILE_NAMES: Record<string, string> = {
  'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus',
  'Numbers': 'Numbers', 'Deuteronomy': 'Deuteronomy', 'Joshua': 'Joshua',
  'Judges': 'Judges', 'Ruth': 'Ruth', '1 Samuel': '1Samuel',
  '2 Samuel': '2Samuel', '1 Kings': '1Kings', '2 Kings': '2Kings',
  '1 Chronicles': '1Chronicles', '2 Chronicles': '2Chronicles',
  'Ezra': 'Ezra', 'Nehemiah': 'Nehemiah', 'Esther': 'Esther',
  'Job': 'Job', 'Psalms': 'Psalms', 'Proverbs': 'Proverbs',
  'Ecclesiastes': 'Ecclesiastes', 'Song of Solomon': 'SongofSolomon',
  'Isaiah': 'Isaiah', 'Jeremiah': 'Jeremiah', 'Lamentations': 'Lamentations',
  'Ezekiel': 'Ezekiel', 'Daniel': 'Daniel', 'Hosea': 'Hosea',
  'Joel': 'Joel', 'Amos': 'Amos', 'Obadiah': 'Obadiah',
  'Jonah': 'Jonah', 'Micah': 'Micah', 'Nahum': 'Nahum',
  'Habakkuk': 'Habakkuk', 'Zephaniah': 'Zephaniah', 'Haggai': 'Haggai',
  'Zechariah': 'Zechariah', 'Malachi': 'Malachi',
  'Matthew': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Romans': 'Romans', '1 Corinthians': '1Corinthians',
  '2 Corinthians': '2Corinthians', 'Galatians': 'Galatians',
  'Ephesians': 'Ephesians', 'Philippians': 'Philippians',
  'Colossians': 'Colossians', '1 Thessalonians': '1Thessalonians',
  '2 Thessalonians': '2Thessalonians', '1 Timothy': '1Timothy',
  '2 Timothy': '2Timothy', 'Titus': 'Titus', 'Philemon': 'Philemon',
  'Hebrews': 'Hebrews', 'James': 'James', '1 Peter': '1Peter',
  '2 Peter': '2Peter', '1 John': '1John', '2 John': '2John',
  '3 John': '3John', 'Jude': 'Jude', 'Revelation': 'Revelation',
};

const BASE_URL = 'https://raw.githubusercontent.com/aruljohn/Bible-kjv/master';

function makeChapters(count: number): Chapter[] {
  return Array.from({ length: count }, (_, i) => ({ chapter: i + 1, verses: [] }));
}

export const BIBLE_BOOKS: Book[] = [
  // ── OLD TESTAMENT ──────────────────────────────────────────────────────────
  { name: 'Genesis',          shortName: 'Gen',    testament: 'OT', chapters: makeChapters(50) },
  { name: 'Exodus',           shortName: 'Exod',   testament: 'OT', chapters: makeChapters(40) },
  { name: 'Leviticus',        shortName: 'Lev',    testament: 'OT', chapters: makeChapters(27) },
  { name: 'Numbers',          shortName: 'Num',    testament: 'OT', chapters: makeChapters(36) },
  { name: 'Deuteronomy',      shortName: 'Deut',   testament: 'OT', chapters: makeChapters(34) },
  { name: 'Joshua',           shortName: 'Josh',   testament: 'OT', chapters: makeChapters(24) },
  { name: 'Judges',           shortName: 'Judg',   testament: 'OT', chapters: makeChapters(21) },
  { name: 'Ruth',             shortName: 'Ruth',   testament: 'OT', chapters: makeChapters(4)  },
  { name: '1 Samuel',         shortName: '1 Sam',  testament: 'OT', chapters: makeChapters(31) },
  { name: '2 Samuel',         shortName: '2 Sam',  testament: 'OT', chapters: makeChapters(24) },
  { name: '1 Kings',          shortName: '1 Kgs',  testament: 'OT', chapters: makeChapters(22) },
  { name: '2 Kings',          shortName: '2 Kgs',  testament: 'OT', chapters: makeChapters(25) },
  { name: '1 Chronicles',     shortName: '1 Chr',  testament: 'OT', chapters: makeChapters(29) },
  { name: '2 Chronicles',     shortName: '2 Chr',  testament: 'OT', chapters: makeChapters(36) },
  { name: 'Ezra',             shortName: 'Ezra',   testament: 'OT', chapters: makeChapters(10) },
  { name: 'Nehemiah',         shortName: 'Neh',    testament: 'OT', chapters: makeChapters(13) },
  { name: 'Esther',           shortName: 'Esth',   testament: 'OT', chapters: makeChapters(10) },
  { name: 'Job',              shortName: 'Job',    testament: 'OT', chapters: makeChapters(42) },
  { name: 'Psalms',           shortName: 'Ps',     testament: 'OT', chapters: makeChapters(150)},
  { name: 'Proverbs',         shortName: 'Prov',   testament: 'OT', chapters: makeChapters(31) },
  { name: 'Ecclesiastes',     shortName: 'Eccl',   testament: 'OT', chapters: makeChapters(12) },
  { name: 'Song of Solomon',  shortName: 'Song',   testament: 'OT', chapters: makeChapters(8)  },
  { name: 'Isaiah',           shortName: 'Isa',    testament: 'OT', chapters: makeChapters(66) },
  { name: 'Jeremiah',         shortName: 'Jer',    testament: 'OT', chapters: makeChapters(52) },
  { name: 'Lamentations',     shortName: 'Lam',    testament: 'OT', chapters: makeChapters(5)  },
  { name: 'Ezekiel',          shortName: 'Ezek',   testament: 'OT', chapters: makeChapters(48) },
  { name: 'Daniel',           shortName: 'Dan',    testament: 'OT', chapters: makeChapters(12) },
  { name: 'Hosea',            shortName: 'Hos',    testament: 'OT', chapters: makeChapters(14) },
  { name: 'Joel',             shortName: 'Joel',   testament: 'OT', chapters: makeChapters(3)  },
  { name: 'Amos',             shortName: 'Amos',   testament: 'OT', chapters: makeChapters(9)  },
  { name: 'Obadiah',          shortName: 'Obad',   testament: 'OT', chapters: makeChapters(1)  },
  { name: 'Jonah',            shortName: 'Jon',    testament: 'OT', chapters: makeChapters(4)  },
  { name: 'Micah',            shortName: 'Mic',    testament: 'OT', chapters: makeChapters(7)  },
  { name: 'Nahum',            shortName: 'Nah',    testament: 'OT', chapters: makeChapters(3)  },
  { name: 'Habakkuk',         shortName: 'Hab',    testament: 'OT', chapters: makeChapters(3)  },
  { name: 'Zephaniah',        shortName: 'Zeph',   testament: 'OT', chapters: makeChapters(3)  },
  { name: 'Haggai',           shortName: 'Hag',    testament: 'OT', chapters: makeChapters(2)  },
  { name: 'Zechariah',        shortName: 'Zech',   testament: 'OT', chapters: makeChapters(14) },
  { name: 'Malachi',          shortName: 'Mal',    testament: 'OT', chapters: makeChapters(4)  },
  // ── NEW TESTAMENT ──────────────────────────────────────────────────────────
  { name: 'Matthew',          shortName: 'Matt',   testament: 'NT', chapters: makeChapters(28) },
  { name: 'Mark',             shortName: 'Mark',   testament: 'NT', chapters: makeChapters(16) },
  { name: 'Luke',             shortName: 'Luke',   testament: 'NT', chapters: makeChapters(24) },
  { name: 'John',             shortName: 'John',   testament: 'NT', chapters: makeChapters(21) },
    { name: 'Acts',             shortName: 'Acts',   testament: 'NT', chapters: makeChapters(28) },
  { name: 'Romans',           shortName: 'Rom',    testament: 'NT', chapters: makeChapters(16) },
  { name: '1 Corinthians',    shortName: '1 Cor',  testament: 'NT', chapters: makeChapters(16) },
  { name: '2 Corinthians',    shortName: '2 Cor',  testament: 'NT', chapters: makeChapters(13) },
  { name: 'Galatians',        shortName: 'Gal',    testament: 'NT', chapters: makeChapters(6)  },
  { name: 'Ephesians',        shortName: 'Eph',    testament: 'NT', chapters: makeChapters(6)  },
  { name: 'Philippians',      shortName: 'Phil',   testament: 'NT', chapters: makeChapters(4)  },
  { name: 'Colossians',       shortName: 'Col',    testament: 'NT', chapters: makeChapters(4)  },
  { name: '1 Thessalonians',  shortName: '1 Thess',testament: 'NT', chapters: makeChapters(5)  },
  { name: '2 Thessalonians',  shortName: '2 Thess',testament: 'NT', chapters: makeChapters(3)  },
  { name: '1 Timothy',        shortName: '1 Tim',  testament: 'NT', chapters: makeChapters(6)  },
  { name: '2 Timothy',        shortName: '2 Tim',  testament: 'NT', chapters: makeChapters(4)  },
  { name: 'Titus',            shortName: 'Titus',  testament: 'NT', chapters: makeChapters(3)  },
  { name: 'Philemon',         shortName: 'Phlm',   testament: 'NT', chapters: makeChapters(1)  },
  { name: 'Hebrews',          shortName: 'Heb',    testament: 'NT', chapters: makeChapters(13) },
  { name: 'James',            shortName: 'Jas',    testament: 'NT', chapters: makeChapters(5)  },
  { name: '1 Peter',          shortName: '1 Pet',  testament: 'NT', chapters: makeChapters(5)  },
  { name: '2 Peter',          shortName: '2 Pet',  testament: 'NT', chapters: makeChapters(3)  },
  { name: '1 John',           shortName: '1 John', testament: 'NT', chapters: makeChapters(5)  },
  { name: '2 John',           shortName: '2 John', testament: 'NT', chapters: makeChapters(1)  },
  { name: '3 John',           shortName: '3 John', testament: 'NT', chapters: makeChapters(1)  },
  { name: 'Jude',             shortName: 'Jude',   testament: 'NT', chapters: makeChapters(1)  },
  { name: 'Revelation',       shortName: 'Rev',    testament: 'NT', chapters: makeChapters(22) },
];

// ── Fetch + cache a chapter from KJV repo ──────────────────────────────────
export async function fetchChapter(bookName: string, chapterNum: number): Promise<Verse[]> {
  const cacheKey = `pj_bible_${bookName.replace(/\s/g, '_')}_${chapterNum}`;
  try {
    // Cache first
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Verse[];
    }
    // Fetch from GitHub
    const fileName = BOOK_FILE_NAMES[bookName];
    if (!fileName) throw new Error(`Unknown book: ${bookName}`);
    const url = `${BASE_URL}/${fileName}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // Parse all chapters from this book and cache each one
    // so future chapter taps in the same book are instant
    const chapters: Array<{ chapter: string; verses: Array<{ verse: string; text: string }> }> =
      data.chapters;
    let result: Verse[] = [];
    for (const ch of chapters) {
      const chNum = parseInt(ch.chapter, 10);
      const verses: Verse[] = ch.verses.map(v => ({
        verse: parseInt(v.verse, 10),
        text: v.text.trim(),
      }));
      const chCacheKey = `pj_bible_${bookName.replace(/\s/g, '_')}_${chNum}`;
      await AsyncStorage.setItem(chCacheKey, JSON.stringify(verses));
      if (chNum === chapterNum) result = verses;
    }
    return result;
  } catch (e) {
    console.log('fetchChapter error', bookName, chapterNum, e);
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function getBook(name: string): Book | undefined {
  return BIBLE_BOOKS.find(b => b.name === name || b.shortName === name);
}

export function getChapter(bookName: string, chapter: number): Chapter | undefined {
  return getBook(bookName)?.chapters.find(c => c.chapter === chapter);
}

export function getVerse(bookName: string, chapter: number, verse: number): Verse | undefined {
  return getChapter(bookName, chapter)?.verses.find(v => v.verse === verse);
}

export function parseReference(ref: string): { book: string; chapter: number; verseStart: number; verseEnd?: number } | null {
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  return {
    book: match[1],
    chapter: parseInt(match[2]),
    verseStart: parseInt(match[3]),
    verseEnd: match[4] ? parseInt(match[4]) : undefined,
  };
}