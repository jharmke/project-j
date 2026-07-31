// functions/src/knowledgeChapters.ts
//
// Splits Otto's app-knowledge map into its individual chapters so a request can send only the ones a
// question needs. Design: SPEC_otto_routing.md (THE PLAN item H).
//
// ⚠️ BATCH 1 CHANGES NOTHING OTTO SEES. `assembleAppKnowledge()` with no arguments returns every chapter,
// so the text sent today is byte-for-byte what was sent before this file existed. Routing is a later batch.
// Doing the plumbing on its own means that if anything breaks here it is a plumbing bug, not Otto behaving
// oddly, and every later batch lands on a foundation we already trust.
//
// ⚠️ THE SPLIT IS DONE BY PARSING THE EXISTING STRING, NOT BY RETYPING IT INTO 15 CONSTANTS. That map is
// dense with corrections earned from real bugs ("net carbs subtracts fiber AND sugar alcohols, never say
// minus fiber alone"), and hand-cutting it risks silently dropping one. Parsing cannot.
import { ASSISTANT_APP_KNOWLEDGE } from './assistantAppKnowledge';

// The map separates chapters with a line of exactly 80 '=' characters, in the shape:
//   <divider>
//   TITLE
//   <divider>
//   ...body...
const DIVIDER = '='.repeat(80);

export interface KnowledgeChapter {
  /** The chapter heading exactly as written in the map, e.g. "LOG TAB (FOOD DIARY)". */
  title: string;
  /** The chapter INCLUDING its dividers and title, so re-joining is lossless. */
  text: string;
}

function parse(src: string): { preamble: string; chapters: KnowledgeChapter[] } {
  const lines = src.split('\n');
  const chapters: KnowledgeChapter[] = [];
  let i = 0;

  // Everything before the first divider (the "# GoodForge ..." title + PURPOSE line) is the preamble and
  // is always sent -- it is 3 lines and it tells Otto what the map IS.
  const preamble: string[] = [];
  while (i < lines.length && lines[i] !== DIVIDER) preamble.push(lines[i++]);

  while (i < lines.length) {
    if (lines[i] !== DIVIDER) break;               // malformed; stop rather than guess
    const title = (lines[i + 1] ?? '').trim();
    const body: string[] = [];
    let j = i + 3;                                  // skip divider, title, divider
    while (j < lines.length && lines[j] !== DIVIDER) body.push(lines[j++]);
    chapters.push({ title, text: [DIVIDER, lines[i + 1] ?? '', DIVIDER, ...body].join('\n') });
    i = j;
  }

  return { preamble: preamble.join('\n'), chapters };
}

const PARSED = parse(ASSISTANT_APP_KNOWLEDGE);

/** Every chapter title, in document order. */
export const CHAPTER_TITLES: string[] = PARSED.chapters.map((c) => c.title);

/**
 * Build the app-knowledge block.
 *
 * @param titles which chapters to include. OMIT IT to include everything, which is what batch 1 does.
 *
 * ⚠️ CHAPTERS ARE ALWAYS EMITTED IN DOCUMENT ORDER, never in the order they were requested. Two users who
 * need the same chapters must produce byte-identical text or they cannot share a cached copy, and that
 * sharing is where most of the saving comes from. (This supersedes the old "append only" idea in
 * SPEC_otto.md, which preserved the prefix within ONE conversation at the cost of sharing across users.)
 */
export function assembleAppKnowledge(titles?: readonly string[]): string {
  const wanted = titles ? new Set(titles) : null;
  const picked = wanted ? PARSED.chapters.filter((c) => wanted.has(c.title)) : PARSED.chapters;
  return [PARSED.preamble, ...picked.map((c) => c.text)].join('\n');
}

/**
 * True when re-joining every chapter reproduces the original map exactly.
 *
 * ⚠️ THIS IS THE WHOLE SAFETY NET FOR BATCH 1. If a future edit to the map breaks the divider shape, the
 * parser would silently drop content and Otto would lose knowledge with nothing on screen to show for it.
 * Checked once at cold start; logs loudly and is covered by a test.
 */
export function chapterSplitIsLossless(): boolean {
  return assembleAppKnowledge() === ASSISTANT_APP_KNOWLEDGE;
}

if (!chapterSplitIsLossless()) {
  console.error(
    '[knowledgeChapters] SPLIT IS LOSSY -- Otto is missing part of his app knowledge. ' +
      `Parsed ${PARSED.chapters.length} chapters. Check the ${DIVIDER.length}-char divider shape in ` +
      'assistantAppKnowledge.ts.',
  );
}
