import MaskedView from '@react-native-masked-view/masked-view';
import { Text } from '@/components/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { TextStyle } from 'react-native';

// ─── GradientTitle ──────────────────────────────────────────────────────────────
// A page/modal title, MOLDED instead of painted -- same masked-view trick and same three-stop recipe as
// GradientNumber (lighter top, base colour middle, darker bottom), straight vertical. Titles briefly tried
// a shallow diagonal per SPEC_visual_refresh.md, but the tilt was calculated assuming a roughly SQUARE
// box (true for a single number) -- stretched across a whole WIDE word it turned into a left-to-right
// wash instead of top-to-bottom, so long titles read as almost entirely dark. Straight vertical has no
// such dependency on how wide the title is. A two-stop (colour -> darker) version was also tried and
// dropped: with no lift at the top, "light" was just "not yet darkened," which nearly disappeared on
// already-muted colours like Faith's amber. Matching GradientNumber's lift+sink fixes both.
//
// REQUIRES the native build that ships @react-native-masked-view/masked-view -- already on device, same
// module GradientNumber depends on.
//
// Used ONLY inside ScreenHeader and ModalHeader, the two components that own every title in the app.
// Wiring it there once covers every screen and modal at once -- do not call this directly from a screen.

// Deliberately stronger than GradientNumber's 0.24/0.20. A hero number is 36-56px, tall enough that a
// subtle wash reads clearly; a title's glyphs are much shorter, so the same subtle amount that works on
// numbers is nearly invisible on text. Titles need more push to read as shine at all.
const LIGHT = 0.40; // how far the top lifts toward white
const DARK = 0.34;  // how far the bottom sinks toward black

// A flat percentage looks wrong on colours that are already near white or near black: an already-bright
// colour (Yellow) barely lifts before it washes out against a light page, AND darkening it doesn't read
// as "a deeper version of itself" the way it does for blue or red -- human eyes don't really have a
// concept of "dark yellow," a darkened yellow just reads as brown. So both LIGHT and DARK scale down the
// brighter the base colour already is, tapering off toward the bright end where there's no safe room left
// to push. LIGHT tapers off much faster than DARK: lifting an already-bright colour further toward white
// is the direction that actually goes wrong (it reads as blown-out/too-bright, worst on a pale page like
// Blush), while sinking it toward black is comparatively safe and is still what carries most of the
// "molded" read once lift has nowhere useful left to go. LIGHT_FLOOR/DARK_FLOOR keep a little shine
// everywhere rather than flattening bright colours to nothing. DARK_FLOOR was 0.4 and still turned pure
// saturated Yellow (#ffe600 / #fde047, near-zero blue channel) to mustard: that particular hue has NO
// dark version at all, so even the reduced sink still crossed into "different colour" territory. DARK now
// falls off almost as fast as LIGHT at the extreme end -- it stays strong through the app's normal
// mid-tone accents (that range is where "molded" actually needs the sink), it just no longer stays
// half-strength all the way out to a fully saturated primary yellow.
const LIGHT_FLOOR = 0.15;
const DARK_FLOOR = 0.18;

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }

function luma(rgb: [number, number, number]) {
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
}

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

// Straight down -- deliberately width-independent. See note above.
const START = { x: 0, y: 0 };
const END = { x: 0, y: 1 };

export default function GradientTitle({
  title,
  color,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
}: {
  title: string;
  color: string;                          // the base colour the title would have had if it were flat
  style?: TextStyle | TextStyle[];        // the title's normal text style (font, size, tracking...)
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;         // Home's greeting shrinks to fit next to the icon row
  minimumFontScale?: number;
}) {
  const rgb = parseHex(color);
  const shrink = { numberOfLines, adjustsFontSizeToFit, minimumFontScale };

  // A theme token that isn't a plain hex (rgba(), a colour+alpha string) can't be sunk, so it renders
  // flat rather than wrong. No caller has to know or care.
  if (!rgb) {
    return <Text allowFontScaling={false} {...shrink} style={[style, { color }]}>{title}</Text>;
  }

  const l = luma(rgb);
  const liftScale = Math.max(LIGHT_FLOOR, 1 - l * 1.3);
  const darkScale = Math.max(DARK_FLOOR, 1 - l * 1.15);
  const stops: [string, string, string] = [lift(rgb, LIGHT * liftScale), color, sink(rgb, DARK * darkScale)];

  return (
    <MaskedView
      maskElement={<Text allowFontScaling={false} {...shrink} style={[style, { color: '#000000' }]}>{title}</Text>}
    >
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={START} end={END}>
        {/* An invisible copy of the title gives the gradient the exact size of the glyphs it is filling.
            Without it the gradient has no intrinsic height and the mask clips to nothing. adjustsFontSizeToFit
            runs independently on this copy and the mask copy -- both share the same text/style/width, so RN
            shrinks them to the same size in practice. */}
        <Text allowFontScaling={false} {...shrink} style={[style, { opacity: 0 }]}>{title}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
