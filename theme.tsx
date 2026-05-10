// ─── Project J Theme System ───────────────────────────────────────────────────
// One file. All colors live here. No hardcoded hex anywhere else.
// Swapping themes = one state change.
//
// Free:  dark, light
// Paid:  slate, warm, blush

export type ThemeId = 'dark' | 'light' | 'slate' | 'warm' | 'blush';
export type AccentId = 'default' | 'purple' | 'teal' | 'rose' | 'indigo' | 'green' | 'orange' | 'cyan' | 'rust' | 'sage' | 'mauve' | 'lilac' | 'silver';

export interface AccentOption {
  id: AccentId;
  label: string;
  color: string;        // the raw hex, used for the picker circle
  accentBlue: string;
  accentBlueBg: string;
  accentBlueBorder: string;
  gradientStart?: string; // only needed for themes with gradient-linked accent
  buttonColor?: string;   // override for light accents where accentBlue is too light to read on buttons
  buttonBg?: string;
  buttonBorder?: string;
}

export const ACCENT_PALETTES: Record<ThemeId, AccentOption[]> = {
  dark: [
    { id: 'default', label: 'Blue',    color: '#3b82f6', accentBlue: '#3b82f6', accentBlueBg: 'rgba(59,130,246,0.15)',   accentBlueBorder: 'rgba(59,130,246,0.30)',   gradientStart: '#0d1a2e' },
    { id: 'purple',  label: 'Purple',  color: '#9333ea', accentBlue: '#9333ea', accentBlueBg: 'rgba(147,51,234,0.15)',  accentBlueBorder: 'rgba(147,51,234,0.30)',  gradientStart: '#1a0d2e' },
    { id: 'teal',    label: 'Teal',    color: '#14b8a6', accentBlue: '#14b8a6', accentBlueBg: 'rgba(20,184,166,0.15)',  accentBlueBorder: 'rgba(20,184,166,0.30)',  gradientStart: '#0d2e2a' },
    { id: 'rose',    label: 'Rose',    color: '#f43f5e', accentBlue: '#f43f5e', accentBlueBg: 'rgba(244,63,94,0.15)',   accentBlueBorder: 'rgba(244,63,94,0.30)',   gradientStart: '#2e0d15' },
    { id: 'indigo',  label: 'Indigo',  color: '#6366f1', accentBlue: '#6366f1', accentBlueBg: 'rgba(99,102,241,0.15)',  accentBlueBorder: 'rgba(99,102,241,0.30)',  gradientStart: '#0f0d2e' },
    { id: 'orange',  label: 'Gold',    color: '#f59e0b', accentBlue: '#f59e0b', accentBlueBg: 'rgba(245,158,11,0.15)',  accentBlueBorder: 'rgba(245,158,11,0.30)',  gradientStart: '#2e1e0a' },
    { id: 'cyan',    label: 'Coral',   color: '#ff6b6b', accentBlue: '#ff6b6b', accentBlueBg: 'rgba(255,107,107,0.15)', accentBlueBorder: 'rgba(255,107,107,0.30)', gradientStart: '#2e1010' },
    { id: 'mauve',   label: 'Hot Pink',color: '#ec4899', accentBlue: '#ec4899', accentBlueBg: 'rgba(236,72,153,0.15)',  accentBlueBorder: 'rgba(236,72,153,0.30)',  gradientStart: '#2e0d20' },
    { id: 'sage',    label: 'Silver',  color: '#94a3b8', accentBlue: '#94a3b8', accentBlueBg: 'rgba(148,163,184,0.15)', accentBlueBorder: 'rgba(148,163,184,0.30)', gradientStart: '#141820' },
    { id: 'lilac',   label: 'Neon G',  color: '#22c55e', accentBlue: '#22c55e', accentBlueBg: 'rgba(34,197,94,0.15)',   accentBlueBorder: 'rgba(34,197,94,0.30)',   gradientStart: '#0d2e18' },
  ],
  light: [
    { id: 'default', label: 'Silver',  color: '#8888aa', accentBlue: '#8888aa', accentBlueBg: 'rgba(136,136,170,0.12)', accentBlueBorder: 'rgba(136,136,170,0.28)', gradientStart: '#d4d4e8' },
    { id: 'green',   label: 'Blue',    color: '#1a44c2', accentBlue: '#1a44c2', accentBlueBg: 'rgba(26,68,194,0.12)',   accentBlueBorder: 'rgba(26,68,194,0.28)',   gradientStart: '#b8c4e0' },
    { id: 'teal',    label: 'Green',   color: '#059669', accentBlue: '#059669', accentBlueBg: 'rgba(5,150,105,0.10)',   accentBlueBorder: 'rgba(5,150,105,0.25)',   gradientStart: '#c8e8d8' },
    { id: 'rose',    label: 'Teal',    color: '#0d9488', accentBlue: '#0d9488', accentBlueBg: 'rgba(13,148,136,0.10)', accentBlueBorder: 'rgba(13,148,136,0.25)',  gradientStart: '#c8e4e0' },
    { id: 'indigo',  label: 'Rose',    color: '#e11d48', accentBlue: '#e11d48', accentBlueBg: 'rgba(225,29,72,0.10)',   accentBlueBorder: 'rgba(225,29,72,0.25)',   gradientStart: '#e8c8d0' },
    { id: 'purple',  label: 'Purple',  color: '#7c3aed', accentBlue: '#7c3aed', accentBlueBg: 'rgba(124,58,237,0.10)', accentBlueBorder: 'rgba(124,58,237,0.25)',  gradientStart: '#d8cce8' },
    { id: 'orange',  label: 'Gold',    color: '#d97706', accentBlue: '#d97706', accentBlueBg: 'rgba(217,119,6,0.12)',   accentBlueBorder: 'rgba(217,119,6,0.28)',   gradientStart: '#e8dcc0' },
    { id: 'cyan',    label: 'Coral',   color: '#f05050', accentBlue: '#f05050', accentBlueBg: 'rgba(240,80,80,0.10)',   accentBlueBorder: 'rgba(240,80,80,0.25)',   gradientStart: '#e8c8c8' },
    { id: 'mauve',   label: 'Hot Pink',color: '#db2777', accentBlue: '#db2777', accentBlueBg: 'rgba(219,39,119,0.10)', accentBlueBorder: 'rgba(219,39,119,0.25)',  gradientStart: '#e8c0d4' },
    { id: 'rust',    label: 'Black',   color: '#1a1a2e', accentBlue: '#1a1a2e', accentBlueBg: 'rgba(26,26,46,0.10)',   accentBlueBorder: 'rgba(26,26,46,0.25)',    gradientStart: '#c8c8d0' },
  ],
  slate: [
    { id: 'default', label: 'Steel',   color: '#4a7fa5', accentBlue: '#4a7fa5', accentBlueBg: 'rgba(74,127,165,0.12)',  accentBlueBorder: 'rgba(74,127,165,0.28)',  gradientStart: '#98a4b4' },
    { id: 'teal',    label: 'Teal',    color: '#2a9d8a', accentBlue: '#2a9d8a', accentBlueBg: 'rgba(42,157,138,0.12)',  accentBlueBorder: 'rgba(42,157,138,0.28)',  gradientStart: '#b0c4be' },
    { id: 'indigo',  label: 'Indigo',  color: '#6060c0', accentBlue: '#6060c0', accentBlueBg: 'rgba(96,96,192,0.12)',   accentBlueBorder: 'rgba(96,96,192,0.28)',   gradientStart: '#b8b8cc' },
    { id: 'sage',    label: 'Sage',    color: '#5a9070', accentBlue: '#5a9070', accentBlueBg: 'rgba(90,144,112,0.12)',  accentBlueBorder: 'rgba(90,144,112,0.28)',  gradientStart: '#b4c0b8' },
    { id: 'orange',  label: 'Gold',    color: '#c49020', accentBlue: '#c49020', accentBlueBg: 'rgba(196,144,32,0.12)',  accentBlueBorder: 'rgba(196,144,32,0.28)',  gradientStart: '#c0b89a' },
    { id: 'cyan',    label: 'Coral',   color: '#d05858', accentBlue: '#d05858', accentBlueBg: 'rgba(208,88,88,0.12)',   accentBlueBorder: 'rgba(208,88,88,0.28)',   gradientStart: '#c4aaaa' },
    { id: 'mauve',   label: 'Hot Pink',color: '#c0408a', accentBlue: '#c0408a', accentBlueBg: 'rgba(192,64,138,0.12)', accentBlueBorder: 'rgba(192,64,138,0.28)',  gradientStart: '#c4a8b8' },
    { id: 'rust',    label: 'Black',   color: '#2a3040', accentBlue: '#2a3040', accentBlueBg: 'rgba(42,48,64,0.12)',    accentBlueBorder: 'rgba(42,48,64,0.28)',    gradientStart: '#a0a8b0' },
    { id: 'lilac',   label: 'White',   color: '#e8eaf0', accentBlue: '#8090a8', accentBlueBg: 'rgba(128,144,168,0.12)',accentBlueBorder: 'rgba(128,144,168,0.28)', gradientStart: '#b8bec8' },
  ],
  warm: [
    { id: 'default', label: 'Amber',   color: '#f0a040', accentBlue: '#f0a040', accentBlueBg: 'rgba(240,160,64,0.15)',  accentBlueBorder: 'rgba(240,160,64,0.30)'  },
    { id: 'rust',    label: 'Rust',    color: '#e05c30', accentBlue: '#e05c30', accentBlueBg: 'rgba(224,92,48,0.15)',   accentBlueBorder: 'rgba(224,92,48,0.30)'   },
    { id: 'sage',    label: 'Sage',    color: '#7dc98a', accentBlue: '#7dc98a', accentBlueBg: 'rgba(125,201,138,0.15)', accentBlueBorder: 'rgba(125,201,138,0.30)' },
    { id: 'teal',    label: 'Teal',    color: '#5ba89a', accentBlue: '#5ba89a', accentBlueBg: 'rgba(91,168,154,0.15)',  accentBlueBorder: 'rgba(91,168,154,0.30)'  },
    { id: 'indigo',  label: 'Burgundy',color: '#9b2335', accentBlue: '#9b2335', accentBlueBg: 'rgba(155,35,53,0.15)',   accentBlueBorder: 'rgba(155,35,53,0.30)'   },
    { id: 'orange',  label: 'Sienna',  color: '#c2622a', accentBlue: '#c2622a', accentBlueBg: 'rgba(194,98,42,0.15)',   accentBlueBorder: 'rgba(194,98,42,0.30)'   },
    { id: 'cyan',    label: 'Forest',  color: '#4a7c59', accentBlue: '#4a7c59', accentBlueBg: 'rgba(74,124,89,0.15)',   accentBlueBorder: 'rgba(74,124,89,0.30)'   },
    { id: 'mauve',   label: 'Cream',   color: '#d4b896', accentBlue: '#d4b896', accentBlueBg: 'rgba(212,184,150,0.15)', accentBlueBorder: 'rgba(212,184,150,0.30)' },
  ],
  blush: [
    { id: 'default', label: 'Rose',    color: '#d4607a', accentBlue: '#d4607a', accentBlueBg: 'rgba(212,96,122,0.12)',  accentBlueBorder: 'rgba(212,96,122,0.28)'  },
    { id: 'mauve',   label: 'Mauve',   color: '#b06090', accentBlue: '#b06090', accentBlueBg: 'rgba(176,96,144,0.12)',  accentBlueBorder: 'rgba(176,96,144,0.28)'  },
    { id: 'lilac',   label: 'Lilac',   color: '#9070c0', accentBlue: '#9070c0', accentBlueBg: 'rgba(144,112,192,0.12)', accentBlueBorder: 'rgba(144,112,192,0.28)' },
    { id: 'teal',    label: 'Teal',    color: '#3a9e8a', accentBlue: '#3a9e8a', accentBlueBg: 'rgba(58,158,138,0.12)',  accentBlueBorder: 'rgba(58,158,138,0.28)'  },
    { id: 'orange',  label: 'Yellow',  color: '#ffe600', accentBlue: '#ffe600', accentBlueBg: 'rgba(255,230,0,0.15)', accentBlueBorder: 'rgba(255,230,0,0.35)', buttonColor: '#8a6f00', buttonBg: 'rgba(138,111,0,0.15)', buttonBorder: 'rgba(138,111,0,0.35)' },
    { id: 'rust',    label: 'Lipstick',color: '#cc1144', accentBlue: '#cc1144', accentBlueBg: 'rgba(204,17,68,0.12)',   accentBlueBorder: 'rgba(204,17,68,0.28)'   },
    { id: 'cyan',    label: 'Blue',    color: '#4878c8', accentBlue: '#4878c8', accentBlueBg: 'rgba(72,120,200,0.12)',  accentBlueBorder: 'rgba(72,120,200,0.28)'  },
    { id: 'sage',    label: 'Silver',  color: '#8898a8', accentBlue: '#8898a8', accentBlueBg: 'rgba(136,152,168,0.12)', accentBlueBorder: 'rgba(136,152,168,0.28)' },
  ],
};

