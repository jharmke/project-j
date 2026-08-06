// functions/src/ottoCoachRouting.ts
//
// PLAN.md 4.9. ONE yes/no question: can this message be answered WITHOUT the app manual?
//
// ⚠️ WHY THIS IS NOT ITEM H AGAIN. The router (SPEC_otto_routing.md) had to pick WHICH of 15 chapters to
// send, needed strong evidence to do it, and gave up 73% of the time on real phrasing. This asks a much
// smaller question -- "does this touch the app at all?" -- which needs no chapter identification. "did i eat
// too much today", the message that broke the router, is trivially not-an-app-question.
//
// 🔴 THE DEFAULT IS THE MANUAL, AND THAT IS THE WHOLE SAFETY STORY. This returns true ONLY when the message
// is confidently pure coaching. Every unsure case falls through to false = send the manual = exactly what
// Otto does today. So the failure mode is "saved less money", never "Otto invented where a button is".
//
// ⚠️ ALWAYS NORMALISE APOSTROPHES. Every keyword detector on this project has been bitten by the curly
// apostrophe iOS inserts. See [[detectors-are-brittle]].

/** Curly and straight apostrophes, and the punctuation people actually type. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ANYTHING NAMING A PART OF THE APP. Deliberately broad and deliberately over-inclusive: a false hit here
 * costs a fraction of a cent (the manual gets sent when it did not need to be), while a miss is the one
 * outcome that matters.
 * ⚠️ Includes the SURFACES a coaching answer tends to point at, because "your protein is on the Log tab"
 * is navigation and needs the manual just as much as "where is the Log tab".
 */
const APP_TERMS = [
  // structure
  'tab', 'screen', 'page', 'button', 'icon', 'card', 'menu', 'modal', 'popup', 'sheet', 'widget',
  'settings', 'setting', 'profile', 'app', 'goodforge', 'toolkit', 'tutorial', 'walkthrough', 'tour',
  // features by name
  'log', 'logging', 'logged', 'tracker', 'track', 'diary', 'entry', 'entries',
  'recipe', 'barcode', 'scan', 'scanner', 'custom food', 'meal slot', 'favourites', 'favorites',
  // ⚠️ 'routine' is NOT bare: "getting back into a routine" is coaching, "save a routine" is the app.
  'workout library', 'library', 'save a routine', 'load a routine', 'create a routine', 'program',
  'template', 'exercise library',
  'day score', 'dayscore', 'streak', 'achievement', 'badge', 'challenge', 'report', 'summary',
  'effort vs results', 'evr', 'diagnostic', 'head to head', 'comparison',
  'vacation mode', 'macro preset', 'macros preset', 'graph', 'chart', 'donut', 'stats',
  'bible', 'verse', 'devotional', 'prayer', 'journal', 'gratitude', 'reading plan', 'plans', 'faith tab',
  'halo', 'otto', 'companion',
  // account / money / platform
  'supporter', 'subscription', 'subscribe', 'plan', 'price', 'cost', 'pay', 'paid', 'free plan',
  'upgrade', 'cancel', 'refund', 'billing', 'trial', 'account', 'sign in', 'log in', 'login',
  'sync', 'backup', 'restore', 'export', 'delete my', 'apple health', 'healthkit', 'watch',
  'notification', 'notifications', 'reminder', 'reminders', 'theme', 'accent', 'dark mode', 'font',
  // Platform and product meta. Added when the coach test was inverted (see below): once "no app evidence"
  // means COACH, anything naming the product or the device has to be caught here or it lands in Coach.
  'ipad', 'iphone', 'android', 'ios', 'version', 'offline', 'install', 'download', 'update the app',
  'email', 'privacy', 'private', 'units', 'database', 'rate the app', 'app store', 'widget',
  'this app', 'the app', 'you said', 'said earlier', 'back date', 'backdate', 'merge',
  // troubleshooting
  // ⚠️ NO BARE 'crash'. Stemmed it matches "why does my energy crash in the afternoon", which is coaching.
  'not working', 'broken', 'bug', 'app crash', 'keeps crashing', 'crashing when', 'error', 'stuck',
  'wont load', "won't load", 'didnt save', "didn't save", 'missing', 'disappeared', 'reset',
  // 🔴 "I CAN'T FIND IT" IS ITS OWN CLASS, and inverting the coach test is what exposed it: the held-out
  // set's "i cant find where to put my height" names no feature, so with no app evidence it landed in
  // Coach. Someone who cannot find something is by definition asking about the app, whatever they are
  // hunting for -- which is exactly why no list of feature names would ever have caught it.
  'cant find', "can't find", 'cannot find', 'where to put', 'where to enter', 'where to add',
  'dont see', "don't see", 'not seeing', 'looking for', 'doesnt work', "doesn't work",
  // 🔴 UI INTERACTION AND VAGUE PRODUCT COMPLAINTS. The third corpus put 5 of these into Coach:
  // "i tapped it and nothing happened", "theres no option for that", "can i edit something i already
  // saved". They name no feature, so elimination sent them to coaching. The giveaway is not WHAT they
  // name, it is that they describe operating a piece of software.
  'tap', 'tapped', 'swipe', 'click', 'pressed the', 'option', 'edit', 'undo', 'saved',
  'uninstall', 'reinstall', 'blank', 'signed out', 'sign me out', 'nothing happened',
  'free bit', 'free version', 'my stuff', 'photo', 'colour', 'color', 'sounds',
];

