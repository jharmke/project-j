import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { Type } from '../typography';

// ─── PrimaryCTA ──────────────────────────────────────────────────────────────
// The app's primary solid-fill button. MOLDED, not painted:
//   - a true vertical gradient (highlight at the top, deepening to the bottom) is what makes a button
//     read as a physical object. The earlier attempt faked depth with a translucent band across the top
//     half, which just produced a two-tone slab with a visible seam across the middle.
//   - the gradient is a light-to-dark OVERLAY, not a computed darker accent, so it works with every
//     accent the user can pick without any color math.
//   - an ACCENT-tinted glow beneath it, not a generic black shadow.
//   - Bebas caps: DMSans bold is the same weight as body copy, so a label in it reads as plain text
//     sitting on a colored rectangle.
//   - press-scale (0.97, timing) per the app's press standard, and a built-in busy state.
//
// Reserve solid fill for the ONE primary action on a screen. Secondary actions use the house tinted
// recipe (accentBlueBg + accentBlueBorder + accent text).

export default function PrimaryCTA({
  label,
  onPress,
  icon,
  busy = false,
  busyLabel,
  disabled = false,
  compact = false,
  wrapperStyle,
  faceStyle,
  fill,
  haptic = Haptics.ImpactFeedbackStyle.Medium,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;          // rendered left of the label (already colored white by the caller)
  busy?: boolean;                  // swaps the label for a spinner and blocks presses
  busyLabel?: string;              // keeps a message next to the spinner ("Analyzing your data...")
  disabled?: boolean;
  // COMPACT: the same molded button at pill scale. Bebas caps at 19px is right for a screen's one big
  // CTA, but it can't carry a label like "Repeat Yesterday · 566 kcal" inside half a row -- so compact
  // keeps the molding, glow and press-scale, and drops to DMSans at 13 so the label always fits.
  compact?: boolean;
  wrapperStyle?: any;              // e.g. { flex: 1 } to let a button share a row
  // Overrides the BUTTON FACE (padding, radius). Needed when the CTA sits next to a sibling it has to
  // match -- e.g. a Cancel/Confirm pair, where compact's own padding made the two buttons different
  // heights. Do not use it to restyle the fill; the mould is the whole point.
  faceStyle?: any;
  // FILL override. Defaults to theme.accentBlue -- pass it ONLY when the button's colour is genuinely DATA
  // rather than chrome: Manage Tags' Create Tag is filled with the tag colour you are picking, so the
  // button IS the preview. Not an escape hatch for "a different colour here"; a screen's one primary
  // action wears the accent. The mould is unaffected, and the GLOW follows the fill -- an accent glow
  // under a red button would read as a bug.
  fill?: string;
  haptic?: Haptics.ImpactFeedbackStyle;
}) {
  const { theme, themeId } = useTheme();
  // DARK: the accents are saturated and already hot against a black page, so the white top-highlight
  // that molds the button on a light theme just makes it glare (worst with yellow / pink / red). On dark
  // we mold from the SHADOW side instead -- almost no highlight, a deeper foot -- and pull the accent
  // glow back, since a glow around a bright fill on black is what pushes it over.
  const isDark = themeId === 'dark';
  const mold: [string, string, string] = isDark
    ? ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.26)']
    : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.16)'];

  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.timing(scale, { toValue: v, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

  const blocked = busy || disabled;

  return (
    <View style={[
      styles.glow,
      { shadowColor: fill ?? theme.accentBlueRaw, shadowOpacity: isDark ? 0.18 : (compact ? 0.22 : 0.35) },
      compact && { shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      wrapperStyle,
    ]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={blocked}
          onPressIn={() => to(0.97)}
          onPressOut={() => to(1)}
          onPress={() => { triggerHaptic(haptic); onPress(); }}
          style={[
            styles.btn,
            compact && { borderRadius: 9, paddingVertical: 9, paddingHorizontal: 10 },
            { backgroundColor: fill ?? theme.accentBlue, opacity: disabled ? 0.5 : 1 },
            faceStyle,
          ]}
        >
          <LinearGradient
            colors={mold}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {busy ? (
            busyLabel ? (
              <View style={styles.row}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text numberOfLines={1} style={compact ? styles.labelCompact : styles.label}>{busyLabel}</Text>
              </View>
            ) : (
              <ActivityIndicator size="small" color="#ffffff" />
            )
          ) : (
            <View style={[styles.row, compact && { gap: 6 }]}>
              {/* The old nudge is GONE. It existed because Bebas is all-caps with no descenders, so its
                  optical centre sat above the text box's geometric centre and a centred icon looked like
                  it was sagging. Onest has normal metrics; nudging it now would make the icon ride high. */}
              {icon ? <View>{icon}</View> : null}
              <Text
                numberOfLines={1}
                style={compact ? styles.labelCompact : styles.label}
              >
                {label}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The glow lives on a WRAPPER: the button itself needs overflow:hidden to clip the gradient, which
  // would clip a shadow too.
  glow: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  btn: { borderRadius: 13, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  // INTERFACE, not the number face. Bebas was doing button-label duty here (it did every job), and the
  // sweep faithfully mapped Bebas -> Num -- which would have put Rajdhani, a condensed TABULAR face built
  // for values, on the app's primary CTA. A button label is interface copy. It also no longer needs the
  // +1.2 tracking Bebas required to breathe.
  label: { fontSize: 17, fontFamily: Type.uiBold, letterSpacing: 0.2, color: '#ffffff' },
  labelCompact: { fontSize: 12.5, fontFamily: Type.uiBold, color: '#ffffff', flexShrink: 1 },
});
