import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTutorialTarget } from '../hooks/useTutorialTarget';

// "Halo": the faith companion's floating button. Flat and iconographic: a gold disc
// with a cross. Every few seconds it takes a subtle "breath" (a small scale swell) so it
// feels alive without being busy. The breath shows on ALL themes because it does not rely
// on background contrast; a faint gold glow rides along as a bonus on darker themes.
// Its gold is its OWN identity, deliberately not the app theme accent.
//
// Position: `bottom` is measured from the screen's own bottom. On a tab screen that
// bottom already sits at the top of the tab bar (the Tabs navigator insets the content),
// so a small offset hugs the bar. Non tab screens pass a larger bottom.

const GOLD    = '#e8a020'; // flat disc
const GOLD_HI = '#f6cf6a'; // glow + rim highlight
const CROSS   = '#fff4dd'; // warm, light cross

const DISC = 56; // matches the app's other FABs
const CX = DISC / 2;
const GLOW = 84; // tight, faint glow

export default function CompanionFAB({ onPress, bottom = 18, tutorialKey }: { onPress?: () => void; bottom?: number; tutorialKey?: string }) {
  const [visible, setVisible] = useState(false);
  const breath = useRef(new Animated.Value(0)).current;
  const press  = useRef(new Animated.Value(1)).current;
  const tutRef = useTutorialTarget(tutorialKey ?? 'companion_fab_unused');

  // Tier gate: present for Rooted and Exploring, hidden entirely for Not Right Now.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_settings');
        const tier = raw ? JSON.parse(raw).faithJourney : null;
        setVisible(tier !== 'notrightnow');
      } catch {
        setVisible(true);
      }
    })();
  }, []);

  // Subtle breath: a gentle swell, settle, then a long calm gap before the next one.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 700,  useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1000, useNativeDriver: true }),
        Animated.delay(2800),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (!visible) return null;

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const buttonScale = Animated.multiply(press, breathScale);
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.34] });

  const handlePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };
  const pressIn  = () => Animated.timing(press, { toValue: 0.92, duration: 80,  useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(press, { toValue: 1,    duration: 130, useNativeDriver: true }).start();

  const barW = 4;

  return (
    <View ref={tutRef} collapsable={false} pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      {/* Faint gold glow, tight around the disc, fades in and out with the breath. */}
      <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity }]}>
        <Svg width={GLOW} height={GLOW}>
          <Defs>
            <RadialGradient id="companionGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={GOLD_HI} stopOpacity="0.55" />
              <Stop offset="55%"  stopColor={GOLD_HI} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={GOLD_HI} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#companionGlow)" />
        </Svg>
      </Animated.View>

      {/* The button: gold disc + cross, breathing. */}
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          onPress={handlePress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Open Halo, the faith companion"
        >
          <Svg width={DISC} height={DISC}>
            <Circle cx={CX} cy={CX} r={DISC / 2 - 0.5} fill={GOLD} />
            <Circle cx={CX} cy={CX} r={DISC / 2 - 1.5} stroke={GOLD_HI} strokeOpacity={0.45} strokeWidth={1} fill="none" />
            {/* Cross. */}
            <Rect x={CX - barW / 2} y={CX - 11} width={barW} height={22} rx={1.5} fill={CROSS} />
            <Rect x={CX - 7}        y={CX - 6}  width={14}   height={barW} rx={1.5} fill={CROSS} />
          </Svg>
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
});