/**
 * COACHING TERRITORY. A message must contain at least one of these to qualify -- silence is not coaching.
 * ⚠️ NOT a whitelist of topics Otto answers; it is evidence that the message is about the BODY rather than
 * the software.
 */
const COACH_TERMS = [
  'protein', 'carb', 'carbs', 'fat', 'calorie', 'calories', 'macro', 'macros', 'fibre', 'fiber',
  'sugar', 'sodium', 'creatine', 'supplement', 'vitamin', 'caffeine', 'hydrate', 'hydration', 'water',
  'eat', 'eating', 'ate', 'meal', 'meals', 'breakfast', 'lunch', 'dinner', 'snack', 'diet', 'fasting',
  'fasted', 'deficit', 'bulk', 'cut', 'cutting', 'maintenance',
  'workout', 'training', 'train', 'lift', 'lifting', 'squat', 'bench', 'deadlift', 'press', 'curl',
  'cardio', 'run', 'running', 'walk', 'steps', 'reps', 'sets', 'volume', 'rest day', 'overtraining',
  'muscle', 'strength', 'hypertrophy', 'soreness', 'sore', 'warm up', 'stretch', 'mobility',
  'sleep', 'sleeping', 'slept', 'rem', 'deep sleep', 'nap', 'tired', 'fatigue', 'energy',
  'recovery', 'hrv', 'resting heart rate', 'heart rate', 'vo2',
  'weight', 'lose', 'losing', 'gain', 'gaining', 'plateau', 'scale', 'body fat',
  'motivation', 'motivated', 'habit', 'consistency', 'discipline', 'stress', 'burnout',
  'wake', 'waking', 'asleep', 'insomnia', 'snacking', 'results', 'progress',
  'full body', 'split', 'upper lower', 'push pull', 'routine',
  // ⚠️ FOOD AND MOVEMENT NAMES ARE UNBOUNDED -- this is not an attempt to list them, it is the common
  // handful that showed up in testing. The inversion below is what actually covers the long tail; these
  // exist so a SHORT message ("salmon vs chicken") still qualifies without meeting the length floor.
  'rice', 'egg', 'oatmeal', 'oats', 'quinoa', 'chicken', 'salmon', 'beef', 'fish', 'peanut butter',
  'chocolate', 'sweets', 'craving', 'gym', 'abs', 'core', 'superset', 'chin up', 'pull up', 'push up',
  'lunge', 'plateaued', 'zone 2', 'leaner', 'lighter', 'spotter',
];

/**
 * SHAPES THAT MEAN "TELL ME ABOUT THE SOFTWARE". A bare "how" or "where" is NOT enough -- that was the
 * mistake in the faith-handoff detector's second draft, where matching a bare "how" anywhere swallowed
 * "how do you even pray". These need an app TERM alongside them, which the caller enforces.
 */
const APP_SHAPES = [
  'where is', 'where are', 'where do i', 'where can i', 'how do i', 'how can i', 'how to',
  'can i change', 'can i turn', 'can i see', 'is there a way', 'does the app', 'does it have',
  'show me where', 'take me to', 'open the', 'what does the', 'turn on', 'turn off', 'set up',
];

/**
 * 🔴 THE CATEGORY THAT BROKE THE FIRST DRAFT (15 of 20 dangerous misses). A question about the user's OWN
 * LOGGED DATA reads exactly like coaching -- "hows my protein been this week" contains no app noun at all --
 * but Otto answers it by citing a number and then pointing at the screen it lives on, and that pointing
 * needs the manual. On the free plan he cannot even see the data, so the answer is ENTIRELY navigation.
 * ⚠️ Do not "simplify" this away. Without it the classifier confidently hands the manual-less Otto every
 * question about the user's own numbers, which is the one outcome that makes him invent app details.
 */
