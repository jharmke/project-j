import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme';

// ─── FabDome ──────────────────────────────────────────────────────────────────
// The shared dome for ROUND FABs (the "+" discs, Otto, Halo). Same recipe as the home tab-bar button:
// ONE full-width gradient -- bright crown -> neutral middle -> soft dark foot -- so the disc reads as a lit
// sphere. Deliberately NOT a clipped specular oval: a small oval reads as a discrete "pill" stuck on top.
// The sides melt into the disc's own edge, so the highlight has no visible shape of its own.
//
// SELF-CLIPPING, on purpose. The home button can wear overflow:'hidden' because its glow sits on a wrapper
// View; these FABs carry their shadow on the disc ITSELF, and overflow:'hidden' (layer masksToBounds) kills
// that shadow on iOS. So the dome clips itself with its own round radius instead -- same lesson as
// ButtonShine. Do NOT add overflow:'hidden' to a FAB to "fix" the corners; you will silently lose the shadow.
//
// RADIUS NOTE: absoluteFill inside a bordered disc fills the PADDING box (inside the border ring), so the
// dome is size - borderWidth*2 across. Passing radius = size/2 is correct either way: RN clamps a radius to
// half the smaller side, so it lands on a true circle whether it measures the padding box or the border box.
// That keeps the moat ring (borderWidth:3 borderColor:bgPrimary) clean and un-glossed, which is right -- the
// moat is page background, not part of the button's surface.
//
// pointerEvents="none" so it never eats a tap. Render it BEFORE the icon so the icon sits on top.
export default function FabDome({ size }: { size: number }) {
  const { theme } = useTheme();
  const isDark = theme.id === 'dark';
  // Mild by design. The garish orb we rejected was a strong mould + a 0.60 specular + a lift, all at once.
  const colors: [string, string, string, string] = isDark
    ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.26)']
    : ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.06)', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.16)'];
  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.3, 0.6, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
    />
  );
}
