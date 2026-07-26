import MaskedView from '@react-native-masked-view/masked-view';
import { Text } from '@/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { TextStyle } from 'react-native';

// ─── GradientNumber ───────────────────────────────────────────────────────────
// A hero number, MOLDED instead of painted. Same idea as PrimaryCTA: a flat fill reads as printed, a
// vertical light-to-dark wash reads as a physical object. Here the wash runs down each glyph.
//
// REQUIRES the native build that ships @react-native-masked-view/masked-view. Do not import this from a
// screen until that build is on the device -- a missing native module throws at require time, which would
// take the whole app down rather than degrade.
//
// Use it ONLY on a card's hero value (the calorie count, the sleep duration, a score ring, the steps
// count). Small stat values stay flat: if every number has depth, no number does.

// The mold. Deliberately narrow: a gradient you can obviously SEE is a gradient that is overdone.
const LIGHT = 0.24;   // how far the top of a glyph lifts toward white
const DARK  = 0.20;   // how far the bottom sinks toward black

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

export default function GradientNumber({
  value,
  color,
  style,
  numberOfLines,
}: {
  value: string;
  color: string;            // the base colour the number would have had if it were flat
  style?: TextStyle;        // the number's normal text style (font, size, letterSpacing, lineHeight...)
  numberOfLines?: number;   // pass through when the value sits in a width-constrained column and must not wrap
}) {
  const rgb = parseHex(color);

  // A theme token that is not a plain hex (rgba(), a colour+alpha string) can't be lifted or sunk, so it
  // renders flat rather than wrong. No caller has to know or care.
  if (!rgb) return <Text allowFontScaling={false} style={[style, { color }]} numberOfLines={numberOfLines}>{value}</Text>;

  const stops: [string, string, string] = [lift(rgb, LIGHT), color, sink(rgb, DARK)];

  return (
    <MaskedView
      maskElement={<Text allowFontScaling={false} style={[style, { color: '#000000' }]} numberOfLines={numberOfLines}>{value}</Text>}
    >
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        {/* An invisible copy of the number gives the gradient the exact size of the glyphs it is filling.
            Without it the gradient has no intrinsic height and the mask clips to nothing. */}
        <Text allowFontScaling={false} style={[style, { opacity: 0 }]} numberOfLines={numberOfLines}>{value}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
