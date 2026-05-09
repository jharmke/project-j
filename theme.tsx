// ─── Project J Theme System ───────────────────────────────────────────────────
// One file. All colors live here. No hardcoded hex anywhere else.
// Swapping themes = one state change.
//
// Free:  dark, light
// Paid:  slate, warm, blush

export type ThemeId = 'dark' | 'light' | 'slate' | 'warm' | 'blush';

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
  accentBlue: string;               // primary interactive color
  accentBlueBg: string;             // button background (low opacity blue)
  accentBlueBorder: string;         // button border
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
  bgCard:           '#ffffff',
  bgCardVerse:      '#fffbf0',
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

  gradientStart:    '#e8e8f5',
  gradientEnd:      '#f0f0f5',
};

// ─── Slate Theme (cool grey, navy accent) ─────────────────────────────────────
const slate: Theme = {
  id: 'slate',
  name: 'Slate',
  paid: true,

  bgPrimary:        '#18191e',
  bgCard:           '#2e3138',
  bgCardVerse:      '#131828',
  bgInput:          '#0e1220',
  bgProgressTrack:  '#1a2030',
  bgSheet:          '#111622',
  bgInset:          '#1a2030',
  bgEditCard:       '#161c28',

  borderCard:       'rgba(100,140,255,0.08)',
  borderCardTop:    'rgba(100,140,255,0.14)',
  borderCardVerse:  'rgba(212,134,10,0.40)',
  borderInput:      'rgba(100,140,255,0.10)',
  borderSubtle:     'rgba(100,140,255,0.06)',
  borderSheet:      'rgba(100,140,255,0.12)',
  borderInset:      'rgba(100,140,255,0.08)',

  textPrimary:      '#dde4f0',
  textSecondary:    '#8899bb',
  textMuted:        '#6677aa',
  textDim:          '#445577',
  textPlaceholder:  '#334466',
  textWhite:        '#eef2ff',

  accentBlue:       '#6096ff',
  accentBlueBg:     'rgba(96,150,255,0.15)',
  accentBlueBorder: 'rgba(96,150,255,0.30)',
  accentGreen:      '#22d3a5',
  accentGreenBg:    'rgba(34,211,165,0.15)',
  accentGreenBorder:'rgba(34,211,165,0.30)',
  accentAmber:      '#d4860a',
  accentRed:        '#f87171',
  accentRedBg:      'rgba(248,113,113,0.15)',
  accentRedBorder:  'rgba(248,113,113,0.30)',

  statusGood:       '#22d3a5',
  statusWarn:       '#fbbf24',
  statusBad:        '#f87171',

  macroProtein:     '#22d3a5',
  macroCarbs:       '#d4860a',
  macroFat:         '#f87171',
  macroOver:        '#f87171',

  sleepCore:        '#6096ff',
  sleepDeep:        '#a78bfa',
  sleepRem:         '#22d3a5',
  sleepTrack:       '#1a2030',

  workoutPush:      '#6096ff',
  workoutPull:      '#22d3a5',
  workoutLegs:      '#fbbf24',
  workoutCardio:    '#6677aa',

  ifMethodBg:       '#0e1220',
  ifMethodBorder:   'rgba(100,140,255,0.12)',
  ifMethodText:     '#6677aa',

  donutTrack:       '#1a2030',
  iconMuted:        '#1e2840',
  sheetHandle:      'rgba(100,140,255,0.20)',
  overlayBg:        'rgba(0,0,0,0.65)',

  gradientStart:    '#0e1628',
  gradientEnd:      '#18191e',
};

// ─── Warm Theme (dark browns, amber accent) ───────────────────────────────────
const warm: Theme = {
  id: 'warm',
  name: 'Warm',
  paid: true,

  bgPrimary:        '#0f0a06',
  bgCard:           '#1e1208',
  bgCardVerse:      '#1a1006',
  bgInput:          '#150e05',
  bgProgressTrack:  '#251808',
  bgSheet:          '#180f06',
  bgInset:          '#251808',
  bgEditCard:       '#1e1208',

  borderCard:       'rgba(212,140,60,0.08)',
  borderCardTop:    'rgba(212,140,60,0.14)',
  borderCardVerse:  'rgba(212,134,10,0.50)',
  borderInput:      'rgba(212,140,60,0.10)',
  borderSubtle:     'rgba(212,140,60,0.06)',
  borderSheet:      'rgba(212,140,60,0.12)',
  borderInset:      'rgba(212,140,60,0.08)',

  textPrimary:      '#f0e6d8',
  textSecondary:    '#b89a78',
  textMuted:        '#997755',
  textDim:          '#664433',
  textPlaceholder:  '#553322',
  textWhite:        '#fff8f0',

  accentBlue:       '#f0a040',
  accentBlueBg:     'rgba(240,160,64,0.15)',
  accentBlueBorder: 'rgba(240,160,64,0.30)',
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
  sleepTrack:       '#251808',

  workoutPush:      '#f0a040',
  workoutPull:      '#7dc98a',
  workoutLegs:      '#e8940a',
  workoutCardio:    '#997755',

  ifMethodBg:       '#150e05',
  ifMethodBorder:   'rgba(212,140,60,0.12)',
  ifMethodText:     '#997755',

  donutTrack:       '#2a1a08',
  iconMuted:        '#2a1a08',
  sheetHandle:      'rgba(212,140,60,0.20)',
  overlayBg:        'rgba(0,0,0,0.65)',

  gradientStart:    '#1a0e04',
  gradientEnd:      '#0f0a06',
};

// ─── Blush Theme (light, airy, pink - Megan's) ────────────────────────────────
const blush: Theme = {
  id: 'blush',
  name: 'Blush',
  paid: true,

  bgPrimary:        '#fdf0f3',
  bgCard:           '#fce8ed',
  bgCardVerse:      '#fff8f0',
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
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: dark,
  themeId: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [themeId, setThemeId] = useState<ThemeId>('dark');

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem('pj_settings').then(s => {
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.theme && THEMES[parsed.theme as ThemeId]) {
          setThemeId(parsed.theme as ThemeId);
        }
      }
    }).catch(() => {});
  }, []);

  const setTheme = async (id: ThemeId) => {
    setThemeId(id);
    try {
      const s = await AsyncStorage.getItem('pj_settings');
      const current = s ? JSON.parse(s) : {};
      await AsyncStorage.setItem('pj_settings', JSON.stringify({ ...current, theme: id }));
    } catch (e) {
      console.log('Theme save error', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeId], themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}