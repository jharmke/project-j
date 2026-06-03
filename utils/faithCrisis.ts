// utils/faithCrisis.ts
//
// Faith AI companion: deterministic crisis pre-screen (Piece 1, safety first).
//
// Runs BEFORE any message reaches the AI. If it detects a real-emergency signal
// (self-harm, abuse, immediate danger, acute medical), the app short-circuits: it
// never calls the AI and instead shows CRISIS_RESPONSE, which is care plus real
// resources ONLY, with NO scripture, per the locked crisis-routing design in
// SPEC_faith_ai.md.
//
// DEFENSE IN DEPTH. This is layer 1: fast, certain, unfoolable, but literal. It only
// catches high-confidence phrases and cannot read meaning, paraphrase, or typos. That
// is by design. Layer 2 is the AI, instructed to RECOGNIZE a crisis it understands
// semantically (including typos and phrasings this screen never anticipated) and raise
// a flag; the code then serves this SAME hardcoded response, so the AI never improvises
// the words a hurting person sees. So: this screen handles clear cases instantly; the
// AI handles the ambiguous middle; the final crisis message is always the vetted one.
//
// This screen only runs on messages typed TO the faith companion (never on food or
// workout notes), so casual hyperbole is less likely and we can lean sensitive at low
// false-positive cost.
//
// TUNING PRINCIPLES baked in:
//  - Negation-aware: "I don't want to die" / "I would never kill myself" do NOT fire.
//  - Guards against common non-crisis meanings: faith ("die to self", "take my life"
//    hymn, "can't go on without You"), idioms ("shoot myself in the foot", "stroke of
//    luck"), and physical injury ("I hurt myself at the gym", "cut myself shaving").
//  - The very highest-stakes phrases ("kill myself", "want to die") are left sensitive
//    on purpose: a rare false alarm there is a caring screen the user can close; a miss
//    is catastrophic. We accept the asymmetry.
//  - Lookahead only (no lookbehind), so it is safe on the React Native Hermes engine.
//
// This phrase set is a STARTING POINT, hardened further by adversarial red-teaming at
// build (per the spec). Add patterns over time; never treat it as exhaustive.

export type CrisisCategory = 'self_harm' | 'danger' | 'abuse' | 'medical';

export interface CrisisScreenResult {
  isCrisis: boolean;
  category?: CrisisCategory;
}

// Lowercase, normalize odd apostrophes to a straight one, drop other punctuation to
// spaces (so "die." matches "die"), and collapse whitespace.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Words that flip a phrase's meaning. If one appears in the few tokens immediately
// before a matched phrase, the match is treated as negated and skipped. This is what
// stops "I don't want to die" and "I would never kill myself" from firing.
const NEGATORS = new Set([
  'not', 'never', 'dont', "don't", 'didnt', "didn't",
  'doesnt', "doesn't", 'wont', "won't", 'wouldnt', "wouldn't",
  'isnt', "isn't", 'aint', "ain't",
]);

function isNegated(textBeforeMatch: string): boolean {
  const tokens = textBeforeMatch.split(' ').filter(Boolean);
  // Look at up to the 3 words right before the phrase.
  return tokens.slice(-3).some(tok => NEGATORS.has(tok));
}

