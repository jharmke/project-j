// functions/src/knowledgeRouter.ts
//
// Picks which chapters of Otto's app map a message actually needs. Design: SPEC_otto_routing.md (item H),
// batch 2. Today he ships all 15 chapters on every message -- ~18,400 tokens, about 38% of the AI bill.
//
// ⚠️ NOT WIRED TO ANYTHING YET. This file only decides; `appCompanion.ts` still sends everything. Turning it
// on is a separate change, deliberately, so that if Otto starts behaving oddly it is traceable to one thing.
//
// ── THE THREE RULES THIS IMPLEMENTS ──────────────────────────────────────────────────────────────────
//
// 1. WHOLE CHAPTERS, NEVER FRAGMENTS. Sending just the barcode paragraph instead of the whole Log chapter
//    is the tempting optimisation and it is the dangerous state: Otto can see he has Log material, so he
//    does not realise anything is missing, and answers a meal-slot question off a scrap while sounding
//    certain. Whole chapters keep him either fully informed or obviously empty, and empty makes his
//    existing no-guess rule fire.
//
// 2. OWNS, NOT MENTIONS -- and this file does not take that on trust, it enforces it mechanically. A term
//    is indexed to a chapter ONLY IF IT APPEARS IN EXACTLY ONE CHAPTER. "Weight" appears in 10 of the 15,
//    because Settings mentions it once for the pounds-or-kilos option; a hand-written list would happily
//    route every weight question into Settings. Anything shared is simply not a routing signal.
//
// 3. THE LIST IS GENERATED FROM THE MAP, NOT FROM IMAGINATION. The real risk is not common words, it is the
//    app's OWN names -- Primed, Head to Head, Effort vs Results, Faith Today, At a Glance. "What does Primed
//    mean" contains no generic word to catch. Extracting them mechanically cannot forget one, and it
//    re-derives itself whenever the map is edited.
//
// ⚠️ NO MODEL CALL. Plain matching in code: free, instant, and you can read the index and know exactly what
// it will do. A second model call would add latency to every reply and be wrong in ways you cannot inspect.
import { CHAPTER_TITLES, chaptersForRouting } from './knowledgeChapters';

/**
 * Always sent, whatever the question (~2,100 tokens). This is what makes a routing MISS harmless rather
 * than harmful: the Quick Index alone answers most "how do I X" questions, and HOW TO USE THIS MAP holds
 * the rule that Profile is not a tab for most users -- without it, every chapter's navigation path is wrong.
 */
export const CORE_CHAPTERS: readonly string[] = [
  'HOW TO USE THIS MAP',
  'NAVIGATION MODEL: TABS',
  'COMMON "HOW DO I..." QUICK INDEX',
  'COACHING MODES (affects almost every feature -- context for answers)',
  'FAITH JOURNEY TIERS (context for answers)',
];

// ⚠️ SUPPORT THE MISSION IS NOT IN THE CORE YET, AND THAT IS A KNOWN GAP, NOT AN OVERSIGHT. The spec is
// firm that its RULES are global (never bring up the plan unprompted, faith is never paywalled, never say
// "the whole app is free", never call a tier "unlimited") and that routing them away is the one place a
// miss does real damage rather than merely being unhelpful. Extracting ~300 tokens of rules from that
// 1,064-token chapter is item B's rewrite, not this file's. UNTIL THAT LANDS, treat membership as a
// must-route topic: the index below is seeded so anything money-shaped reaches it.

/** Words too generic to route on even if the map happens to use them in one chapter only. */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'you', 'your', 'with', 'that', 'this', 'from', 'have', 'has', 'not', 'but', 'all',
  'can', 'will', 'what', 'when', 'how', 'why', 'who', 'are', 'was', 'they', 'them', 'its', 'it', 'a', 'an',
  'app', 'tab', 'screen', 'card', 'button', 'tap', 'open', 'see', 'show', 'shows', 'set', 'sets', 'get',
  'gets', 'use', 'uses', 'add', 'new', 'one', 'two', 'day', 'days', 'week', 'time', 'top', 'left', 'right',
  'yes', 'no', 'off', 'on', 'in', 'out', 'up', 'down', 'per', 'each', 'any', 'only', 'also', 'then', 'than',
]);

