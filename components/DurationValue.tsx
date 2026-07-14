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

export default function DurationValue({
  value,
  size,
  color,
  unitColor,
  style,
  unitScale = 0.6,
}: {
  value: string;              // e.g. "7h 18m"
  size: number;               // the DIGIT size; units are derived from it
  color: string;              // digit colour
  // Unit colour. Defaults to the SAME colour as the digits: the size drop already reads as "this is the
  // unit", and stacking transparency on top of it just made the h and the m look washed out.
  unitColor?: string;
  style?: TextStyle;          // applied to the wrapper (opacity, letterSpacing, lineHeight...)
  unitScale?: number;         // unit size as a fraction of the digit size
}) {
  // Split into runs of digits, runs of letters, and the spaces between them, so "7h 18m" -> 7 | h | ' ' | 18 | m
  const parts = value.match(/\d+|[^\d\s]+|\s+/g) ?? [value];
  const unitSize = Math.round(size * unitScale);

  return (
    <Text style={[{ fontFamily: Type.num, fontSize: size, color }, style]}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) return p;                       // preserve the gap between "7h" and "18m"
        if (/^\d+$/.test(p)) return <Text key={i}>{p}</Text>; // digits inherit the number face
        return (
          <Text key={i} style={{ fontFamily: Type.uiMedium, fontSize: unitSize, color: unitColor ?? color }}>
            {p}
          </Text>
        );
      })}
    </Text>
  );
}