export interface Theme {
  id: ThemeId;
  name: string;
  paid: boolean;

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  bgPrimary: string;        // main screen background
  bgCard: string;           // standard card background
  bgCardVerse: string;      // verse card background (special)
  bgInput: string;          // text input background
  bgProgressTrack: string;  // progress bar track (empty portion)
  bgSheet: string;          // bottom sheet / modal background
  bgInset: string;          // inset surfaces inside cards (e.g. fitness metric tiles)
  bgEditCard: string;       // edit layout card preview background

  // ── Borders ─────────────────────────────────────────────────────────────────
  borderCard: string;           // standard card border
  borderCardTop: string;        // card top border (slightly brighter for depth)
  borderCardVerse: string;      // verse card border
  borderInput: string;          // input field border
  borderSubtle: string;         // very subtle dividers
  borderSheet: string;          // bottom sheet top border
  borderInset: string;          // inset tile border

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary: string;      // main readable text, large numbers
  textSecondary: string;    // secondary text, timestamps, sublabels
  textMuted: string;        // card labels, uppercase trackers (#8888aa min)
  textDim: string;          // barely-there labels, hints
  textPlaceholder: string;  // input placeholders
  textWhite: string;        // pure white for things that need to pop

  // ── Accent / Interactive ────────────────────────────────────────────────────
  accentBlue:               string;               // primary interactive color (button-safe, may differ from raw for light accents)
  accentBlueRaw:            string;               // raw accent color, always the true accent - use for home button, gradients
  accentBlueBg:             string;             // button background (low opacity blue)
  accentBlueBorder:         string;         // button border
  accentGreen: string;              // success / goal hit
  accentGreenBg: string;
  accentGreenBorder: string;
  accentAmber: string;              // warning / close to goal
  accentRed: string;                // over goal / failed
  accentRedBg: string;
  accentRedBorder: string;

