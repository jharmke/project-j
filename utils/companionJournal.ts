// Conditional JOURNAL + PRAYER context for Otto (on-demand dataset #7, the LAST in the thread -- same pattern
// as companionAchievements / companionBody / companionFood). This is the most PRIVATE data the user has:
// personal reflections, gratitude, and prayers. Handled deliberately:
//   - Attached ONLY on an explicit journal / reflection / gratitude / prayer question. NOT hooked to the
//     shared whole-day recall, so a generic "what did I do on June 24" never drags private reflections in.
//   - FAITH-TIER GATED: a "Not Right Now" user has faith features hidden, so we skip prayers + the faith
//     journal categories (verse / gratitude) for them; their personal / fitness / study journal still works.
//   - Excerpted, not dumped: long entries are trimmed to a snippet so Otto can summarize without shipping a
//     500-word entry into the prompt. Full text lives on the Journal / Prayer screens.
// Sources: pj_bible_reflections (the Journal screen) + pj_prayers (utils/prayers). Both are the user's own
// data going to the user's own assistant; Otto is told to treat it gently and never invent an entry.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPrayers, getActive, getAnswered, answeredCount } from './prayers';

const MAX_JOURNAL = 15;      // most-recent entries listed
const MAX_ANSWERED = 8;      // recent answered prayers listed
const EXCERPT_CHARS = 240;   // per-entry notes snippet cap
const CHAR_BUDGET = 6000;

const CATEGORY_LABEL: Record<string, string> = {
  verse: 'Verse', prayer: 'Prayer', study: 'Study', personal: 'Personal', gratitude: 'Gratitude', fitness: 'Fitness',
};
// Categories tied to the faith experience -- withheld from "Not Right Now" users.
const FAITH_CATEGORIES = new Set(['verse', 'prayer', 'gratitude']);