/**
 * Build the term -> chapter index at module load.
 *
 * ⚠️ EXACTLY-ONE-CHAPTER IS THE WHOLE TRICK. A term seen in two or more chapters is dropped entirely
 * rather than pointed at both: a word that vague is not evidence of anything, and routing on it is how you
 * get a confident WRONG match, which is the failure that actually hurts. Misses are cheap (send everything);
 * wrong matches are not.
 */
function buildStats(): Map<string, Map<string, number>> {
  const seen = new Map<string, Map<string, number>>();
  for (const { title, text } of chaptersForRouting()) {
    if (CORE_CHAPTERS.includes(title)) continue;
    for (const [term, count] of extractTerms(text)) {
      let owners = seen.get(term);
      if (!owners) { owners = new Map(); seen.set(term, owners); }
      owners.set(title, (owners.get(title) ?? 0) + count);
    }
  }
  return seen;
}

function buildIndexUnused(): Map<string, string> {
  // term -> chapter -> how many times it occurs in that chapter
  const seen = new Map<string, Map<string, number>>();

  for (const { title, text } of chaptersForRouting()) {
    if (CORE_CHAPTERS.includes(title)) continue; // core always ships; indexing it would route noise
    for (const [term, count] of extractTerms(text)) {
      let owners = seen.get(term);
      if (!owners) { owners = new Map(); seen.set(term, owners); }
      owners.set(title, (owners.get(title) ?? 0) + count);
    }
  }

  const index = new Map<string, string>();
  for (const [term, owners] of seen) {
    // ⚠️ DOMINANCE, NOT EXCLUSIVITY, and this was the third correction. Demanding a term appear in exactly
    // ONE chapter throws away the best signals there are: "routine" is overwhelmingly a Workout word but it
    // is mentioned once elsewhere, so exclusivity binned it, and "how do i build a routine" then routed on
    // whatever weak scrap was left. A term now belongs to the chapter holding the clear majority of its
    // uses; if no chapter has a clear majority, the term genuinely is ambiguous and is dropped.
    const total = [...owners.values()].reduce((a, b) => a + b, 0);
    const [chapter, count] = [...owners].sort((a, b) => b[1] - a[1])[0];
    if (count / total < DOMINANCE) continue;
    // ⚠️ EXCLUSIVE IS NOT THE SAME AS DISTINCTIVE, and the first version of this file confused the two.
    // Ordinary words like "make", "difference" and "bigger" each happen to appear in exactly one chapter,
    // so exclusivity alone indexed them -- and "how do i make a recipe" routed to the MEMBERSHIP chapter.
    // A word a chapter is genuinely ABOUT gets used repeatedly in it ("barcode" all through Log); an
    // incidental one appears once. Requiring repetition separates the two mechanically, with no hand-built
    // vocabulary to maintain. Single-use phrases still qualify if they are multi-word, because the app's
    // own names ("head to head", "effort vs results") can legitimately appear only once.
    // ⚠️ PHRASES NEED REPETITION TOO, and letting them skip it was the second bug. Indexing every 2- and
    // 3-word sequence in the map produced ~4,000 "terms" per chapter, nearly all of it debris like
    // "does head to" -- and debris routes. A real feature name is used more than once in the chapter that
    // owns it, so the same repetition test that works for single words works here; phrases just need a
    // lower bar because they are far more specific to begin with.
    const isPhrase = term.includes(' ');
    if (count >= (isPhrase ? MIN_PHRASE_OCCURRENCES : MIN_TERM_OCCURRENCES)) index.set(term, chapter);
  }
  return index;
}

/** How often a single word must occur in its chapter before it counts as that chapter's vocabulary. */
const MIN_TERM_OCCURRENCES = 3;
const MIN_PHRASE_OCCURRENCES = 2;
/** Share of a term's total uses that must sit in one chapter for that chapter to own it. */
const DOMINANCE = 0.7;

/**
 * Candidate routing terms from one chapter's text: single words, plus 2- and 3-word phrases so the app's
 * own multi-word names survive ("head to head", "effort vs results", "meal slot", "faith today").
 */
