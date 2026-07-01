import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';

// The GENERAL Companion assistant's floating button. Distinct from Halo (the gold cross): this one
// wears the app's THEME ACCENT and a spark icon, signalling a general AI helper rather than the
// faith companion. Bottom-left, like Halo, but the two are never on screen at once (Halo mounts on
// faith surfaces, this mounts everywhere else), so sharing the corner is fine.
//
// Unlike Halo, there is NO faith-tier gate here: the Companion is for every user, including Not
// Right Now. Where it shows is decided by WHERE it is mounted (hidden on faith surfaces), not by tier.
//
// A gentle "breath" swell keeps it feeling alive without being busy, matching the Halo FAB cadence.

const DISC = 56; // matches the app's other FABs
const CX = DISC / 2;
const GLOW = 84;

export default function AssistantFAB({ onPress, bottom = 18 }: { onPress?: () => void; bottom?: number }) {
  const { theme } = useTheme();
  const breath = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  // Subtle breath: a gentle swell, settle, then a long calm gap before the next one.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1000, useNativeDriver: true }),
        Animated.delay(2800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const buttonScale = Animated.multiply(press, breathScale);
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.34] });

  const handlePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };
  const pressIn = () => Animated.timing(press, { toValue: 0.92, duration: 80, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(press, { toValue: 1, duration: 130, useNativeDriver: true }).start();

  // theme.accentBlue is already the button-safe accent (the theme bakes in the light-theme
  // buttonColor override); accentBlueRaw is the raw vibrant accent, used for the glow.
  const accent = theme.accentBlue;
  const glowColor = theme.accentBlueRaw;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      {/* Faint accent glow, tight around the disc, fades in and out with the breath. */}
      <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity }]}>
        <Svg width={GLOW} height={GLOW}>
          <Defs>
            <RadialGradient id="assistantGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={glowColor} stopOpacity="0.55" />
              <Stop offset="55%" stopColor={glowColor} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#assistantGlow)" />
        </Svg>
      </Animated.View>

      {/* The button: accent disc + spark icon, breathing. */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          onPress={handlePress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Open the Project J assistant"
        >
          <View style={[styles.disc, { backgroundColor: accent, shadowColor: glowColor }]}>
            <Ionicons name="sparkles" size={24} color="#ffffff" />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 24,
    width: DISC,
    height: DISC,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  glow: {
    position: 'absolute',
    width: GLOW,
    height: GLOW,
    left: (DISC - GLOW) / 2,
    top: (DISC - GLOW) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
});
