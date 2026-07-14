import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Mask, Pattern, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

// ─── BackgroundLayers ─────────────────────────────────────────────────────────
// The page surface, as TWO stacking layers. Treating background as one choice forced a false pick;
// colour and texture are independent and were never in competition.
//
//   LAYER 1  COLOUR   -- a bottom glow. The accent rises from the base of the screen.
//   LAYER 2  TEXTURE  -- halftone. Dots rise from the bottom and dissolve upward.
//
// Both point the SAME direction: light rising from below, dissolving as it climbs. That is the whole
// design idea, and it is why we cut mesh, aurora, vignette, topographic, line grid and stripes -- each
// was a DIFFERENT idea about what the surface is, and any two of them fighting cancels both out.
//
// Drops in as an absolute layer inside a screen's existing gradient, ABOVE it and BELOW the content.
// pointerEvents="none" throughout: this is scenery, it never eats a tap.

// The glow has a ceiling, and the tab bar is what sets it. At 0.55 the bottom of the page saturated so
// hard that the glass bar drank it up and went dark -- the bar stopped reading as glass and started
// reading as a coloured slab. 0.40 is the line: strong enough to see, quiet enough for the bar to stay
// glass over it. (0.30 was the other failure: invisible on a near-white Light theme.)
const GLOW_STRENGTH = 0.40;    // accent alpha where the glow is strongest (at the very bottom)
const GLOW_HEIGHT = '62%';     // how far up the screen it reaches

// LINE GRID. The halftone dots were too fine to survive being seen through a glass card -- they read as
// speckle, not structure. Lines hold their shape: they carry the eye and give the surface an architecture
// to sit on, which is what "depth" actually means here.
// HALFTONE, not a grid. The grid was tried and cut: it competes with the app's own LINES. Stats is built
// out of horizontal dividers and section rules, the summary cards have their own internal rules, and a
// background made of lines turns all of that into visual noise -- you cannot tell the app's structure from
// the wallpaper's. Dots have no direction, so they never compete with a divider.
// Dots ARE atmosphere, so unlike the grid they get the rising-from-below fade back.
const DOT_SPACING = 18;
const DOT_RADIUS = 1.3;
const DOT_OPACITY = 0.14;

// LAYER 3 -- GRAIN. A 128px tile of deterministic noise, repeated. It is meant to be almost invisible:
// if you can SEE it as texture it is turned up too far. What it does is stop a flat colour field reading
// as PLASTIC -- it makes the surface feel like material. React Native cannot do this the easy way (no CSS
// feTurbulence, and react-native-svg has no filter support), so it is a real bundled image, tiled.
// Dark grounds swallow noise, so dark carries a touch more of it.
// With mixBlendMode 'overlay' the grain MODULATES what is under it instead of covering it, so colours
// keep their saturation and nothing fogs. But overlay BITES: 0.22 (the CSS lab's value) came out like
// sandpaper on a phone screen, where the pixels are far denser than a browser mock. Grain belongs below
// conscious notice -- you should never be able to point at it, only feel that the surfaces stopped being
// plastic.
const GRAIN_OPACITY_LIGHT = 0.03;
const GRAIN_OPACITY_DARK = 0.022;

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex;
}

export default function BackgroundLayers({ glow }: {
  // The glow colour. Defaults to the app accent; the Faith tab passes its amber, so the PAGE ITSELF runs
  // warm there. The tab announces itself before you read a word, and the gold identity stops living only
  // in the card edges.
  glow?: string;
} = {}) {
  const { theme } = useTheme();
  const glowColor = glow ?? theme.accentBlueRaw;

  // Texture ink: the page's own ink, not the accent. Accent dots are lovely on a light theme and turn
  // gaudy fast on a dark one, and this has to hold across five themes and every accent.
  const ink = theme.textPrimary;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* LAYER 1 -- bottom glow */}
      <LinearGradient
        colors={['transparent', withAlpha(glowColor, GLOW_STRENGTH)]}
        style={[styles.glow, { height: GLOW_HEIGHT }]}
      />

      {/* LAYER 2 -- halftone, rising from the bottom and dissolving upward. Same gesture as the glow. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="dots" patternUnits="userSpaceOnUse" width={DOT_SPACING} height={DOT_SPACING}>
            <Circle cx={DOT_SPACING / 2} cy={DOT_SPACING / 2} r={DOT_RADIUS} fill={ink} />
          </Pattern>
          {/* The mask is what makes it a HALFTONE rather than wallpaper: strongest at the bottom, gone by
              the time it reaches the header. White = keep, black = drop. */}
          <SvgGradient id="fade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="0.46" stopColor="#ffffff" stopOpacity="0.55" />
            <Stop offset="0.88" stopColor="#ffffff" stopOpacity="0" />
          </SvgGradient>
          <Mask id="fadeMask">
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
          </Mask>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" mask="url(#fadeMask)" opacity={DOT_OPACITY} />
      </Svg>

      {/* Grain does NOT live here -- see <Grain />, exported below. It has to sit OVER the cards, not
          behind them. */}
    </View>
  );
}

// ─── Grain ────────────────────────────────────────────────────────────────────
// FILM grain: it goes on TOP of everything -- the cards, the numbers, the whole image -- not behind it.
// That is the entire point. Every surface sitting under the same speck of noise is what fuses them into
// one material; grain hiding behind the cards (where I first put it) only exists in the gutters, which on
// a light theme is nowhere.
//
// Mount it as the LAST child of a screen, above the scroll, below the header and tab bar (they are glass;
// they get their grain from the content showing through them).
export function Grain() {
  const { theme } = useTheme();
  return (
    // Wrapped in a View purely for pointerEvents: this layer covers the ENTIRE screen, so it absolutely
    // must not eat taps.
    // mixBlendMode 'overlay' is the whole ballgame, and it lives on the VIEW (it is a ViewStyle prop, not
    // an ImageStyle one). Without it, this is a semi-opaque grey sheet painted OVER the app: it COVERS
    // rather than modulates, so colours wash out and the whole screen fogs -- a veil, not a texture.
    // Overlay makes mid-grey a no-op, and lets the dark specks darken and the light specks lighten what is
    // already there, so the grain rides ON the colours and the type instead of burying them.
    // (RN only gained mixBlendMode in 0.76, on the new architecture. It did not exist for most of RN's
    // life, which is why the first pass was straight alpha.)
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          // Above EVERY overlay. Otto's FAB sits at zIndex 51 and was punching through the grain, which
          // is exactly the "one surface has no texture" tell that breaks the illusion. Modals are separate
          // native windows and are out of reach on purpose -- a sheet floating over the app should read as
          // a different plane anyway.
          zIndex: 9999,
          opacity: theme.id === 'dark' ? GRAIN_OPACITY_DARK : GRAIN_OPACITY_LIGHT,
          mixBlendMode: 'overlay',
        },
      ]}
      pointerEvents="none"
    >
      {/* resizeMode 'cover', NOT 'repeat'. RN's new architecture does not implement 'repeat' -- it drew a
          single tile in the top-left corner and left the rest of the screen bare. The texture is
          full-screen now, so it just fills. */}
      <Image
        source={require('../assets/images/grain.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