  // ── Status / Calorie scoring ────────────────────────────────────────────────
  statusGood: string;       // on track
  statusWarn: string;       // close / marginal
  statusBad: string;        // over or under

  // ── Macro colors ────────────────────────────────────────────────────────────
  macroProtein: string;
  macroCarbs: string;
  macroFat: string;
  macroOver: string;        // any macro when exceeded

  // ── Sleep stage colors ───────────────────────────────────────────────────────
  sleepCore: string;
  sleepDeep: string;
  sleepRem: string;
  sleepTrack: string;       // donut background ring

  // ── Workout day colors ───────────────────────────────────────────────────────
  workoutPush: string;
  workoutPull: string;
  workoutLegs: string;
  workoutCardio: string;

  // ── IF card ──────────────────────────────────────────────────────────────────
  ifMethodBg: string;           // unselected method pill bg
  ifMethodBorder: string;       // unselected method pill border
  ifMethodText: string;         // unselected method pill text

  // ── Misc ─────────────────────────────────────────────────────────────────────
  donutTrack: string;           // macro donut empty ring
  iconMuted: string;            // muted icon color (no-data states)
  sheetHandle: string;          // bottom sheet drag handle
  overlayBg: string;            // modal overlay

  // ── Gradient ─────────────────────────────────────────────────────────────────
  gradientStart: string;        // top of screen gradient
  gradientEnd: string;          // bottom of screen gradient (usually bgPrimary)
}

