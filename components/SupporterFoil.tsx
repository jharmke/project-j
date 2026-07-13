import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SproutIcon from './SproutIcon';

// ─── Supporter gold: the ONE source of truth ─────────────────────────────────
// Gold is a MATERIAL, not a color. It only reads as gold when a light-to-dark shift fakes a specular
// highlight -- there is no flat hex that reads as gold. Painted flat on a light card it is, literally,
// mustard (we tried; it was). So gold NEVER appears as flat fill or flat text: only as the gradient
// surfaces below.
//
// THE RULE: gold means MEMBERSHIP. Never a lock, never a paywall, never a price. The moment gold also
// marks restriction, the badge stops being a thank-you and becomes the color of the thing blocking you.
// Locked states stay neutral + accent (see the lock icons on the gates).
//
// Deliberately NOT theme tokens: the Supporter mark is the same object on all five themes, the way a
// metal hallmark looks the same whatever paper it's stamped on.

export const GOLD_HI = '#f6e08f';                    // specular highlight -- the stop that makes it metal
export const GOLD_BASE = '#d4af37';
export const GOLD_DEEP = '#a8801f';
export const GOLD_ENGRAVE = '#33290c';               // a mark stamped INTO the foil
export const GOLD_EDGE = 'rgba(212,175,55,0.45)';    // border/hairline
export const GOLD_TINT = 'rgba(212,175,55,0.13)';    // champagne wash -- a tint of the card, never a fill

// The hallmark: the Supporter sprout engraved into a chip of gold leaf.
export function FoilChip({ size = 36, radius = 10 }: { size?: number; radius?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: radius, borderWidth: 1, borderColor: GOLD_EDGE,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <LinearGradient
        colors={[GOLD_HI, GOLD_BASE, GOLD_DEEP]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SproutIcon size={Math.round(size * 0.61)} color={GOLD_ENGRAVE} />
    </View>
  );
}

// A struck-gold edge along the top of a card. The parent needs overflow: 'hidden'.
export function FoilEdge({ height = 2.5 }: { height?: number }) {
  return (
    <LinearGradient
      colors={[GOLD_DEEP, GOLD_HI, GOLD_BASE]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
    />
  );
}
