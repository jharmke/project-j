import React from 'react';
import Svg, { Path } from 'react-native-svg';

// ─── SproutIcon ─────────────────────────────────────────────────────────────
// Custom Supporter / Membership mark. Ionicons has no sprout glyph, so this is
// hand-drawn: an asymmetric "reaching" sprout (one leaf up-left, a smaller one
// lower-right) rising off a gently curved stem. Reads as a sprout down to ~15px.
// Used in the Membership settings row, Profile, and the support screen.
//   size  = pixel width/height (square). Default 20 (settings-row size).
//   color = single fill/stroke color. Pass a theme token (gold for the badge,
//           amber/accent for rows). Default = badge gold.

interface SproutIconProps {
  size?: number;
  color?: string;
}

export default function SproutIcon({ size = 20, color = '#d9a441' }: SproutIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* stem */}
      <Path
        d="M12 21 C 12.3 17 11.3 15 11.9 13"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* big leaf, reaching up-left */}
      <Path d="M12 13 C 9.6 8 5.8 6.2 1.8 7.4 C 3 11.8 7.4 13.6 12 13 Z" fill={color} />
      {/* smaller leaf, lower-right */}
      <Path d="M12.2 13.4 C 14 10.6 17 9.8 20.4 10.9 C 19.4 14 15.8 14.8 12.2 13.4 Z" fill={color} />
    </Svg>
  );
}