// ─── Dark Theme (current / default) ──────────────────────────────────────────
const dark: Theme = {
  id: 'dark',
  name: 'Dark',
  paid: false,

  bgPrimary:        '#0d0d0f',
  bgCard:           '#1a1a24',
  bgCardVerse:      '#16162a',
  bgInput:          '#13131e',
  bgProgressTrack:  '#1e1e2e',
  bgSheet:          '#13131e',
  bgInset:          '#1e1e2e',
  bgEditCard:       '#1a1a24',

  borderCard:       'rgba(255,255,255,0.06)',
  borderCardTop:    'rgba(255,255,255,0.10)',
  borderCardVerse:  'rgba(212,134,10,0.40)',
  borderInput:      'rgba(255,255,255,0.08)',
  borderSubtle:     'rgba(255,255,255,0.05)',
  borderSheet:      'rgba(255,255,255,0.10)',
  borderInset:      'rgba(255,255,255,0.06)',

  textPrimary:      '#e8e8f0',
  textSecondary:    '#a0a0b8',
  textMuted:        '#8888aa',
  textDim:          '#666680',
  textPlaceholder:  '#444455',
  textWhite:        '#ffffff',

  accentBlue:       '#3b82f6',
  accentBlueRaw:    '#3b82f6',
  accentBlueBg:     'rgba(59,130,246,0.15)',
  accentBlueBorder: 'rgba(59,130,246,0.30)',
  accentGreen:      '#10b981',
  accentGreenBg:    'rgba(16,185,129,0.15)',
  accentGreenBorder:'rgba(16,185,129,0.30)',
  accentAmber:      '#d4860a',
  accentRed:        '#ef4444',
  accentRedBg:      'rgba(239,68,68,0.15)',
  accentRedBorder:  'rgba(239,68,68,0.30)',

  statusGood:       '#10b981',
  statusWarn:       '#f59e0b',
  statusBad:        '#ef4444',

  macroProtein:     '#0d9268',
  macroCarbs:       '#c47d1a',
  macroFat:         '#a83232',
  macroOver:        '#a83232',

  sleepCore:        '#60a5fa',
  sleepDeep:        '#818cf8',
  sleepRem:         '#34d399',
  sleepTrack:       '#12121a',

  workoutPush:      '#3b82f6',
  workoutPull:      '#10b981',
  workoutLegs:      '#f59e0b',
  workoutCardio:    '#888888',

  ifMethodBg:       '#13131e',
  ifMethodBorder:   'rgba(255,255,255,0.10)',
  ifMethodText:     '#7070a0',

  donutTrack:       '#2a2a2a',
  iconMuted:        '#2a2a3a',
  sheetHandle:      'rgba(255,255,255,0.15)',
  overlayBg:        'rgba(0,0,0,0.60)',

  gradientStart:    '#0d1a2e',
  gradientEnd:      '#0d0d0f',
};

