// functions/src/crisis.ts
//
// Server-side crisis detection (the backstop). The client runs the same screen first
// and short-circuits to the hardcoded crisis response; this re-runs it in the Cloud
// Function before any AI call, in case a message reaches the server unscreened. On a
// hit the function returns a crisis flag and the CLIENT renders its own hardcoded
// crisis response (the client owns the wording the user approved), so this file only
// needs DETECTION, not the response text.
//
// MUST STAY IN SYNC with utils/faithCrisis.ts in the app. Same patterns, same negation
// handling. If you change one, change the other. No double dashes anywhere (project rule).

const NEGATORS = new Set([
  'not', 'never', 'dont', "don't", 'didnt', "didn't",
  'doesnt', "doesn't", 'wont', "won't", 'wouldnt', "wouldn't",
  'isnt', "isn't", 'aint', "ain't",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNegated(textBeforeMatch: string): boolean {
  const tokens = textBeforeMatch.split(' ').filter(Boolean);
  return tokens.slice(-3).some(tok => NEGATORS.has(tok));
}

const SELF_HARM: RegExp[] = [
  /\bkill(ing)? my ?self\b/,
  /\bend(ing)? (my life|it all)\b/,
  /\btake my own life\b/,
  /\bsuicid(e|al)\b/,
  /\b(want|wanting|wanna) to die\b(?!\s+(to|unto)\b)/,
  /\b(want|wanting|wanna) to be dead\b/,
  /\bwish i (was|were|wasn'?t) (dead|here|born|alive)\b/,
  /\bbetter off (dead|without me)\b/,
  /\bno reason to (live|go on|be here)\b/,
  /\bno point in living\b/,
  /\bnot worth living\b/,
  /\bdon'?t want to (be here|live|exist|wake up|go on)\b/,
  /\b(want|wanna|wanting|going) to give up on (life|living)\b/,
  /\bcan'?t (go on|keep going|do this anymore|take (it|this) anymore)\b(?!\s+without\b)/,
  /\bself[ -]?harm\b/,
  /\b(want|wanna|going|trying|thinking about|need|tempted) (to )?(hurt|harm|cut) my ?self\b/,
  /\bcutting my ?self\b(?!\s+(shaving|while|on|by accident))/,
  /\bhang(ing)? my ?self\b/,
  /\bshoot(ing)? my ?self\b(?!\s+in the foot)/,
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
  /\b(he|she|they) (hits|hit|beats|beat|rapes|raped|abuses|abused|hitting|beating|punches|punched|chokes|choked) me\b/,
  /\bmy (husband|wife|partner|boyfriend|girlfriend|dad|mom|father|mother|parents?) (hits|hit|beats|beat|abuses|abused|is hurting|is hitting|is abusing) me\b/,
  /\bdomestic (violence|abuse)\b/,
  /\bafraid (of|for) my (life|safety)\b/,
  /\b(raped|molested|sexually assaulted)\b/,
];

const MEDICAL: RegExp[] = [
  /\bchest pain\b/,
  /\bcan'?t breathe\b/,
  /\bhaving (a|an) (heart attack|stroke|seizure)\b/,
  /\bbleeding (badly|out|won'?t stop|wont stop|a lot)\b/,
  /\btook too many (pills|of)\b/,
  /\bcall (911|an ambulance)\b/,
];

const ALL = [...SELF_HARM, ...DANGER, ...ABUSE, ...MEDICAL];

/** Returns true if the text trips any crisis signal (after negation handling). */
export function screenForCrisis(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalize(text);
  if (!normalized) return false;
  for (const pattern of ALL) {
    pattern.lastIndex = 0;
    const match = pattern.exec(normalized);
    if (match && !isNegated(normalized.slice(0, match.index))) return true;
  }
  return false;
}
