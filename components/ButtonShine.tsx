import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

// ─── ButtonShine ──────────────────────────────────────────────────────────────
// The shared top-shine primitive for tinted buttons (icon squares, text pills, chips). Drop it as a child
// of any tinted TouchableOpacity to make it read as a SURFACE catching light: a white crown gloss fading
// down. Inset 1px with its OWN rounded corners so it self-clips -- do NOT put overflow:hidden on the parent
// (that clips the top border corners on iOS -> "cut off" tops). Softer on Dark, where a white gloss on a
// dark tinted button glares. pointerEvents="none" so it never eats a tap.
// Pass `radius` = the parent button's borderRadius so the gloss corners follow the button.
export default function ButtonShine({ radius = 6 }: { radius?: number }) {
  const { theme } = useTheme();
  const shine = theme.id === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.52)';
  return (
    <LinearGradient
      colors={[shine, 'rgba(255,255,255,0)']}
      locations={[0, 0.6]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      pointerEvents="none"
      style={{ position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: Math.max(0, radius - 1) }}
    />
  );
}
