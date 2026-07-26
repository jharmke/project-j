// GradientCard -- the app-wide card with the Oura-style baked-in top gradient
// wash. Replaces the old left-accent-border card treatment. See
// SPEC_card_gradient.md for the locked recipe and color rules.
//
// CardWash is the SINGLE source of truth for the gradient recipe. Use
// GradientCard for plain <View> cards; drop a bare <CardWash /> as the first
// child of any pressable/animated card you can't swap the wrapper on.
//
// Color rules (locked):
//  - Default wash = theme accent (theme.accentBlueRaw, the live per-accent color).
//  - Faith tab passes washColor={theme.accentAmber}.
//  - Scored cards (composite score/zone headline) pass washColor={statusColor}
//    + scored so they get the gentler variant. On no score, omit washColor to
//    fall back to the accent wash.
//
// Why a baked-in gradient edge and NOT a real top border: iOS renders a rounded
// corner unevenly whenever borderTopWidth differs from the side borders. The
// crisp top edge MUST be the gradient's first color stop. Never reintroduce a
// borderTopWidth top border. Never put overflow:'hidden' on the card (kills the
// shadow) -- the matched corner radii on the gradient handle the clipping.

import React from 'react';
import { Ionicons } from '@/components/AppIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

const WASH_HEIGHT = 64;
const DEFAULT_RADIUS = 14;

export function CardWash({
  color,
  scored = false,
  radius = DEFAULT_RADIUS,
}: {
  color?: string;
  scored?: boolean;
  radius?: number;
}) {
  const { theme } = useTheme();
  const wash = color ?? theme.accentBlueRaw;
  // Scored cards use saturated status colors that already contrast the bg, so
  // they get the GENTLER stop. Plain/accent cards share the bg color family and
  // need the BOLDER stop to read.
  const colors: readonly [string, string, string] = scored
    ? [wash, `${wash}2E`, `${wash}00`]
    : [wash, `${wash}40`, `${wash}00`];
  const locations: readonly [number, number, number] = scored
    ? [0, 0.06, 1]
    : [0, 0.04, 1];
  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: WASH_HEIGHT,
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
      }}
      pointerEvents="none"
    />
  );
}

// ─── CardWatermark ────────────────────────────────────────────────────────────
// The big faint icon in a card's bottom-right corner. It is deliberately hung OUTSIDE the card
// (right:-24, bottom:-28 at size 130) so only a slice of it shows -- which means something has to clip it.
//
// That "something" used to be overflow:'hidden' ON THE CARD, and that is exactly what this file's header
// rule forbids, because it silently deletes the card's shadow (iOS masksToBounds clips the layer's own
// shadow). Every Home card carried it, so NO Home card has had a shadow since the refresh -- while the
// whole design leans on "cards float on shadow, not value contrast".
//
// So the watermark clips ITSELF: its own absolutely-filled, rounded, overflow-hidden box. This box has no
// shadow of its own, so masksToBounds costs nothing here. The card keeps its shadow. Same self-clipping
// trick as ButtonShine and FabDome.
// `icon` renders any OTHER icon set (Faith's cards use MaterialCommunityIcons) inside the same clip box:
// pass the element, already sized/coloured, and it gets the standard corner placement + clipping. When
// omitted, `name` draws an Ionicon -- the common case.
export function CardWatermark({
  name,
  color,
  icon,
  opacity = 0.10,
  size = 130,
  radius = DEFAULT_RADIUS,
}: {
  name?: any;
  color?: string;
  icon?: React.ReactNode;
  opacity?: number;
  size?: number;
  radius?: number;
}) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -24, bottom: -28, opacity }}>
        {icon ?? <Ionicons name={name} size={size} color={color} />}
      </View>
    </View>
  );
}

interface GradientCardProps extends ViewProps {
  /** Wash color. Defaults to the theme accent. Faith passes amber; scored cards pass a status color. */
  washColor?: string;
  /** Use the gentler scored-card variant (for composite-score cards). */
  scored?: boolean;
  /** Card corner radius. Must match the wash corners; defaults to 14. */
  radius?: number;
}

export default function GradientCard({
  children,
  style,
  washColor,
  scored = false,
  radius = DEFAULT_RADIUS,
  ...rest
}: GradientCardProps) {
  const { theme } = useTheme();
  // Canonical card LOOK lives here (one place). Per-card margins/layout stay on
  // the passed style so nothing shifts. style wins over base where they overlap.
  const base: ViewStyle = {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopColor: theme.borderCardTop,
    borderLeftWidth: 0.5,
    borderLeftColor: theme.borderCard,
    borderRadius: radius,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  };
  return (
    <View style={[base, style]} {...rest}>
      <CardWash color={washColor} scored={scored} radius={radius} />
      {children}
    </View>
  );
}