// Word boundaries (\b) stop substring traps like "die" inside "diet" or "died".
// Apostrophes are optional ('?) so "cant" and "can't" both match after normalization.
const SELF_HARM: RegExp[] = [
  /\bkill(ing)? my ?self\b/,
  /\bend(ing)? (my life|it all)\b/,
  /\btake my own life\b/,                                  // not "take my life" (hymn)
  /\bsuicid(e|al)\b/,
  /\b(want(ing)? to|wanna) die\b(?!\s+(to|unto)\b)/,     // excludes "die to self/sin"
  /\b(want(ing)? to|wanna) be dead\b/,
  /\bwish i (was|were|wasn'?t) dead\b/,
  /\bwish i wasn'?t (here|alive|born)\b/,                  // negative forms only; "wish I was born rich" stays quiet
  /\bwish i('d| had| was| were)? never (been )?born\b/,    // "wish I had never been born"
  /\bbetter off (dead|without me)\b/,
  /\bno reason to (live|go on|be here)\b/,
  /\bno point in living\b/,
  /\bnot worth living\b/,
  /\bdon'?t want to (be here|live|exist|wake up|go on)\b/,
  /\b(want(ing)? to|wanna|going to) give up on (life|living)\b/,
  /\bcan'?t (go on|keep going|do this anymore|take (it|this) anymore)\b(?!\s+without\b)/, // not "...without You"
  /\bself[ -]?harm\b/,
  /\b(want|wanna|going|trying|thinking about|need|tempted) (to )?(hurt|harm|cut) my ?self\b/, // intent-anchored, excludes injury
  /\bcutting my ?self\b(?!\s+(shaving|while|on|by accident))/,
  /\bhang(ing)? my ?self\b/,
  /\bshoot(ing)? my ?self\b(?!\s+in the foot)/,            // not the idiom
  /\bslit(ting)? my wrists?\b/,
  /\boverdos(e|ing|ed)\b/,
  /\bend (my|the) pain\b/,
  /\b(want|wanna) (it all|everything) to (be over|end|stop)\b/,
];

const DANGER: RegExp[] = [
  /\bin (immediate |real )?danger\b/,
  /\b(going|trying) to (hurt|kill) me\b/,
  /\bthreaten(ing|ed)? to (hurt|kill)\b/,
  /\bafraid (he|she|they)('ll| will| might| is going to| are going to) (hurt|kill)\b/,
];

const ABUSE: RegExp[] = [
  /\b(being|been|getting) (abused|hit|beaten|raped|assaulted|molested)\b/,
  /\b(he|she|they) (hits|hit|beats|beat|rapes|raped|abuses|abused|hitting|beating|punches|punched|chokes|choked) me\b/, // physical-violence verbs only
  /\bmy (husband|wife|partner|boyfriend|girlfriend|dad|mom|father|mother|parents?) (hits|hit|beats|beat|abuses|abused|is hurting|is hitting|is abusing) me\b/,
  /\bdomestic (violence|abuse)\b/,
  /\bafraid (of|for) my (life|safety)\b/,
  /\b(raped|molested|sexually assaulted)\b/,
];

const MEDICAL: RegExp[] = [
  /\bchest pain\b/,
  /\bcan'?t breathe\b/,
  /\bhaving (a|an) (heart attack|stroke|seizure)\b/,        // not "stroke of luck"
  /\bbleeding (badly|out|won'?t stop|wont stop|a lot)\b/,
  /\btook too many (pills|of)\b/,
  /\bcall (911|an ambulance)\b/,
];

const CATEGORIES: Array<{ name: CrisisCategory; patterns: RegExp[] }> = [
  { name: 'self_harm', patterns: SELF_HARM },
  { name: 'danger', patterns: DANGER },
  { name: 'abuse', patterns: ABUSE },
  { name: 'medical', patterns: MEDICAL },
];

/**
 * Deterministic crisis screen. Returns isCrisis:true with the matched category on the
 * first non-negated hit. The category is for red-team visibility and possible
 * privacy-safe metrics; the response shown is the same regardless of category.
 */
export function screenForCrisis(text: string): CrisisScreenResult {
  if (!text || typeof text !== 'string') return { isCrisis: false };
  const normalized = normalize(text);
  if (!normalized) return { isCrisis: false };

  for (const cat of CATEGORIES) {
    for (const pattern of cat.patterns) {
      // Reset lastIndex defensively (patterns are not global, but be safe).
      pattern.lastIndex = 0;
      const match = pattern.exec(normalized);
      if (match && !isNegated(normalized.slice(0, match.index))) {
        return { isCrisis: true, category: cat.name };
      }
    }
  }
  return { isCrisis: false };
}

// The hardcoded crisis response. Care and real resources only. NO scripture, no verse,
// no faith framing (dropping a verse on someone mid-crisis can feel dismissive). US-first
// resources per the locked design and the US launch. No double dashes anywhere.
export interface CrisisResource {
  label: string;
  detail: string;
  action: 'tel' | 'sms';
  value: string;  // number to dial or text
  body?: string;  // prefilled text body (Crisis Text Line)
}

export const CRISIS_RESPONSE: {
  message: string;
  resources: CrisisResource[];
  outsideUS: string;
  closing: string;
} = {
  message:
    "I'm really glad you reached out, and right now the most important thing is your safety. " +
    "What you're feeling matters, and you don't have to carry it alone. " +
    "Please connect with someone who can help you right now:",
  resources: [
    { label: '988 Suicide & Crisis Lifeline', detail: 'Call or text 988', action: 'tel', value: '988' },
    { label: 'Crisis Text Line', detail: 'Text HOME to 741741', action: 'sms', value: '741741', body: 'HOME' },
    { label: 'Emergency', detail: 'Call 911 if you are in immediate danger', action: 'tel', value: '911' },
  ],
  outsideUS:
    'Outside the US? Please contact your local emergency services or a trusted crisis line in your country.',
  closing: 'You matter. Please reach out to one of these right now.',
};
