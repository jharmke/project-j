import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextStyle } from 'react-native';
import { Type } from '../typography';

// ─── DurationValue ────────────────────────────────────────────────────────────
// Renders "7h 18m" as DATA, not as a word: the digits take the number face, the unit letters drop to
// the interface face at roughly half size and a muted colour.
//
// Why this exists: Bebas has no lowercase, so it silently rendered these as "7H 18M" and nobody noticed
// the units were living inside the number face. Rajdhani (and Khand) have real lowercase, so the h and
// the m suddenly showed up as full-height condensed letters wedged between digits, and the whole value
// read as a strange word. Every other value on the app already does this properly -- 1468 big, "kcal"
// small and muted beside it -- sleep was the one place where the unit was baked into the string.
//
// Takes the already-formatted string ("7h 18m", "57m", "1h 0m") so callers keep their existing helpers.
//
// gradient: true molds the WHOLE value (digits + unit letters together, one wash) with GradientNumber's
// light-to-dark technique -- same LIGHT/DARK amounts, so a duration hero reads the same as a calorie hero.
// One mask covers both faces, so unitColor is ignored in gradient mode (the mask paints every unmasked
// pixel with the same gradient regardless of the colour underneath). Requires the masked-view native
// build, same as GradientNumber -- falls back to flat automatically if `color` isn't a plain hex.

const LIGHT = 0.24;
const DARK = 0.20;

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');

const lift = (rgb: [number, number, number], amt: number) =>
  toHex(rgb[0] + (255 - rgb[0]) * amt, rgb[1] + (255 - rgb[1]) * amt, rgb[2] + (255 - rgb[2]) * amt);

const sink = (rgb: [number, number, number], amt: number) =>
  toHex(rgb[0] * (1 - amt), rgb[1] * (1 - amt), rgb[2] * (1 - amt));

export default function DurationValue({
  value,
  size,
  color,
  unitColor,
  style,
  unitScale = 0.6,
  gradient = false,
}: {
  value: string;              // e.g. "7h 18m"
  size: number;               // the DIGIT size; units are derived from it
  color: string;              // digit colour (and the gradient's base colour when gradient is on)
  unitColor?: string;         // ignored when gradient is true
  style?: TextStyle;          // applied to the wrapper (opacity, letterSpacing, lineHeight...)
  unitScale?: number;         // unit size as a fraction of the digit size
  gradient?: boolean;         // mold the value instead of painting it flat
}) {
  // Split into runs of digits, runs of letters, and the spaces between them, so "7h 18m" -> 7 | h | ' ' | 18 | m
  const parts = value.match(/\d+|[^\d\s]+|\s+/g) ?? [value];
  const unitSize = Math.round(size * unitScale);

  const renderParts = (forceColor?: string) =>
    parts.map((p, i) => {
      if (/^\s+$/.test(p)) return p;                       // preserve the gap between "7h" and "18m"
      if (/^\d+$/.test(p)) return <Text key={i}>{p}</Text>; // digits inherit the number face + outer colour
      return (
        <Text key={i} style={{ fontFamily: Type.uiMedium, fontSize: unitSize, color: forceColor ?? (unitColor ?? color) }}>
          {p}
        </Text>
      );
    });

  const rgb = gradient ? parseHex(color) : null;

  if (!gradient || !rgb) {
    return (
      <Text style={[{ fontFamily: Type.num, fontSize: size, color }, style]}>
        {renderParts()}
      </Text>
    );
  }

  const stops: [string, string, string] = [lift(rgb, LIGHT), color, sink(rgb, DARK)];

  return (
    <MaskedView
      maskElement={
        <Text style={[{ fontFamily: Type.num, fontSize: size }, style, { color: '#000000' }]}>
          {renderParts('#000000')}
        </Text>
      }
    >
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        {/* Invisible copy gives the gradient the exact size of the glyphs it is filling. Caller's
            style (e.g. opacity: 0.88) must NOT win here, or the "invisible" copy paints over the
            gradient at near-full opacity and the whole thing reads as flat black. */}
        <Text style={[{ fontFamily: Type.num, fontSize: size }, style, { opacity: 0 }]}>
          {renderParts('#000000')}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
