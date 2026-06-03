import Svg, { Path } from 'react-native-svg';

/**
 * Faith tab icon: the ichthys (Jesus fish). Two arcs that meet at the nose
 * (right) and cross over each other at the back (left) to form the tail. Body
 * height tuned between fat and thin. Glow-agnostic; the parent applies the
 * active halo. viewBox is a fixed 24 units. strokeWidth is exposed so the small
 * tab-bar instance can run a touch heavier for legibility (especially on light
 * themes) without bolding the large Hub instance.
 */
export default function FaithIconFish({ size = 24, color = '#ffffff', strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 14.5 C8 6.5 18 6.5 22 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      <Path d="M3 9.5 C8 17.5 18 17.5 22 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