// ─── Light Theme ─────────────────────────────────────────────────────────────
const light: Theme = {
  id: 'light',
  name: 'Light',
  paid: false,

  bgPrimary:        '#f0f0f5',
  bgCard:           'rgba(255,255,255,0.55)',
  bgCardVerse:      'rgba(255,251,240,0.55)',
  bgInput:          '#f5f5fa',
  bgProgressTrack:  '#e4e4ee',
  bgSheet:          '#ffffff',
  bgInset:          '#f5f5fa',
  bgEditCard:       '#ffffff',

  borderCard:       'rgba(0,0,0,0.06)',
  borderCardTop:    'rgba(0,0,0,0.10)',
  borderCardVerse:  'rgba(212,134,10,0.35)',
  borderInput:      'rgba(0,0,0,0.10)',
  borderSubtle:     'rgba(0,0,0,0.05)',
  borderSheet:      'rgba(0,0,0,0.08)',
  borderInset:      'rgba(0,0,0,0.06)',

  textPrimary:      '#1a1a2e',
  textSecondary:    '#4a4a6a',
  textMuted:        '#6666aa',
  textDim:          '#9999bb',
  textPlaceholder:  '#aaaacc',
  textWhite:        '#1a1a2e',

  accentBlue:       '#2563eb',
  accentBlueRaw:    '#2563eb',
  accentBlueBg:     'rgba(37,99,235,0.10)',
  accentBlueBorder: 'rgba(37,99,235,0.25)',
  accentGreen:      '#059669',
  accentGreenBg:    'rgba(5,150,105,0.10)',
  accentGreenBorder:'rgba(5,150,105,0.25)',
  accentAmber:      '#b45309',
  accentRed:        '#dc2626',
  accentRedBg:      'rgba(220,38,38,0.10)',
  accentRedBorder:  'rgba(220,38,38,0.25)',

  statusGood:       '#059669',
  statusWarn:       '#d97706',
  statusBad:        '#dc2626',

  macroProtein:     '#0d9268',
  macroCarbs:       '#c47d1a',
  macroFat:         '#a83232',
  macroOver:        '#dc2626',

  sleepCore:        '#3b82f6',
  sleepDeep:        '#6366f1',
  sleepRem:         '#10b981',
  sleepTrack:       '#e0e0ee',

  workoutPush:      '#2563eb',
  workoutPull:      '#059669',
  workoutLegs:      '#d97706',
  workoutCardio:    '#888899',

  ifMethodBg:       '#f0f0f8',
  ifMethodBorder:   'rgba(0,0,0,0.10)',
  ifMethodText:     '#6666aa',

  donutTrack:       '#e0e0ee',
  iconMuted:        '#ccccdd',
  sheetHandle:      'rgba(0,0,0,0.12)',
  overlayBg:        'rgba(0,0,0,0.40)',

  gradientStart:    '#d4d4e8',
  gradientEnd:      '#f0f0f5',
};

