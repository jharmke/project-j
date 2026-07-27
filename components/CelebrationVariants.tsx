import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Circle as SvgCircle, Stop } from 'react-native-svg';
import { AchievementDef } from '../achievementData';
import { Type } from '../typography';

// ─────────────────────────────────────────────────────────────────────────────
// CELEBRATION PROTOTYPES -- dev tools only, nothing in the app fires these yet.
//
// Three candidate replacements for the medium/large celebration, built to be flipped between on a real
// device next to the CURRENT one. See SPEC_celebrations.md; the point of this file is that Justin picks
// by thumb, not by document.
//
// Every one of them obeys the two things that are actually settled:
//   1. NON-BLOCKING. The screen underneath stays live and tappable. This is the property Justin likes
//      about today's confetti and the reason the diamond treatment was NOT simply scaled down.
//   2. SKIPPABLE. Every variant renders a dismiss pill, including at the largest size. Today's `large`
//      is the only tier in the app you cannot skip, which already contradicts the spec.
//
// They deliberately differ in KIND, not in size -- that was the diagnosis for why medium and large never
// felt bigger than small. More particles is not more meaning.
// ─────────────────────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get('window');
const GOLD  = '#d4860a';
const WHITE = '#f0f0f0';

export type CelebVariant = 'refined' | 'badge' | 'bloom';

interface VariantProps {
  variant: CelebVariant;
  tier: 'small' | 'medium' | 'large';
  accentColor: string;
  label?: string;
  def?: AchievementDef;
  onDismiss?: () => void;
}

// A neutral dark scrim behind TEXT ONLY -- not a full-screen dim, so the screen underneath stays
// visible and usable. This exists because the current overlay paints hardcoded white text with no
// backdrop, which is invisible on Light. Deliberately neutral rather than tinted: it is a legibility
// device, not a colour choice, and colour decisions on this screen are still open.
function TextPlate({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: 'rgba(10,10,16,0.82)',
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      maxWidth: SW - 64,
    }}>
      {children}
    </View>
  );
}

