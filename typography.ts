// ─── Project J Type System ────────────────────────────────────────────────────
// FOUR ROLES. They are INDEPENDENT -- a serif title over condensed numbers is the point, not an
// accident. No family has to do two jobs. Full reasoning: SPEC_visual_refresh.md
//
//   DISPLAY   page titles ("Good morning", "Effort vs Results")
//   NUM       every value. TABULAR figures, so animated counters stop shifting width mid-count
//   UI        labels, buttons, everything structural. A good one is invisible. That IS the job
//   VOICE     coach insight, verses, Otto. Where the personality lives
//
// What this replaces: Bebas was doing every job at every size (a 52pt calorie number AND a 15pt water
// button AND the page title), which is how a display face stops being an accent and becomes wallpaper.
// DM Sans carried everything else. Lora was loaded and only ever appeared on scripture.
//
// NEVER hardcode a fontFamily string in a screen again. Import Type and use the role.

// ─── The open A/Bs ────────────────────────────────────────────────────────────
// Flip ONE LINE to swap a face app-wide. Every candidate is already loaded in app/_layout.tsx, so a
// swap is instant -- no install, no rebuild. All three need to be judged on a real screen at real
// brightness, not in a browser. See SPEC_visual_refresh.md "OPEN".
const DISPLAY_FACE: 'clash' | 'oswald' | 'fraunces' = 'clash';
const NUM_FACE: 'rajdhani' | 'khand' = 'rajdhani';
const VOICE_FACE: 'bitter' | 'ranade' = 'ranade';
// ──────────────────────────────────────────────────────────────────────────────

// Oswald is a CONDENSED CAPS face like Bebas, so it wants uppercase + positive tracking. Clash and
// Fraunces are mixed-case and already tight, so they want neither. DISPLAY_CASE / DISPLAY_TRACKING
// carry that difference, so a title style never has to know which face is active.
const DISPLAY_FACES = {
  clash:    { regular: 'ClashDisplay-Semibold', bold: 'ClashDisplay-Bold',   caps: false, track: -0.3, scale: 1 },
  oswald:   { regular: 'Oswald_600SemiBold',    bold: 'Oswald_700Bold',      caps: true,  track: 1.2,  scale: 1.05 },
  fraunces: { regular: 'Fraunces_600SemiBold',  bold: 'Fraunces_700Bold',    caps: false, track: -0.2, scale: 1 },
} as const;

// WEIGHT is the thing that bit us first. Bebas ships ONE cut and it reads optically MEDIUM, so pointing
// the number role at a 700 Bold made every value in the app shout at once -- which reads as "the font is
// too heavy" when really the font was fine and the weight was wrong. The default number weight is the
// MEDIUM cut. `num` is the everyday value; `numHero` is reserved for a card's one big number, and even
// that only goes to SemiBold, not Bold.
const NUM_FACES = {
  rajdhani: { soft: 'Rajdhani_500Medium', regular: 'Rajdhani_700Bold',   hero: 'Rajdhani_700Bold',     scale: 1.06 },
  khand:    { soft: 'Khand_500Medium',    regular: 'Khand_600SemiBold',  hero: 'Khand_600SemiBold',    scale: 1.04 },
} as const;

// Same story for the voice. Ranade is a chunky face even at Regular, and the coach copy sits INSIDE a
// card next to quiet interface labels -- it should feel like someone talking, not like a headline. So the
// body weight is LIGHT and the emphasis weight is Regular. Nothing here goes near bold.
const VOICE_FACES = {
  bitter: { regular: 'Bitter_400Regular', semibold: 'Bitter_600SemiBold', bold: 'Bitter_700Bold' },
  ranade: { regular: 'Ranade-Light',      semibold: 'Ranade-Regular',     bold: 'Ranade-Medium' },
} as const;

export const Type = {
  display:     DISPLAY_FACES[DISPLAY_FACE].regular,
  displayBold: DISPLAY_FACES[DISPLAY_FACE].bold,

  // NUM -- condensed, tabular. MEDIUM by default (see the note on NUM_FACES).
  num:     NUM_FACES[NUM_FACE].regular,
  numSoft: NUM_FACES[NUM_FACE].soft,      // a value that should not shout (secondary stats)
  numHero: NUM_FACES[NUM_FACE].hero,      // a card's ONE big number, if it needs the extra weight

  // UI -- Onest. Quiet humanist sans.
  ui:         'Onest_400Regular',
  uiMedium:   'Onest_500Medium',
  uiSemibold: 'Onest_600SemiBold',
  uiBold:     'Onest_700Bold',

  // VOICE -- a slab. Display and UI are both sans; a sans voice reads as "a slightly different sans",
  // which is worse than not bothering. A slab gives the coach an actual register, and slabs read
  // athletic, not newspaper.
  voice:         VOICE_FACES[VOICE_FACE].regular,
  voiceSemibold: VOICE_FACES[VOICE_FACE].semibold,
  voiceBold:     VOICE_FACES[VOICE_FACE].bold,
} as const;

// ─── Display metrics ──────────────────────────────────────────────────────────
// A title style pulls these instead of hardcoding, so flipping DISPLAY_FACE also flips the casing and
// tracking that face needs. Oswald is caps-and-tracked like Bebas was; Clash and Fraunces are not.
export const DISPLAY_CAPS = DISPLAY_FACES[DISPLAY_FACE].caps;
export const DISPLAY_TRACKING = DISPLAY_FACES[DISPLAY_FACE].track;
export const DISPLAY_SCALE = DISPLAY_FACES[DISPLAY_FACE].scale;
export const displaySize = (base: number) => Math.round(base * DISPLAY_SCALE);

// ─── Metric compensation ──────────────────────────────────────────────────────
// Bebas is EXTREMELY condensed and all-caps, so it renders small for its point size. Dropping a
// different face into the same fontSize would silently shrink every number in the app. NUM_SCALE puts
// the new face back at the same optical size. Multiply a legacy Bebas fontSize by this, don't re-pick
// sizes by hand.
export const NUM_SCALE = NUM_FACES[NUM_FACE].scale;
export const numSize = (bebasSize: number) => Math.round(bebasSize * NUM_SCALE);

// LINE HEIGHT is the one that actually bites. Bebas is all-caps with no ascenders and no descenders, so
// it sits happily in a box barely taller than the type size (the calorie number was 52/56). Rajdhani and
// Khand have real ascenders and taller digits, so that same box CROPS THE TOP OFF EVERY NUMBER. Any
// number style that sets an explicit lineHeight must run it through numLine(), never keep the old value.
export const NUM_LEADING = 1.28;
export const numLine = (fontSize: number) => Math.round(fontSize * NUM_LEADING);

// Letter-spacing: Bebas needed tracking to breathe. Rajdhani and Khand do not -- they are already
// tight. Anywhere a legacy style had letterSpacing on a Bebas number, use this instead of deleting it,
// so the change is one obvious token rather than a hundred silent deletions.
export const NUM_TRACKING = 0;