// ─── Slate Theme (cool silver, steel blue accent) ─────────────────────────────
const slate: Theme = {
  id: 'slate',
  name: 'Slate',
  paid: true,

  bgPrimary:        '#c8cdd4',
  bgCard:           'rgba(216,221,228,0.65)',
  bgCardVerse:      'rgba(212,216,228,0.65)',
  bgInput:          '#ccd2d8',
  bgProgressTrack:  '#b8bec6',
  bgSheet:          '#dde0e6',
  bgInset:          '#ccd2d8',
  bgEditCard:       '#d8dde4',

  borderCard:       'rgba(74,127,165,0.10)',
  borderCardTop:    'rgba(74,127,165,0.18)',
  borderCardVerse:  'rgba(212,134,10,0.35)',
  borderInput:      'rgba(74,127,165,0.14)',
  borderSubtle:     'rgba(74,127,165,0.08)',
  borderSheet:      'rgba(74,127,165,0.12)',
  borderInset:      'rgba(74,127,165,0.10)',

  textPrimary:      '#1c2533',
  textSecondary:    '#3d5068',
  textMuted:        '#5a7088',
  textDim:          '#8a9aaa',
  textPlaceholder:  '#aabbcc',
  textWhite:        '#1c2533',

  accentBlue:       '#4a7fa5',
  accentBlueRaw:    '#4a7fa5',
  accentBlueBg:     'rgba(74,127,165,0.12)',
  accentBlueBorder: 'rgba(74,127,165,0.28)',
  accentGreen:      '#2a9d6e',
  accentGreenBg:    'rgba(42,157,110,0.12)',
  accentGreenBorder:'rgba(42,157,110,0.28)',
  accentAmber:      '#b87c1a',
  accentRed:        '#cc3333',
  accentRedBg:      'rgba(204,51,51,0.10)',
  accentRedBorder:  'rgba(204,51,51,0.25)',

  statusGood:       '#2a9d6e',
  statusWarn:       '#d4860a',
  statusBad:        '#cc3333',

  macroProtein:     '#2a9d6e',
  macroCarbs:       '#b87c1a',
  macroFat:         '#cc3333',
  macroOver:        '#cc3333',

  sleepCore:        '#4a7fa5',
  sleepDeep:        '#7060c0',
  sleepRem:         '#2a9d6e',
  sleepTrack:       '#d4d8de',

  workoutPush:      '#4a7fa5',
  workoutPull:      '#2a9d6e',
  workoutLegs:      '#d4860a',
  workoutCardio:    '#8a9aaa',

  ifMethodBg:       'rgba(74,127,165,0.10)',
  ifMethodBorder:   'rgba(74,127,165,0.20)',
  ifMethodText:     '#5a7088',

  donutTrack:       '#d4d8de',
  iconMuted:        '#c8cdd4',
  sheetHandle:      'rgba(74,127,165,0.20)',
  overlayBg:        'rgba(28,37,51,0.45)',

  gradientStart:    '#98a4b4',
  gradientEnd:      '#c8cdd4',
};

