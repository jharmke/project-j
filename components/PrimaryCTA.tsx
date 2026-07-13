import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';

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
  disabled = false,
  haptic = Haptics.ImpactFeedbackStyle.Medium,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;          // rendered left of the label (already colored white by the caller)
  busy?: boolean;                  // swaps the label for a spinner and blocks presses
  disabled?: boolean;
  haptic?: Haptics.ImpactFeedbackStyle;
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.timing(scale, { toValue: v, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

  const blocked = busy || disabled;

  return (
    <View style={[styles.glow, { shadowColor: theme.accentBlueRaw }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={blocked}
          onPressIn={() => to(0.97)}
          onPressOut={() => to(1)}
          onPress={() => { triggerHaptic(haptic); onPress(); }}
          style={[styles.btn, { backgroundColor: theme.accentBlue, opacity: disabled ? 0.5 : 1 }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.16)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {busy ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={styles.row}>
              {icon}
              <Text style={styles.label}>{label}</Text>
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
  label: { fontSize: 19, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.2, color: '#ffffff' },
});
