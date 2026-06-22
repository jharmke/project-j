import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Condensed app-open cinematic. Replicates the sign-in logo treatment (full-width
// logo + top/bottom gradient fades that melt the logo's edges into the dark bg, so
// there is no hard square) but quicker, and fades out into the Home tab underneath.
// bg matches the native splash (#0a0a0e) so the hand-off blends.
const BG = '#0a0a0e';
const SCREEN_W = Dimensions.get('window').width;

export default function LaunchSplash({ onDone }: { onDone: () => void }) {
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(logoScale,   { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: BG, opacity: overlayOpacity, alignItems: 'center', justifyContent: 'center', zIndex: 9999 }]}
    >
      <Animated.View style={{ width: SCREEN_W, height: SCREEN_W, opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
        <LinearGradient colors={[BG, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100 }} />
        <LinearGradient colors={['transparent', BG]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 }} />
      </Animated.View>
    </Animated.View>
  );
}