const fmtDay = (dk: string): string => {
  try {
    // Journal dates are local YYYY-MM-DD; be tolerant of legacy/ISO values.
    const s = String(dk).slice(0, 10);
    return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return String(dk); }
};
const fmtMs = (ms: number): string => {
  try { return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};
const excerpt = (s: string): string => {
  const clean = String(s || '').replace(/\s+/g, ' ').trim();
  return clean.length > EXCERPT_CHARS ? clean.slice(0, EXCERPT_CHARS).trimEnd() + '…' : clean;
};

// Journal / reflection / gratitude / prayer words + an ask/possessive. Kept explicit (no day-recall hook) so
// private content only surfaces when the user is clearly asking about it.
export const messageWantsJournal = (text: string): boolean => {
  const t = (text || '').toLowerCase();
  const jp = /\b(journal(?:ed|ing|s)?|reflection|reflections|reflect(?:ed|ing)?|entry|entries|gratitude|grateful|thankful|thank ?ful|prayer|prayers|pray(?:ed|ing|s)?|praying for|wrote about|write about|diary)\b/;
  const ask = /\b(did|do|does|have|has|had|how many|what|which|when|my|been|about|lately|recent(?:ly)?|last|this week|write|wrote|list|show|read|remind)\b/;
  return jp.test(t) && ask.test(t);
};

export const buildJournalContextIfRelevant = async (message: string): Promise<string | null> => {
  if (!messageWantsJournal(message || '')) return null;

  // Faith gating: withhold prayers + faith journal categories from "Not Right Now" users.
  let faithHidden = false;
  try {
    const raw = await AsyncStorage.getItem('pj_settings');
    if (raw) {
      const fj = String(JSON.parse(raw).faithJourney || '');
      faithHidden = /notright|not_?right|notrightnow/i.test(fj.replace(/\s+/g, ''));
    }
  } catch {}

  // ── Journal entries (pj_bible_reflections) ────────────────────────────────────
  let entries: any[] = [];
  try { const raw = await AsyncStorage.getItem('pj_bible_reflections'); const p = raw ? JSON.parse(raw) : []; if (Array.isArray(p)) entries = p; } catch {}
  // Newest first. New entries carry date=YYYY-MM-DD and are stored newest-first already; sort defensively by
  // date string so legacy ordering can't scramble it.
  entries = entries
    .filter(e => e && (e.notes || e.title))
    .filter(e => !(faithHidden && FAITH_CATEGORIES.has(e.category)))
    .sort((a, b) => (String(a.date) < String(b.date) ? 1 : String(a.date) > String(b.date) ? -1 : 0));

  const journalLines: string[] = [];
  let size = 0, droppedJournal = 0;
  for (const e of entries) {
    if (journalLines.length >= MAX_JOURNAL) { droppedJournal = entries.length - journalLines.length; break; }
    const cat = CATEGORY_LABEL[e.category] || 'Note';
    const title = String(e.title || '').replace(/\s+/g, ' ').trim();
    const body = excerpt(e.notes || '');
    const titlePart = title && title !== cat ? ` "${title}"` : '';
    const bodyPart = body ? ` — ${body}` : '';
    const line = `- ${fmtDay(e.date)} · ${cat}${titlePart}${bodyPart}`;
    if (journalLines.length > 0 && size + line.length > CHAR_BUDGET) { droppedJournal = entries.length - journalLines.length; break; }
    journalLines.push(line);
    size += line.length + 1;
  }

  // ── Prayers (pj_prayers) -- skipped entirely for "Not Right Now" ───────────────
  let active: any[] = [], answered: any[] = [], answeredN = 0;
  if (!faithHidden) {
    try {
      const prayers = await loadPrayers();
      active = getActive(prayers);
      answered = getAnswered(prayers);
      answeredN = answeredCount(prayers);
    } catch {}
  }

  // Nothing to say -> let Otto handle it from the KB (offer to start a journal / prayer).
  if (!journalLines.length && !active.length && !answered.length) return null;

  const out: string[] = [
    `JOURNAL + PRAYER (the user's OWN private reflections and prayers, from their Journal and Prayer screens).`,
    `This is personal, sometimes vulnerable content. Treat it with care and warmth, never clinically or`,
    `flippantly. It is exact -- never invent an entry, a date, or a prayer that isn't listed. When they ask`,
    `"what have I been journaling/praying about", summarize the themes gently rather than robotically reciting`,
    `every line, and for the full text point them to the Journal or Prayer screen.`,
  ];

  if (journalLines.length) {
    out.push('', `JOURNAL ENTRIES (most recent first, notes shown as a short excerpt):`, ...journalLines);
    if (droppedJournal > 0) out.push(`  (+${droppedJournal} older entr${droppedJournal === 1 ? 'y' : 'ies'} not shown; they're on the Journal screen.)`);
  } else {
    out.push('', 'JOURNAL ENTRIES: none logged yet.');
  }

  if (!faithHidden) {
    const prayerBlock: string[] = ['', 'PRAYERS:'];
    if (active.length) {
      prayerBlock.push(`  Active (things they're currently carrying, ${active.length}):`);
      active.slice(0, 20).forEach(p => prayerBlock.push(`    - ${excerpt(p.text)} (added ${fmtMs(p.createdAt)})`));
    } else {
      prayerBlock.push('  Active: none right now.');
    }
    if (answeredN > 0) {
      prayerBlock.push(`  Answered (${answeredN} total, most recent first):`);
      answered.slice(0, MAX_ANSWERED).forEach(p => prayerBlock.push(`    - ${excerpt(p.text)} (answered ${p.answeredAt ? fmtMs(p.answeredAt) : 'yes'})`));
      if (answeredN > MAX_ANSWERED) prayerBlock.push(`    (+${answeredN - MAX_ANSWERED} more answered on the Prayer screen)`);
    }
    out.push(...prayerBlock);
  }

  out.push(
    '',
    'How to answer:',
    '- "What have I journaled/reflected about lately" -> summarize the themes across the recent entries, warmly; offer to look closer if they want.',
    '- "What am I grateful for" -> pull from the Gratitude entries.',
    '- "What am I praying for" / "what am I carrying" -> the Active prayers. "What has God answered" / "answered prayers" -> the Answered list; this is a tender, encouraging moment, treat it that way.',
    '- "How many entries / prayers do I have" -> count from the lists above (note older ones may not all be shown).',
    '- A specific entry or prayer not shown here is older than the recent window -> say so and point them to the Journal / Prayer screen; never fabricate it.',
    '- Keep it brief and human. Do not quote long passages back verbatim; reference and summarize.',
  );
  return out.join('\n');
};