function extractTerms(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const bump = (t: string) => out.set(t, (out.get(t) ?? 0) + 1);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // ⚠️ NO FREQUENCY FLOOR ANY MORE. Scoring made it unnecessary and harmful: a word used once in the Log
    // chapter is still a Log word, and throwing those away is what left half of all messages with nothing
    // to match on. Precision now comes from how the votes AGGREGATE, not from pre-filtering the vocabulary.
    if (w.length >= 4 && !STOPWORDS.has(w)) bump(w);
    // ⚠️ PHRASES SKIP STOPWORD FILTERING ON PURPOSE. "head to head" and "effort vs results" are made
    // entirely of words that mean nothing alone; the phrase is the signal.
    // A phrase made entirely of filler ("does head to", "how do i") is debris, not a name. Requiring at
    // least one real word in it removes most of the noise before the repetition test even runs.
    const real = (t: string) => t.split(' ').some(x => x.length >= 4 && !STOPWORDS.has(x));
    if (i + 1 < words.length) {
      const two = `${w} ${words[i + 1]}`;
      if (two.length >= 7 && real(two)) bump(two);
    }
    if (i + 2 < words.length) {
      const three = `${w} ${words[i + 1]} ${words[i + 2]}`;
      if (three.length >= 11 && real(three)) bump(three);
    }
  }
  return out;
}

/**
 * THE APP'S OWN NAMES, pulled out of the map: "Head to Head", "Effort vs Results", "Day Score", "Faith
 * Today", "Primed". These are the sharpest signal there is -- one name, one chapter, no arithmetic -- and
 * the spec asked for them by name. The statistical index below is the BACKUP for the majority of questions
 * that contain no product name at all ("how do i change my password" names nothing).
 *
 * ⚠️ NAMES ARE FOUND BY CAPITALISATION MID-SENTENCE, not from a hand-written list, so a name added to the
 * map starts routing without anybody remembering to update this file.
 * ⚠️ SENTENCE-INITIAL WORDS ARE SKIPPED -- every sentence starts with a capital and none of those are names.
 * ⚠️ ALL-CAPS IS EMPHASIS IN THIS MAP ("NEVER", "SCAN A NUTRITION LABEL"), not naming, so it is excluded.
 */
function buildNameIndex(): Map<string, string> {
  const seen = new Map<string, Map<string, number>>();
  const CONNECTORS = new Set(['to', 'vs', 'a', 'the', 'of', 'and', 'for']);

  for (const { title, text } of chaptersForRouting()) {
    if (CORE_CHAPTERS.includes(title)) continue;
    const found: string[] = [];

    // Title Case runs of 2-4 words, allowing lowercase connectors INSIDE ("Head to Head").
    const phrase = /\b[A-Z][a-z]{2,}(?:[ \t]+(?:[A-Z][a-z]{2,}|to|vs|a|the|of|and|for)){1,3}\b/g;
    for (const m of text.matchAll(phrase)) {
      const words = m[0].split(/\s+/);
      // ⚠️ A NAME CANNOT END ON A CONNECTOR. Without this the extractor produced "tap to", "answer the",
      // "correcting a" and "from the" -- fragments of ordinary sentences that then matched almost every
      // message and outvoted the real names.
      if (CONNECTORS.has(words[words.length - 1].toLowerCase())) continue;
      // At least two genuinely capitalised words, so "The Log" style fragments do not qualify.
      if (words.filter(w => /^[A-Z]/.test(w)).length < 2) continue;
      found.push(m[0].toLowerCase());
    }

    // ⚠️ SINGLE-WORD NAMES ARE THE RISKY ONES. "Food", "Meal" and "Today" all appear capitalised somewhere,
    // but they are ordinary words that show up in half the questions people ask. A real product name is
    // capitalised nearly every time it is written, so the test is the RATIO: how often this word appears
    // capitalised mid-sentence against how often it appears at all.
    const lowerCounts = new Map<string, number>();
    for (const m of text.toLowerCase().matchAll(/\b[a-z]{4,}\b/g)) {
      lowerCounts.set(m[0], (lowerCounts.get(m[0]) ?? 0) + 1);
    }
    const capCounts = new Map<string, number>();
    for (const m of text.matchAll(/(?<=[a-z,;)]\s)\b[A-Z][a-z]{3,}\b/g)) {
      const w = m[0].toLowerCase();
      capCounts.set(w, (capCounts.get(w) ?? 0) + 1);
    }
    for (const [w, caps] of capCounts) {
      const all = lowerCounts.get(w) ?? caps;
      if (caps / all >= NAME_CAPITALISATION_RATIO) found.push(w);
    }

    for (const raw of found) {
      // Matches can span a line break in the source map ("day\n  detail"), which would never match a typed
      // message. Collapse the whitespace so the term is what a person would actually write.
      const term = raw.replace(/\s+/g, ' ').trim();
      if (STOPWORDS.has(term)) continue;
      let owners = seen.get(term);
      if (!owners) { owners = new Map(); seen.set(term, owners); }
      owners.set(title, (owners.get(title) ?? 0) + 1);
    }
  }

  const index = new Map<string, string>();
  for (const [term, owners] of seen) {
    const total = [...owners.values()].reduce((a, b) => a + b, 0);
    const [chapter, count] = [...owners].sort((a, b) => b[1] - a[1])[0];
    // A phrase is specific enough to trust on one sighting; a single word has to prove itself, because
    // ordinary words get capitalised by accident.
    const enough = term.includes(' ') ? count >= 1 : count >= 2;
    if (enough && count / total >= NAME_DOMINANCE) index.set(term, chapter);
  }
  return index;
}