const DATA_SIGNALS = [
  // ⚠️ "AM I <verb>" IS LISTED VERB BY VERB, NOT AS BARE 'am i'. The held-out set caught "am i eating
  // enough" going to Coach, so bare 'am i' was tried -- and it immediately swallowed "why am i so sore
  // two days later" and "why am i always tired", which are pure coaching. The verb is what separates
  // "assess my record" from "explain my body".
  'am i eating', 'am i hitting', 'am i getting enough', 'am i on pace', 'am i doing', 'am i logging',
  'am i under', 'am i over', 'am i close', 'did i', 'have i', 'was i', 'how many did i',
  "how's my", 'hows my', "what's my", 'whats my', 'what was my', 'what did i', 'how did i',
  // ⚠️ NO BARE "my <metric>". Draft 2 had 'my sleep' here and it swallowed "does caffeine hurt my sleep",
  // which is pure coaching. People say "my" about their body constantly; it is only evidence of a DATA
  // question when paired with a lookup phrase or a time window, which the rest of this list covers.
  'my average', 'my current', 'my streak', 'my pr', 'my prs', 'my numbers', 'my data', 'my log',
  'my totals',
  'yesterday', 'today', 'this week', 'last week', 'this month', 'last month', 'last night',
  'so far', 'trending', 'on pace',
];

/**
 * 🔴 ENTITLEMENT QUESTIONS -- THE CLASS THAT GOT THROUGH LIVE ON 2026-08-05, and the most instructive
 * failure so far. A free user asked **"how many messages do I get a day"** and it routed to Coach: the word
 * "messages" was in no list, the sentence carries no coaching word either, so `coach-by-elimination` fired
 * and handed it to an Otto with no app manual. He answered **"that's not something GoodForge tracks or
 * limits"**. The true answer is 5.
 * ⚠️ THE SHAPE IS THE TELL, NOT THE NOUN. "How many X do I get" is asking what the PLAN allows, whatever X
 * is, and no list of feature names reaches it -- which is exactly why three corpora missed the whole class.
 * ⚠️ It costs money when it fires on a coaching question ("how many calories do I get"). That is the safe
 * direction and it is a fraction of a cent.
 */
/**
 * ⚠️ TWO LISTS, AND THE SPLIT IS LOAD-BEARING. The strict ones describe operating a piece of software and
 * settle it outright. The soft ones are only a SHAPE, so they are ignored when the message also names
 * something about the body -- otherwise "how much protein do i get from chicken" reads as an allowance
 * question, which it plainly is not.
 * ⚠️ Guarding the strict ones the same way broke them: "how many WORKOUTS can i save" and "do i RUN out of
 * anything" both contain coaching words ('workout', 'run') and were handed straight back to Coach.
 */
const ENTITLEMENT_PATTERNS_STRICT: RegExp[] = [
  /\bhow many\b.{0,40}\bcan i (save|create|make|add|store|keep)\b/,
  /\bdo i get (a|per|each|every) (day|month|week)\b/,
  /\b(run|ran) out of\b/,
  /\bleft (today|this month)\b/,
  /\bis there a (cap|limit)\b/,
  /\bam i (limited|capped)\b/,
];
const ENTITLEMENT_PATTERNS_SOFT: RegExp[] = [
  /\bhow many\b.{0,40}\bdo i (get|have|receive)\b/,
  /\bhow much\b.{0,40}\bdo i (get|receive)\b/,
];

/** Nouns that only ever mean "the plan's allowance". */
const ENTITLEMENT_TERMS = [
  'message', 'allowance', 'quota', 'unlimited', 'free plan', 'daily limit',
  'a limit', 'my limit', 'the limit', 'any limit', 'a cap', 'the cap',
];

/** Settings language. "Change my sleep goal" is a settings screen, not a coaching question. */
// ⚠️ NO BARE 'goal' OR 'target'. The third corpus caught "whats a realistic goal for a year" being
// classed as settings -- that is a coaching question. The settings meaning always comes with a verb.
const SETTINGS_SIGNALS = ['change my', 'set my', 'update my', 'edit my', 'my goal', 'my target', 'delete', 'add a'];

/**
 * Matches whole words with the endings people actually type, so `sync` catches `syncing` and `snack`
 * catches `snacking`. Multi-word terms match literally.
 * ⚠️ This is why `crash` is NOT a bare term below -- stemmed, it would swallow "why does my energy crash".
 */
function hasAny(text: string, terms: string[]): boolean {
  return terms.some((t) =>
    t.includes(' ') ? text.includes(t) : new RegExp(`\\b${t}(s|es|ing|ed)?\\b`).test(text));
}

