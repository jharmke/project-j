import { Ionicons } from '@/components/AppIcons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import ButtonShine from './ButtonShine';

// ─── HeaderIconButton ─────────────────────────────────────────────────────────
// The tinted square in every tab header (refresh / calendar / grid / trophy / etc). It used to be a FLAT
// tinted fill; this adds a subtle TOP-SHINE so it reads as a SURFACE catching light. Two soft layers, the
// same top-shine language as the home dome scaled way down (gentle, never glossy):
//   - a white crown gloss fading from the top edge down to transparent by ~55%
//   - a brighter top BEVEL edge (borderTopColor) so the top lip catches light too
// Tuned per theme: a white gloss on a dark tinted button glares, so it is much softer on Dark.
// One shared source so every header stays consistent -- and the same recipe seeds the tinted-pill pass.
// color/bg/border: optional overrides for a screen whose chrome is NOT the app accent -- the Faith tab is
// amber, page glow included. Default to the accent tokens so every other tab is untouched.
export default function HeaderIconButton({ icon, onPress, size = 14, haptic = Haptics.ImpactFeedbackStyle.Light, color, bg, border }: { icon: any; onPress: () => void; size?: number; haptic?: Haptics.ImpactFeedbackStyle; color?: string; bg?: string; border?: string }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => { triggerHaptic(haptic); onPress(); }}
      style={{
        borderWidth: 1, borderRadius: 6, height: 32, paddingHorizontal: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg ?? theme.accentBlueBg,
        // Border is the SAME accent tint on all four sides -- do NOT whiten the top edge: a white top border
        // vanishes into a light header background and makes the top read as "cut off". ButtonShine lights
        // the top, not the border.
        borderColor: border ?? theme.accentBlueBorder,
      }}
    >
      <ButtonShine radius={6} />
      <Ionicons name={icon} size={size} color={color ?? theme.accentBlue} />
    </TouchableOpacity>
  );
}