function DismissPill({ opacity, onPress }: { opacity: Animated.Value; onPress: () => void }) {
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', bottom: 120, right: 24, opacity }}>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
        <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: Type.uiSemibold }}>Tap to dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function hexPath(size: number): string {
  const cx = size / 2, cy = size / 2, r = size * 0.46;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

// ─── A. REFINED CONFETTI ─────────────────────────────────────────────────────
//
// The existing concept, executed properly. The current version fires flat rectangles along a single
// arc with one duration -- everything moves together, which is what reads as "coded". This adds the
// things real confetti has: rotation, tumble, three depth planes at different sizes and speeds,
// sideways drift on the way down, and a genuine gravity arc rather than an up-then-down two-parter.

function RefinedConfetti({ tier, accentColor, label, onDismiss }: Omit<VariantProps, 'variant' | 'def'>) {
  const duration = tier === 'large' ? 3400 : tier === 'medium' ? 2800 : 2200;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(() => {
    const count = tier === 'large' ? 90 : tier === 'medium' ? 64 : 44;
    const palette = [accentColor, accentColor, accentColor, WHITE, GOLD];
    return Array.from({ length: count }, (_, i) => {
      // Three depth planes. Near pieces are bigger, faster and more opaque; far pieces are small and
      // slow. This is what gives the burst volume instead of reading as one flat sheet.
      const plane = i % 3;
      const depth = plane === 0 ? 1 : plane === 1 ? 0.72 : 0.5;
      return {
        t:       new Animated.Value(0),
        spin:    new Animated.Value(0),
        color:   palette[i % palette.length],
        w:       (Math.random() * 5 + 4) * depth,
        h:       (Math.random() * 9 + 6) * depth,
        depth,
        // Launch angle biased upward, spread across the full width of the screen.
        angle:   (-90 + (Math.random() * 150 - 75)) * (Math.PI / 180),
        power:   (Math.random() * 0.45 + 0.65) * depth,
        drift:   (Math.random() * 2 - 1) * 90,
        spinDur: Math.random() * 900 + 700,
        delay:   Math.random() * 320,
        round:   Math.random() > 0.72,
      };
    });
  }, [tier, accentColor]);

  useEffect(() => {
    pieces.forEach(p => { p.t.setValue(0); p.spin.setValue(0); });

    Animated.parallel(pieces.map(p => Animated.sequence([
      Animated.delay(p.delay),
      Animated.parallel([
        Animated.timing(p.t, { toValue: 1, duration: duration - p.delay, easing: Easing.linear, useNativeDriver: true }),
        Animated.loop(Animated.timing(p.spin, { toValue: 1, duration: p.spinDur, easing: Easing.linear, useNativeDriver: true })),
      ]),
    ]))).start();

    Animated.timing(textOpacity, { toValue: 1, duration: 320, delay: 200, useNativeDriver: true }).start();
    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 400, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(pillOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  const originX = SW / 2;
  const originY = SH * 0.82;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {pieces.map((p, i) => {
          const launch = SH * 0.85 * p.power;
          // A real parabola: t drives horizontal travel linearly while vertical is up-then-accelerating
          // -down, so each piece traces an arc instead of a V.
          const translateX = p.t.interpolate({
            inputRange:  [0, 1],
            outputRange: [0, Math.cos(p.angle) * launch * 1.1 + p.drift],
          });
          const translateY = p.t.interpolate({
            inputRange:  [0, 0.32, 1],
            outputRange: [0, Math.sin(p.angle) * launch, Math.sin(p.angle) * launch * 0.15 + SH * 0.55],
          });
          const opacity = p.t.interpolate({
            inputRange:  [0, 0.08, 0.7, 1],
            outputRange: [0, p.depth, p.depth * 0.9, 0],
          });
          const rotate = p.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
          // Squash on one axis as it spins -- a flat rectangle tumbling in 3D reads as thickness
          // without any actual 3D transform.
          const scaleX = p.spin.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.25, 1, 0.25, 1] });
          return (
            <Animated.View key={i} style={{
              position: 'absolute',
              left: originX, top: originY,
              width: p.w, height: p.round ? p.w : p.h,
              borderRadius: p.round ? p.w : 1.5,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }, { scaleX }],
            }} />
          );
        })}
      </View>

      {!!label && (
        <View style={{ position: 'absolute', top: SH * 0.34, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <Animated.View style={{ opacity: textOpacity }}>
            <TextPlate>
              <Text style={{
                fontSize: tier === 'large' ? 30 : 24,
                fontFamily: Type.uiBold,
                color: '#ffffff',
                letterSpacing: 0.5,
                textAlign: 'center',
              }}>{label}</Text>
            </TextPlate>
          </Animated.View>
        </View>
      )}

      <DismissPill opacity={pillOpacity} onPress={() => onDismiss?.()} />
    </View>
  );
}

// ─── C. THE BADGE AS HERO ────────────────────────────────────────────────────
//
// No particles at all. The achievement's own badge mints itself in the centre, a light sweep crosses
// it the way it would cross real metal, and it settles. This is the variant that would look like THIS
// app rather than a confetti library -- it speaks the same hex-and-shine language as the toast.