export interface CoachRouteResult {
  /** true ONLY when this is confidently answerable with no app knowledge at all. */
  coachOnly: boolean;
  /** Why, for the log. Never shown to a user. */
  reason: 'app-term' | 'app-shape' | 'entitlement' | 'own-data' | 'settings' | 'no-coach-signal' | 'too-short' | 'coach' | 'coach-by-elimination';
}

/**
 * ⚠️ READ THE DEFAULT. `coachOnly: false` means "send the manual", which is today's behaviour. Anything
 * this function is unsure about MUST end up there.
 */
export function routeCoachOrSupport(message: string): CoachRouteResult {
  const t = normalise(message);

  // Naming any part of the app settles it immediately, however the rest of the message reads.
  if (hasAny(t, APP_TERMS)) return { coachOnly: false, reason: 'app-term' };

  // ⚠️ RUNS EARLY, BEFORE THE COACH TEST. "How many messages do I get a day" contains no app noun and no
  // coaching word; only its SHAPE gives it away. See ENTITLEMENT_PATTERNS for the live failure this fixes.
  // ⚠️ AN ENTITLEMENT NOUN SETTLES IT OUTRIGHT. A bare SHAPE ("how much X do I get") only settles it when
  // nothing about the body is present -- otherwise "how much protein do i get from chicken" reads as a
  // question about an allowance, which it plainly is not.
  if (hasAny(t, ENTITLEMENT_TERMS)) return { coachOnly: false, reason: 'entitlement' };
  if (ENTITLEMENT_PATTERNS_STRICT.some((re) => re.test(t))) return { coachOnly: false, reason: 'entitlement' };
  if (ENTITLEMENT_PATTERNS_SOFT.some((re) => re.test(t)) && !hasAny(t, COACH_TERMS)) {
    return { coachOnly: false, reason: 'entitlement' };
  }

  // ⚠️ THE COACH-TERM TEST RUNS BEFORE THE LENGTH FLOOR, not after. "ive plateaued" and "salmon vs
  // chicken" are two words and unmistakably coaching; the floor exists for messages carrying NO evidence,
  // not for short ones carrying plenty.
  // ⚠️ BOTH GUARDS ARE REQUIRED. Moving this test above the length floor also moved it above the data and
  // settings tests, and "can i change my calorie goal" immediately slipped through on the word 'calorie'.
  if (hasAny(t, COACH_TERMS) && !hasAny(t, DATA_SIGNALS) && !hasAny(t, SETTINGS_SIGNALS)) {
    return { coachOnly: true, reason: 'coach' };
  }

  // A very short message carries no evidence either way ("thanks", "ok", "what about now").
  // Cheap to send the manual; expensive to guess.
  if (t.split(' ').length < 3) return { coachOnly: false, reason: 'too-short' };

  // Their own logged numbers. Answered by citing data and pointing at a screen -- both need the manual.
  if (hasAny(t, DATA_SIGNALS)) return { coachOnly: false, reason: 'own-data' };

  // Changing a goal or target is a settings screen, however conversationally it is phrased.
  if (hasAny(t, SETTINGS_SIGNALS)) return { coachOnly: false, reason: 'settings' };

  // A how-to/where-is shape with no app term is usually still coaching ("how do i get more protein"),
  // but "how to" plus nothing recognisable is exactly the ambiguous case the manual is cheap insurance for.
  if (hasAny(t, APP_SHAPES) && !hasAny(t, COACH_TERMS)) return { coachOnly: false, reason: 'app-shape' };

  // ✅ A RECOGNISED COACHING WORD IS ENOUGH ON ITS OWN.
  if (hasAny(t, COACH_TERMS)) return { coachOnly: true, reason: 'coach' };

  // 🔴 THE INVERSION, AND WHY IT IS SAFE. Requiring a coaching keyword capped recall at 81% on unseen
  // phrasing, and the misses were all the same shape: "is white rice bad", "should i take a deload week",
  // "i want to get stronger without getting bigger". Food names, exercise names and plain English are
  // unbounded -- no whitelist reaches them, so a bigger list was never going to fix it.
  // So: past every app, data and settings test above, with no app evidence of any kind, a message of real
  // length is coaching. The safety does NOT come from recognising the coaching; it comes from the app tests
  // above being comprehensive, which is why the platform/meta terms were added to APP_TERMS alongside this.
  // ⚠️ THE LENGTH FLOOR IS LOAD-BEARING. A short vague message ("one more thing", "wait what") carries no
  // evidence, and the next thing they type could be about anything. Those stay on Support.
  if (t.split(' ').length >= 5) return { coachOnly: true, reason: 'coach-by-elimination' };

  return { coachOnly: false, reason: 'no-coach-signal' };
}
