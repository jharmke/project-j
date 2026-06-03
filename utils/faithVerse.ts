// utils/faithVerse.ts
//
// Faith AI companion: deterministic Scripture verification (Piece 2, safety first).
//
// Purpose: catch invented, misquoted, or hallucinated Scripture before it ever reaches
// the user. The AI's job is to pick the right REFERENCE; the app supplies the actual
// WORDS from its own KJV source, so the AI cannot put false words in a verse.
//
// Two levels of verification:
//  1. STRUCTURE (offline, instant): does the cited book exist, and is the chapter number
//     in range? This alone catches fake books ("2 Hezekiah") and impossible chapters
//     ("John 99:1", John only has 21). Runs against the table below, no network.
//  2. VERSE + TEXT (needs the chapter loaded): does that verse number exist, and what is
//     its real text? This needs the chapter's verses, which the app already fetches from
//     its KJV source (aruljohn/Bible-kjv) and caches. The loader is INJECTED (see
//     verifyReferencesInText) so this module stays pure, testable, and unaware of where
//     the text comes from. If/when the full KJV is bundled into the app, nothing here
//     changes; the loader just gets faster and works offline.
//
// IMPORTANT: this file deliberately does NOT import from data/bible-web.ts. That file
// imports AsyncStorage at the top, which would make this module impossible to unit test
// in plain Node and would couple verification to the fetch layer. The book/chapter table
// below is immutable biblical data (chapter counts never change) and was transcribed to
// match data/bible-web.ts exactly. No double dashes anywhere (project rule).

export interface VerseText {
  verse: number;
  text: string;
}

export interface VerseRef {
  raw: string;            // exactly as found in the AI text
  book: string | null;    // canonical book name, or null if not a real book
  chapter: number;
  verseStart: number;
  verseEnd?: number;      // present only for ranges like 3:16-17
  index: number;          // position in the source text
}

export type VerifyStatus =
  | 'verified'            // book, chapter, and verse all real; realText supplied
  | 'invalid_reference'  // book does not exist, or chapter out of range
  | 'invalid_verse'      // book + chapter real, but the verse number does not exist
  | 'unavailable';       // could not load the chapter to check (offline + uncached)

export interface VerifyResult {
  ref: VerseRef;
  status: VerifyStatus;
  realText: string | null;
}

// Canonical book name -> chapter count. Mirrors data/bible-web.ts BIBLE_BOOKS exactly.
const BOOK_CHAPTERS: Record<string, number> = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
  'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52,
  'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3,
  'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28, 'Romans': 16,
  '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
  'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1,
  'Jude': 1, 'Revelation': 22,
};

const SINGLE_CHAPTER_BOOKS = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

// Short names and common abbreviations the AI might use, lowercased, mapped to canonical.
// The full canonical names are added automatically from BOOK_CHAPTERS below.
const EXTRA_ALIASES: Record<string, string> = {
  'gen': 'Genesis', 'ex': 'Exodus', 'exod': 'Exodus', 'lev': 'Leviticus',
  'num': 'Numbers', 'deut': 'Deuteronomy', 'dt': 'Deuteronomy', 'josh': 'Joshua',
  'judg': 'Judges', '1 sam': '1 Samuel', '2 sam': '2 Samuel', '1 kgs': '1 Kings',
  '2 kgs': '2 Kings', '1 chr': '1 Chronicles', '2 chr': '2 Chronicles', 'neh': 'Nehemiah',
  'esth': 'Esther', 'ps': 'Psalms', 'psalm': 'Psalms', 'pss': 'Psalms', 'prov': 'Proverbs',
  'prv': 'Proverbs', 'eccl': 'Ecclesiastes', 'ecc': 'Ecclesiastes',
  'song': 'Song of Solomon', 'song of songs': 'Song of Solomon', 'sos': 'Song of Solomon',
  'isa': 'Isaiah', 'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezek': 'Ezekiel',
  'ezk': 'Ezekiel', 'dan': 'Daniel', 'hos': 'Hosea', 'obad': 'Obadiah', 'jon': 'Jonah',
  'mic': 'Micah', 'nah': 'Nahum', 'hab': 'Habakkuk', 'zeph': 'Zephaniah', 'hag': 'Haggai',
  'zech': 'Zechariah', 'mal': 'Malachi',
  'matt': 'Matthew', 'mt': 'Matthew', 'mk': 'Mark', 'mr': 'Mark', 'lk': 'Luke',
  'jn': 'John', 'jhn': 'John', 'rom': 'Romans', '1 cor': '1 Corinthians',
  '2 cor': '2 Corinthians', 'gal': 'Galatians', 'eph': 'Ephesians', 'phil': 'Philippians',
  'php': 'Philippians', 'col': 'Colossians', '1 thess': '1 Thessalonians',
  '2 thess': '2 Thessalonians', '1 thes': '1 Thessalonians', '2 thes': '2 Thessalonians',
  '1 tim': '1 Timothy', '2 tim': '2 Timothy', 'phlm': 'Philemon', 'philem': 'Philemon',
  'heb': 'Hebrews', 'jas': 'James', 'jms': 'James', '1 pet': '1 Peter', '2 pet': '2 Peter',
  '1 pt': '1 Peter', '2 pt': '2 Peter', '1 jn': '1 John', '2 jn': '2 John', '3 jn': '3 John',
  'rev': 'Revelation',
};

