import { Ionicons } from '@/components/AppIcons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

// ─── GradientIcon ──────────────────────────────────────────────────────────────
// Same mold as GradientNumber, for an Ionicon instead of text. REQUIRES the native build that ships
// @react-native-masked-view/masked-view -- do not import this from a screen until that build is on device.

const LIGHT = 0.24;
const DARK  = 0.20;

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

export default function GradientIcon({
  name,
  size,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
}) {
  const rgb = parseHex(color);

  // A theme token that isn't a plain hex renders flat rather than wrong -- no caller has to know or care.
  if (!rgb) return <Ionicons name={name} size={size} color={color} />;

  const stops: [string, string, string] = [lift(rgb, LIGHT), color, sink(rgb, DARK)];

  return (
    <MaskedView maskElement={<Ionicons name={name} size={size} color="#000000" />}>
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Ionicons name={name} size={size} color={color} style={{ opacity: 0 }} />
      </LinearGradient>
    </MaskedView>
  );
}