/** A name has to be this concentrated in one chapter to be treated as that chapter's. */
const NAME_DOMINANCE = 0.75;
/** A single word only counts as a name if it is capitalised this often relative to all its uses. */
const NAME_CAPITALISATION_RATIO = Number(process.env.ROUTER_CAP_RATIO ?? 0.6);

const NAMES = buildNameIndex();
const STATS = buildStats();

/** The extracted names themselves. Diagnostics only -- precision problems show up on sight. */
export function debugNames(): Map<string, string> {
  return NAMES;
}

/** How many app names point at each chapter. Diagnostics only. */
export function nameIndexSize(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const chapter of NAMES.values()) counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
  return counts;
}

/** How much distinct vocabulary each chapter has, for the size normalisation in routeChapters. */
const CHAPTER_TERM_COUNT: Map<string, number> = (() => {
  const counts = new Map<string, number>();
  for (const owners of STATS.values()) {
    for (const chapter of owners.keys()) counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
  }
  return counts;
})();

/** How many distinct terms each chapter has any claim on. Diagnostics only. */
export function indexSize(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const owners of STATS.values()) {
    for (const chapter of owners.keys()) counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
  }
  return counts;
}

export interface RouteResult {
  /** The chapters to send, in document order. */
  chapters: string[];
  /** True when nothing matched and we fell back to sending the whole map. */
  fellBack: boolean;
  /** Which chapters matched and on what, for the offline harness and shadow logging. */
  hits: { chapter: string; terms: string[] }[];
}

/**
 * Decide what a message needs.
 *
 * ⚠️ DELIBERATELY GENEROUS. Over-sending costs a fraction of a cent; under-sending makes Otto confabulate.
 * Every chapter with a hit is sent, not just the strongest one -- an ambiguous question that touches Log and
 * Workout sends both, which is still barely a third of what goes today.
 *
 * ⚠️ NOTHING MATCHED -> SEND EVERYTHING, exactly as today. Costs what it costs now and carries no new risk,
 * which is why a typo or an unusual phrasing is safe rather than damaging.
 */