// alias (normalized) -> canonical book name. Built once.
const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const name of Object.keys(BOOK_CHAPTERS)) map[normKey(name)] = name;
  for (const [alias, canonical] of Object.entries(EXTRA_ALIASES)) map[normKey(alias)] = canonical;
  return map;
})();

function normKey(s: string): string {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Alternation of every alias, longest first so "Song of Solomon" beats "Song" and
// "1 John" beats "John". An optional trailing period allows "Ps." and "Phil.".
const BOOK_ALTERNATION = Object.keys(ALIAS_TO_CANONICAL)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join('|');

// Pass 1: known books, Chapter:Verse(-Verse). Case-insensitive, catches every real ref.
const KNOWN_REF_REGEX = new RegExp(`\\b(${BOOK_ALTERNATION})\\.?\\s+(\\d+):(\\d+)(?:\\s*[-–]\\s*(\\d+))?`, 'gi');

// Pass 2: book-LIKE citations to names NOT in our list (a fabricated book like
// "Hezekiah 4:2"). Capitalized first letter keeps it from matching lowercase prose
// such as "a 2:1 ratio". Anything it finds that does not resolve to a real book is
// flagged invalid_reference so the wiring never shows it as verified Scripture.
const GENERIC_REF_REGEX = new RegExp(`\\b((?:[1-3]\\s+)?[A-Z][a-zA-Z]+(?:\\s+of\\s+[A-Z][a-zA-Z]+)?)\\.?\\s+(\\d+):(\\d+)(?:\\s*[-–]\\s*(\\d+))?`, 'g');

// Pass 3: single-chapter books written without a chapter, like "Jude 21" meaning
// Jude 1:21. Requires the number NOT be followed by a colon (so "Jude 1:21" is left
// to pass 1).
const SINGLE_CHAPTER_ALTERNATION = Object.keys(ALIAS_TO_CANONICAL)
  .filter(a => SINGLE_CHAPTER_BOOKS.has(ALIAS_TO_CANONICAL[a]))
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex)
  .join('|');
const SINGLE_CHAPTER_REGEX = new RegExp(`\\b(${SINGLE_CHAPTER_ALTERNATION})\\.?\\s+(\\d+)(?!\\s*:)(?:\\s*[-–]\\s*(\\d+))?\\b`, 'gi');