function BadgeHero({ tier, accentColor, label, def, onDismiss }: Omit<VariantProps, 'variant'>) {
  const duration = tier === 'large' ? 3400 : tier === 'medium' ? 2800 : 2200;
  const BADGE = tier === 'large' ? 132 : 108;

  const badgeScale   = useRef(new Animated.Value(0.55)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;
  const sweepX       = useRef(new Animated.Value(-1)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(14)).current;
  const pillOpacity  = useRef(new Animated.Value(0)).current;
  const groupOpacity = useRef(new Animated.Value(1)).current;

  const badgeTint = def?.iconColor ?? accentColor;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(badgeScale,   { toValue: 1, tension: 150, friction: 7.5, useNativeDriver: true }),
      Animated.timing(badgeOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // One expanding ring pushed out by the badge landing -- the only "effect", and it is over fast.
    Animated.sequence([
      Animated.delay(140),
      Animated.parallel([
        Animated.timing(ringScale,   { toValue: 2.1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.55, duration: 160, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0,    duration: 560, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // The shine. Crosses once, slowly, well after the badge has landed.
    Animated.sequence([
      Animated.delay(520),
      Animated.timing(sweepX, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(340),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(textY,       { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 500, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.timing(groupOpacity, { toValue: 0, duration: 420, useNativeDriver: true }).start(() => onDismiss?.());
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  const sweepTranslate = sweepX.interpolate({ inputRange: [-1, 1], outputRange: [-BADGE * 1.2, BADGE * 1.2] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: groupOpacity }]}
        pointerEvents="none">

        {/* Impact ring */}
        <Animated.View style={{
          position: 'absolute',
          width: BADGE, height: BADGE, borderRadius: BADGE / 2,
          borderWidth: 2, borderColor: accentColor,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
          marginBottom: 74,
        }} />

        {/* Badge */}
        <Animated.View style={{
          opacity: badgeOpacity,
          transform: [{ scale: badgeScale }],
          marginBottom: 26,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7,
          shadowRadius: 26,
        }}>
          <MaskedView
            style={{ width: BADGE, height: BADGE }}
            maskElement={
              <Svg width={BADGE} height={BADGE}>
                <Path d={hexPath(BADGE)} fill="#000" />
              </Svg>
            }>
            {/* Metal fill */}
            <Svg width={BADGE} height={BADGE}>
              <Defs>
                <SvgLinearGradient id="bh_fill" x1="0.2" y1="0" x2="0.8" y2="1">
                  <Stop offset="0"   stopColor={accentColor} stopOpacity="1" />
                  <Stop offset="0.55" stopColor={accentColor} stopOpacity="0.72" />
                  <Stop offset="1"   stopColor="#000000"     stopOpacity="0.35" />
                </SvgLinearGradient>
              </Defs>
              <Path d={hexPath(BADGE)} fill="url(#bh_fill)" />
            </Svg>
            {/* Light sweep, clipped to the hex by the mask */}
            <Animated.View style={{
              position: 'absolute', top: -BADGE * 0.3, bottom: -BADGE * 0.3,
              width: BADGE * 0.42,
              transform: [{ translateX: sweepTranslate }, { rotate: '18deg' }],
            }}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </MaskedView>

          {/* Rim + icon sit above the mask so the sweep never washes them out */}
          <View style={{ position: 'absolute', width: BADGE, height: BADGE }} pointerEvents="none">
            <Svg width={BADGE} height={BADGE}>
              <Path d={hexPath(BADGE)} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
            </Svg>
          </View>
          <View style={{ position: 'absolute', width: BADGE, height: BADGE, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <Ionicons name={(def?.icon ?? 'trophy') as any} size={BADGE * 0.36} color={badgeTint} />
          </View>
        </Animated.View>

        {!!label && (
          <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textY }] }}>
            <TextPlate>
              <Text style={{
                fontSize: 9, letterSpacing: 3, textTransform: 'uppercase',
                fontFamily: Type.uiBold, color: accentColor, marginBottom: 6,
              }}>Achievement Unlocked</Text>
              <Text style={{
                fontSize: tier === 'large' ? 26 : 22,
                fontFamily: Type.uiBold, color: '#ffffff', textAlign: 'center', letterSpacing: 0.4,
              }}>{label}</Text>
            </TextPlate>
          </Animated.View>
        )}
      </Animated.View>

      <DismissPill opacity={pillOpacity} onPress={() => onDismiss?.()} />
    </View>
  );
}

// ─── D. LIGHT INSTEAD OF PARTICLES ───────────────────────────────────────────
//
// No confetti, no badge. A bloom of accent light from the centre with rings pushing outward through
// it. The quietest of the three and the most "expensive-feeling" -- the risk is that on Light themes a
// glow has far less to work against than it does on Dark, which is exactly what needs judging on-device.

function LightBloom({ tier, accentColor, label, onDismiss }: Omit<VariantProps, 'variant' | 'def'>) {
  const duration = tier === 'large' ? 3200 : tier === 'medium' ? 2700 : 2100;
  const BLOOM = SW * 1.5;

  const bloomScale  = useRef(new Animated.Value(0.35)).current;
  const bloomOpac   = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale   = useRef(new Animated.Value(0.94)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  const rings = useMemo(() => [0, 1, 2].map(() => ({
    scale:   new Animated.Value(0.2),
    opacity: new Animated.Value(0),
  })), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bloomScale, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(bloomOpac, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.delay(duration - 1500),
        Animated.timing(bloomOpac, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ]).start();

    rings.forEach((r, i) => {
      Animated.sequence([
        Animated.delay(120 + i * 260),
        Animated.parallel([
          Animated.timing(r.scale,   { toValue: 2.4, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(r.opacity, { toValue: 0.5, duration: 220, useNativeDriver: true }),
            Animated.timing(r.opacity, { toValue: 0,   duration: 1280, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });

    Animated.sequence([
      Animated.delay(280),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(textScale,   { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 460, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        Animated.timing(pillOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  const cx = SW / 2;
  const cy = SH * 0.42;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Soft radial bloom */}
        <Animated.View style={{
          position: 'absolute',
          left: cx - BLOOM / 2, top: cy - BLOOM / 2,
          width: BLOOM, height: BLOOM,
          opacity: bloomOpac,
          transform: [{ scale: bloomScale }],
        }}>
          <Svg width={BLOOM} height={BLOOM}>
            <Defs>
              <RadialGradient id="lb_bloom" cx="50%" cy="50%" r="50%">
                <Stop offset="0"    stopColor={accentColor} stopOpacity="0.55" />
                <Stop offset="0.45" stopColor={accentColor} stopOpacity="0.22" />
                <Stop offset="1"    stopColor={accentColor} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <SvgCircle cx={BLOOM / 2} cy={BLOOM / 2} r={BLOOM / 2} fill="url(#lb_bloom)" />
          </Svg>
        </Animated.View>

        {/* Rings pushing outward through the bloom */}
        {rings.map((r, i) => {
          const size = SW * 0.62;
          return (
            <Animated.View key={i} style={{
              position: 'absolute',
              left: cx - size / 2, top: cy - size / 2,
              width: size, height: size, borderRadius: size / 2,
              borderWidth: 1.5, borderColor: accentColor,
              opacity: r.opacity,
              transform: [{ scale: r.scale }],
            }} />
          );
        })}
      </View>

      {!!label && (
        <View style={{ position: 'absolute', top: cy - 40, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
          <Animated.View style={{ opacity: textOpacity, transform: [{ scale: textScale }] }}>
            <TextPlate>
              <Text style={{
                fontSize: tier === 'large' ? 28 : 23,
                fontFamily: Type.uiBold,
                color: '#ffffff',
                letterSpacing: 0.5,
                textAlign: 'center',
              }}>{label}</Text>
            </TextPlate>
          </Animated.View>
        </View>
      )}

      <DismissPill opacity={pillOpacity} onPress={() => onDismiss?.()} />
    </View>
  );
}

// ─── Switchboard ─────────────────────────────────────────────────────────────

export default function CelebrationVariant({ variant, ...rest }: VariantProps) {
  if (variant === 'refined') return <RefinedConfetti {...rest} />;
  if (variant === 'badge')   return <BadgeHero {...rest} />;
  return <LightBloom {...rest} />;
}