// ─── Warm Theme (caramel, amber accent) ───────────────────────────────────────
const warm: Theme = {
  id: 'warm',
  name: 'Warm',
  paid: true,

  bgPrimary:        '#2a1a08',
  bgCard:           'rgba(255,220,170,0.30)',
  bgCardVerse:      'rgba(255,230,180,0.35)',
  bgInput:          'rgba(200,150,90,0.20)',
  bgProgressTrack:  '#3a2510',
  bgSheet:          '#341e0a',
  bgInset:          '#3a2510',
  bgEditCard:       'rgba(255,220,170,0.25)',

  borderCard:       'rgba(212,140,60,0.18)',
  borderCardTop:    'rgba(212,140,60,0.28)',
  borderCardVerse:  'rgba(212,134,10,0.55)',
  borderInput:      'rgba(212,140,60,0.20)',
  borderSubtle:     'rgba(212,140,60,0.12)',
  borderSheet:      'rgba(212,140,60,0.20)',
  borderInset:      'rgba(212,140,60,0.15)',

  textPrimary:      '#f5e8d0',
  textSecondary:    '#c8a878',
  textMuted:        '#aa8855',
  textDim:          '#7a5c38',
  textPlaceholder:  '#6a4c28',
  textWhite:        '#fff8f0',

  accentBlue:       '#f0a040',
  accentBlueRaw:    '#f0a040',
  accentBlueBg:     'rgba(240,160,64,0.18)',
  accentBlueBorder: 'rgba(240,160,64,0.35)',
  accentGreen:      '#7dc98a',
  accentGreenBg:    'rgba(125,201,138,0.15)',
  accentGreenBorder:'rgba(125,201,138,0.30)',
  accentAmber:      '#e8940a',
  accentRed:        '#e06060',
  accentRedBg:      'rgba(224,96,96,0.15)',
  accentRedBorder:  'rgba(224,96,96,0.30)',

  statusGood:       '#7dc98a',
  statusWarn:       '#e8940a',
  statusBad:        '#e06060',

  macroProtein:     '#7dc98a',
  macroCarbs:       '#e8940a',
  macroFat:         '#c46050',
  macroOver:        '#e06060',

  sleepCore:        '#f0a040',
  sleepDeep:        '#c87840',
  sleepRem:         '#7dc98a',
  sleepTrack:       '#3a2510',

  workoutPush:      '#f0a040',
  workoutPull:      '#7dc98a',
  workoutLegs:      '#e8940a',
  workoutCardio:    '#aa8855',

  ifMethodBg:       'rgba(200,150,90,0.20)',
  ifMethodBorder:   'rgba(212,140,60,0.22)',
  ifMethodText:     '#aa8855',

  donutTrack:       '#3a2510',
  iconMuted:        '#3a2510',
  sheetHandle:      'rgba(212,140,60,0.25)',
  overlayBg:        'rgba(0,0,0,0.60)',

  gradientStart:    '#4a2e10',
  gradientEnd:      '#2a1a08',
};