/** Find every Scripture reference (real or fabricated-looking) in a block of text. */
export function extractReferences(text: string): VerseRef[] {
  if (!text || typeof text !== 'string') return [];
  const out: VerseRef[] = [];
  const covered: Array<[number, number]> = [];
  const isCovered = (i: number) => covered.some(([s, e]) => i >= s && i < e);

  let m: RegExpExecArray | null;

  KNOWN_REF_REGEX.lastIndex = 0;
  while ((m = KNOWN_REF_REGEX.exec(text)) !== null) {
    covered.push([m.index, m.index + m[0].length]);
    out.push({
      raw: m[0],
      book: ALIAS_TO_CANONICAL[normKey(m[1])] ?? null,
      chapter: parseInt(m[2], 10),
      verseStart: parseInt(m[3], 10),
      verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
      index: m.index,
    });
  }

  GENERIC_REF_REGEX.lastIndex = 0;
  while ((m = GENERIC_REF_REGEX.exec(text)) !== null) {
    if (isCovered(m.index)) continue;
    covered.push([m.index, m.index + m[0].length]);
    out.push({
      raw: m[0],
      book: ALIAS_TO_CANONICAL[normKey(m[1])] ?? null,
      chapter: parseInt(m[2], 10),
      verseStart: parseInt(m[3], 10),
      verseEnd: m[4] ? parseInt(m[4], 10) : undefined,
      index: m.index,
    });
  }

  SINGLE_CHAPTER_REGEX.lastIndex = 0;
  while ((m = SINGLE_CHAPTER_REGEX.exec(text)) !== null) {
    if (isCovered(m.index)) continue;
    covered.push([m.index, m.index + m[0].length]);
    out.push({
      raw: m[0],
      book: ALIAS_TO_CANONICAL[normKey(m[1])] ?? null,
      chapter: 1,
      verseStart: parseInt(m[2], 10),
      verseEnd: m[3] ? parseInt(m[3], 10) : undefined,
      index: m.index,
    });
  }

  return out.sort((a, b) => a.index - b.index);
}

/** Offline structure check: real book? chapter in range? Cannot check the verse number. */
export function validateStructure(ref: VerseRef): { bookValid: boolean; chapterValid: boolean } {
  const bookValid = !!ref.book && ref.book in BOOK_CHAPTERS;
  const chapterValid = bookValid && ref.chapter >= 1 && ref.chapter <= BOOK_CHAPTERS[ref.book as string];
  return { bookValid, chapterValid };
}

/**
 * Given the loaded verses for the cited chapter, confirm the verse(s) exist and return
 * the real joined text. `unavailable` is true when no verses were supplied (chapter could
 * not be loaded), which is different from the verse genuinely not existing.
 */
export function verifyAgainstVerses(
  ref: VerseRef,
  verses: VerseText[],
): { exists: boolean; text: string | null; unavailable: boolean } {
  if (!verses || verses.length === 0) return { exists: false, text: null, unavailable: true };
  const end = ref.verseEnd && ref.verseEnd >= ref.verseStart ? ref.verseEnd : ref.verseStart;
  const parts: string[] = [];
  for (let v = ref.verseStart; v <= end; v++) {
    const hit = verses.find(x => x.verse === v);
    if (!hit) return { exists: false, text: null, unavailable: false };
    parts.push(hit.text);
  }
  return { exists: true, text: parts.join(' '), unavailable: false };
}

/**
 * High-level orchestrator the AI-call wiring uses. Extracts references, validates each,
 * and (for structurally valid ones) loads the chapter via the INJECTED loader to confirm
 * the verse and capture the real text. The loader is typically fetchChapter from
 * data/bible-web.ts, passed in by the caller so this module imports nothing heavy.
 */
export async function verifyReferencesInText(
  text: string,
  loadChapter: (book: string, chapter: number) => Promise<VerseText[]>,
): Promise<VerifyResult[]> {
  const refs = extractReferences(text);
  const results: VerifyResult[] = [];

  for (const ref of refs) {
    const { bookValid, chapterValid } = validateStructure(ref);
    if (!bookValid || !chapterValid) {
      results.push({ ref, status: 'invalid_reference', realText: null });
      continue;
    }
    let verses: VerseText[] = [];
    try {
      verses = await loadChapter(ref.book as string, ref.chapter);
    } catch {
      verses = [];
    }
    const checked = verifyAgainstVerses(ref, verses);
    if (checked.unavailable) {
      results.push({ ref, status: 'unavailable', realText: null });
    } else if (checked.exists) {
      results.push({ ref, status: 'verified', realText: checked.text });
    } else {
      results.push({ ref, status: 'invalid_verse', realText: null });
    }
  }

  return results;
}
