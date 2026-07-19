// ─── barGradient ────────────────────────────────────────────────────────────────
// Same molded lift/sink recipe as GradientTitle/GradientNumber (lighter top, base colour middle,
// darker bottom), reused here for progress-bar fills instead of text. Bars are thin (6-8px), so the
// scaling is gentler than the title/number version -- a flat sheen reads as shine at that height,
// it doesn't need as much push.

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

// Bars are 6-8px tall, shorter than even a title glyph, so the same "subtle" amount that reads as
// shine on text is nearly invisible here -- pushed well past the title/number values on purpose.
const LIGHT = 0.48;
const DARK = 0.32;
const LIGHT_FLOOR = 0.20;
const DARK_FLOOR = 0.20;

// Returns a 3-stop vertical gradient (top -> middle -> bottom) from a flat base colour. Falls back
// to a flat 3-of-the-same-colour array for non-hex tokens (rgba(), theme strings) so a caller never
// has to check -- LinearGradient just renders it flat instead of wrong.
export function barFillGradient(color: string): [string, string, string] {
  const rgb = parseHex(color);
  if (!rgb) return [color, color, color];
  const l = luma(rgb);
  const liftScale = Math.max(LIGHT_FLOOR, 1 - l * 1.3);
  const darkScale = Math.max(DARK_FLOOR, 1 - l * 1.15);
  return [lift(rgb, LIGHT * liftScale), color, sink(rgb, DARK * darkScale)];
}