// ─── Blush Theme (light, airy, pink - Megan's) ────────────────────────────────
const blush: Theme = {
  id: 'blush',
  name: 'Blush',
  paid: true,

  bgPrimary:        '#fdf0f3',
  bgCard:           'rgba(252,232,237,0.85)',
  bgCardVerse:      'rgba(255,248,240,0.85)',
  bgInput:          '#fce8ed',
  bgProgressTrack:  '#f8d8e0',
  bgSheet:          '#ffffff',
  bgInset:          '#fce8ed',
  bgEditCard:       '#ffffff',

  borderCard:       'rgba(200,80,110,0.08)',
  borderCardTop:    'rgba(200,80,110,0.14)',
  borderCardVerse:  'rgba(212,134,10,0.35)',
  borderInput:      'rgba(200,80,110,0.12)',
  borderSubtle:     'rgba(200,80,110,0.06)',
  borderSheet:      'rgba(200,80,110,0.10)',
  borderInset:      'rgba(200,80,110,0.08)',

  textPrimary:      '#3a1a22',
  textSecondary:    '#8a5060',
  textMuted:        '#aa7080',
  textDim:          '#cc99aa',
  textPlaceholder:  '#ddbbcc',
  textWhite:        '#3a1a22',

  accentBlue:       '#d4607a',
  accentBlueRaw:    '#d4607a',
  accentBlueBg:     'rgba(212,96,122,0.12)',
  accentBlueBorder: 'rgba(212,96,122,0.28)',
  accentGreen:      '#5cb87a',
  accentGreenBg:    'rgba(92,184,122,0.12)',
  accentGreenBorder:'rgba(92,184,122,0.28)',
  accentAmber:      '#c47820',
  accentRed:        '#d44040',
  accentRedBg:      'rgba(212,64,64,0.10)',
  accentRedBorder:  'rgba(212,64,64,0.25)',

  statusGood:       '#5cb87a',
  statusWarn:       '#d4860a',
  statusBad:        '#d44040',

  macroProtein:     '#5cb87a',
  macroCarbs:       '#e8902a',
  macroFat:         '#d4607a',
  macroOver:        '#d44040',

  sleepCore:        '#d4607a',
  sleepDeep:        '#b060a0',
  sleepRem:         '#5cb87a',
  sleepTrack:       '#f8d8e0',

  workoutPush:      '#d4607a',
  workoutPull:      '#5cb87a',
  workoutLegs:      '#e8902a',
  workoutCardio:    '#aa7080',

  ifMethodBg:       '#fce8ed',
  ifMethodBorder:   'rgba(200,80,110,0.14)',
  ifMethodText:     '#aa7080',

  donutTrack:       '#f0c8d4',
  iconMuted:        '#f0c8d4',
  sheetHandle:      'rgba(200,80,110,0.18)',
  overlayBg:        'rgba(60,10,20,0.40)',

  gradientStart:    '#f0c0cc',
  gradientEnd:      '#fdf0f3',
};

// ─── Theme Map ────────────────────────────────────────────────────────────────
export const THEMES: Record<ThemeId, Theme> = { dark, light, slate, warm, blush };

export const THEME_ORDER: ThemeId[] = ['dark', 'light', 'slate', 'warm', 'blush'];

// ─── Context ──────────────────────────────────────────────────────────────────
// Drop ThemeProvider in app/_layout.tsx wrapping everything.
// Any component calls useTheme() to get the active theme object.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  accentId: AccentId;
  setTheme: (id: ThemeId) => void;
  setAccent: (id: AccentId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: dark,
  themeId: 'dark',
  accentId: 'default',
  setTheme: () => {},
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [themeId, setThemeId] = useState<ThemeId>('dark');
  const [accentId, setAccentId] = useState<AccentId>('default');

  useEffect(() => {
    AsyncStorage.getItem('pj_settings').then(s => {
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.theme && THEMES[parsed.theme as ThemeId]) {
          setThemeId(parsed.theme as ThemeId);
        }
        if (parsed.selectedAccent) {
          setAccentId(parsed.selectedAccent as AccentId);
        }
      }
    }).catch(() => {});
  }, []);

  const setTheme = async (id: ThemeId) => {
    setThemeId(id);
    setAccentId('default');
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, theme: id, selectedAccent: 'default' }));
    } catch (e) {
      console.log('Theme save error', e);
    }
  };

  const setAccent = async (id: AccentId) => {
    setAccentId(id);
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, selectedAccent: id }));
    } catch (e) {
      console.log('Accent save error', e);
    }
  };

  // Compose final theme - base theme + accent overrides
  const baseTheme = THEMES[themeId];
  const accentOptions = ACCENT_PALETTES[themeId];
  const activeAccent = accentOptions.find(a => a.id === accentId) ?? accentOptions[0];
  const composedTheme: Theme = {
    ...baseTheme,
    accentBlue:       activeAccent.buttonColor ?? activeAccent.accentBlue,
    accentBlueRaw:    activeAccent.accentBlue,
    accentBlueBg:     activeAccent.buttonBg ?? activeAccent.accentBlueBg,
    accentBlueBorder: activeAccent.buttonBorder ?? activeAccent.accentBlueBorder,
    ...(activeAccent.gradientStart ? { gradientStart: activeAccent.gradientStart } : {}),
  };

  return (
    <ThemeContext.Provider value={{ theme: composedTheme, themeId, accentId, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}