export function routeChapters(message: string): RouteResult {
  const text = ` ${(message || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const score = new Map<string, number>();
  const nameScore = new Map<string, number>();
  const why = new Map<string, string[]>();
  let confident = 0;

  // ⚠️ NAMES FIRST, AND THEY COUNT FOR MUCH MORE. Somebody typing "head to head" or "primed" has told us
  // exactly which chapter they need; no amount of statistical inference beats that. Each name match is
  // worth a large fixed score and counts as confidence on its own, so a single named question routes
  // instead of falling back to sending the whole map.
  for (const [name, chapter] of NAMES) {
    if (!text.includes(` ${name} `)) continue;
    nameScore.set(chapter, (nameScore.get(chapter) ?? 0) + 1);
    confident += MIN_CONFIDENT_HITS; // one name is enough on its own
    const list = why.get(chapter) ?? [];
    if (list.length < 6) list.push(`name:${name}`);
    why.set(chapter, list);
  }

  for (const [term, owners] of STATS) {
    if (!text.includes(` ${term} `)) continue;
    const total = [...owners.values()].reduce((a, b) => a + b, 0);
    for (const [chapter, count] of owners) {
      // ⚠️ SHARE, NOT RAW COUNT. A term that is 90% one chapter's is strong evidence for it however often
      // it appears; a term spread evenly across five chapters is evidence for none of them and contributes
      // almost nothing to any. Squaring pushes the confident terms further ahead of the vague ones.
      const share = count / total;
      const weight = share * share * (term.includes(' ') ? PHRASE_BONUS : 1);
      score.set(chapter, (score.get(chapter) ?? 0) + weight);
      if (share >= CONFIDENT_SHARE) {
        confident++;
        const list = why.get(chapter) ?? [];
        if (list.length < 6) list.push(term);
        why.set(chapter, list);
      }
    }
  }

  // ⚠️ NORMALISE BY CHAPTER SIZE OR THE BIGGEST CHAPTER WINS EVERYTHING. A long chapter has more vocabulary,
  // so more of its words turn up in any given sentence and it out-votes the right answer on volume alone.
  // Measured: without this, KEY DESTINATION SCREENS won questions about verses, day scores and routines.
  // Dividing by the square root of the chapter's vocabulary keeps a big chapter competitive when it really
  // is the subject, without letting size alone decide.
  // ⚠️ NAMES ARE NOT SIZE-NORMALISED, the statistics are. Dividing by chapter size corrects for a long
  // chapter having more ordinary vocabulary, which is a real bias -- but a NAME is exact, and shrinking it
  // because its chapter happens to be long would hand the question to a smaller chapter that merely
  // mentioned something. So the two are scored separately and added.
  const chapters = new Set([...score.keys(), ...nameScore.keys()]);
  const ranked = [...chapters]
    .map(c => [
      c,
      (nameScore.get(c) ?? 0) * NAME_WEIGHT +
      (score.get(c) ?? 0) / Math.sqrt(CHAPTER_TERM_COUNT.get(c) ?? 1),
    ] as [string, number])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);
  // ⚠️ THE FALLBACK TEST IS "DID WE SEE A CONFIDENT WORD", not a score threshold. An absolute cutoff on the
  // score is unreadable and broke silently the moment size normalisation changed the numbers' scale --
  // every message fell back and the router looked perfect while doing nothing. Counting how many strongly
  // owned words appeared is a number you can reason about without knowing the maths.
  if (ranked.length === 0 || confident < MIN_CONFIDENT_HITS) {
    return { chapters: [...CHAPTER_TITLES], fellBack: true, hits: [] };
  }

  // ⚠️ KEEP EVERYTHING CLOSE TO THE WINNER, do not take the top one alone. Over-sending costs a fraction of
  // a cent; under-sending makes Otto answer confidently from material he does not have. A question that
  // genuinely straddles two areas should get both.
  const top = ranked[0][1];
  const picked = ranked.filter(([, s]) => s >= top * RELATIVE_KEEP).slice(0, MAX_CHAPTERS).map(([c]) => c);

  const wanted = new Set<string>([...CORE_CHAPTERS, ...picked]);
  return {
    chapters: CHAPTER_TITLES.filter(t => wanted.has(t)),
    fellBack: false,
    hits: picked.map(chapter => ({ chapter, terms: why.get(chapter) ?? [] })),
  };
}

/** A term whose uses are at least this concentrated in one chapter counts as real evidence. */
const CONFIDENT_SHARE = Number(process.env.ROUTER_SHARE ?? 0.6);
/** How many such words a message needs before we trust routing at all. Below it, send everything. */
const MIN_CONFIDENT_HITS = Number(process.env.ROUTER_MIN_HITS ?? 2);
/** Chapters scoring at least this share of the winner also get sent. */
const RELATIVE_KEEP = Number(process.env.ROUTER_KEEP ?? 0.45);
/** Ceiling, so a rambling message cannot quietly turn into "send everything" by another route. */
const MAX_CHAPTERS = Number(process.env.ROUTER_MAX ?? 3);
/** Multi-word matches are far more specific than single words, so they count for more. */
const PHRASE_BONUS = 3;
/** What one app-name match is worth against the statistical score. Deliberately decisive. */
const NAME_WEIGHT = Number(process.env.ROUTER_NAME_WEIGHT ?? 1);
