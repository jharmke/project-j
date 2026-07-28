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

// EXACTLY the ratio the shipped confetti uses -- 60% the user's accent, 25% off-white, 15% gold -- and
// crucially the same guard: an accent that is nearly white or nearly black cannot be the dominant colour,
// because the pieces vanish against a light theme or a dark background. An earlier version of this file
// kept the ratio and dropped the guard, which would have thrown invisible confetti at anyone on a pale
// accent. Copied rather than imported: CelebrationOverlay keeps its own private copy, and these are
// prototypes that must not perturb it.
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
function particlePalette(accent: string): string[] {
  const lum = getLuminance(accent);
  const dominant = (lum > 230 || lum < 25) ? GOLD : accent;
  return Array.from({ length: 20 }, (_, i) =>
    i < 12 ? dominant : i < 17 ? WHITE : GOLD);
}

export type CelebVariant = 'refined' | 'motes' | 'edge' | 'badge' | 'bloom';

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

function RefinedConfetti({ tier, accentColor, onDismiss }: Omit<VariantProps, 'variant' | 'def' | 'label'>) {
  const duration = tier === 'large' ? 3400 : tier === 'medium' ? 2800 : 2200;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(() => {
    const count = tier === 'large' ? 90 : tier === 'medium' ? 64 : 44;
    const palette = particlePalette(accentColor);
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

    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 400, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.timing(pillOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => onDismiss?.());
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
          // A REAL parabola, sampled. Three points gave constant speed up, an instant turn, then constant
          // speed down -- which is exactly the "hits a ceiling and drops" Justin saw. Gravity decelerates
          // into the apex and accelerates out of it, so the path is sampled at 12 points from
          // y = v0*t - 0.5*g*t^2 and the interpolation traces the curve instead of a V.
          const v0 = -Math.sin(p.angle) * launch * 4.2;   // upward launch velocity (screen units/sec)
          const g  = v0 * 2.4;                            // tuned so the fall clears the screen
          const STEPS = 12;
          const ys: number[] = [];
          const ts: number[] = [];
          for (let s = 0; s <= STEPS; s++) {
            const tt = s / STEPS;
            ts.push(tt);
            ys.push(-(v0 * tt - 0.5 * g * tt * tt));
          }
          const translateY = p.t.interpolate({ inputRange: ts, outputRange: ys });
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

      {/* No centre text. 25 of the 29 triggers fire the achievement TOAST at the same moment, and that
          toast already carries the badge, the name, the tier and the criteria. Repeating the name in the
          middle of the screen was the same information twice, simultaneously. The toast informs; this
          just makes the moment feel like something. */}
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

        {/* No centre text -- the toast already carries the name. See the note in RefinedConfetti. */}
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

      {/* No centre text -- the toast already carries the name. See the note in RefinedConfetti. */}

      <DismissPill opacity={pillOpacity} onPress={() => onDismiss?.()} />
    </View>
  );
}

// ─── RISING MOTES ────────────────────────────────────────────────────────────
//
// Soft points of light drifting UPWARD and fading, like embers or dust in a sunbeam. No gravity, no
// tumbling, no objects -- the opposite energy to confetti while doing the same job: carry the feeling and
// leave the words to the toast. Sways as it rises so it never reads as a straight line of dots.

function RisingMotes({ tier, accentColor, onDismiss }: Omit<VariantProps, 'variant' | 'def' | 'label'>) {
  const duration = tier === 'large' ? 3400 : tier === 'medium' ? 2800 : 2200;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  // The whole field fades together at the end. Motes are staggered across most of the duration and take
  // seconds to cross, so a good number are always still mid-flight when the overlay unmounts -- without
  // this they were cut off mid-rise and vanished in one frame.
  const fieldOpacity = useRef(new Animated.Value(1)).current;
  const FADE_OUT = 600;

  const motes = useMemo(() => {
    const count = tier === 'large' ? 100 : tier === 'medium' ? 68 : 42;
    const palette = particlePalette(accentColor);
    return Array.from({ length: count }, (_, i) => {
      const depth = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.75 : 0.55;
      return {
        t:      new Animated.Value(0),
        color:  palette[i % palette.length],
        size:   (Math.random() * 6 + 4) * depth,
        depth,
        startX: Math.random() * SW,
        // Travel is NOT scaled by depth. It used to be, so the smaller motes barely left the bottom of
        // the screen and the whole field bunched into the lower half. Depth belongs to size and opacity;
        // every mote should be capable of crossing the screen.
        rise:   (Math.random() * 0.45 + 0.8) * SH,
        sway:   (Math.random() * 2 - 1) * 60,
        // Staggered across the first half only, so the tail end of the field is already well on its way
        // when the fade-out starts rather than only just launching.
        delay:  Math.random() * (duration * 0.45),
        dur:    (Math.random() * 1000 + 1800),
      };
    });
  }, [tier, accentColor]);

  useEffect(() => {
    motes.forEach(m => m.t.setValue(0));
    Animated.parallel(motes.map(m => Animated.sequence([
      Animated.delay(m.delay),
      Animated.timing(m.t, { toValue: 1, duration: m.dur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]))).start();
    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 400, useNativeDriver: true }).start();

    // Start fading the field BEFORE the overlay goes, so whatever is still rising dims out on its way
    // up instead of being deleted underneath the user.
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fieldOpacity, { toValue: 0, duration: FADE_OUT, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pillOpacity,  { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, duration - FADE_OUT);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fieldOpacity }]} pointerEvents="none">
        {motes.map((m, i) => {
          const translateY = m.t.interpolate({ inputRange: [0, 1], outputRange: [0, -m.rise] });
          // Sways left then right on the way up, so the field breathes instead of marching.
          const translateX = m.t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, m.sway, m.sway * 0.3] });
          // Holds full brightness most of the way up rather than fading from a third of the way in --
          // the earlier curve made an already-sparse field look like it was dying before it arrived.
          const opacity = m.t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, m.depth, m.depth * 0.9, 0] });
          const scale = m.t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.5, 1, 0.85] });
          return (
            <Animated.View key={i} style={{
              position: 'absolute',
              // Starts just off the bottom edge so motes drift INTO frame instead of appearing in it.
              left: m.startX, top: SH * 1.02,
              width: m.size, height: m.size, borderRadius: m.size,
              backgroundColor: m.color,
              shadowColor: m.color, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1, shadowRadius: m.size * 2.2,
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            }} />
          );
        })}
      </Animated.View>
      <DismissPill opacity={pillOpacity} onPress={() => onDismiss?.()} />
    </View>
  );
}

// ─── EDGE BLOOM ──────────────────────────────────────────────────────────────
//
// The screen's edges glow and fade. Nothing in the middle at all, so it can never sit on top of whatever
// you were reading -- the most restrained of the options, and the only one that leaves the content
// completely untouched. Four gradient bands rather than one big overlay, so the centre stays perfectly
// clear instead of being tinted.

function EdgeBloom({ tier, accentColor, onDismiss }: Omit<VariantProps, 'variant' | 'def' | 'label'>) {
  const duration = tier === 'large' ? 2600 : tier === 'medium' ? 2200 : 1700;
  const depth = tier === 'large' ? 190 : tier === 'medium' ? 150 : 110;
  const peak = tier === 'large' ? 0.85 : tier === 'medium' ? 0.7 : 0.55;

  const glow = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Two pulses on the big tiers, one on small -- a heartbeat rather than a single flash, which is what
    // keeps it from reading as a screenshot flare.
    const pulse = (to: number, ms: number) =>
      Animated.timing(glow, { toValue: to, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const seq = tier === 'small'
      ? [pulse(peak, 420), pulse(0, duration - 420)]
      : [pulse(peak, 380), pulse(peak * 0.45, 420), pulse(peak * 0.9, 380), pulse(0, duration - 1180)];
    Animated.sequence(seq).start();
    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }).start();

    const timer = setTimeout(() => {
      Animated.timing(pillOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onDismiss?.());
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  const band = (key: string, style: any, start: { x: number; y: number }, end: { x: number; y: number }) => (
    <Animated.View key={key} style={[{ position: 'absolute', opacity: glow }, style]}>
      <LinearGradient
        colors={[accentColor, 'rgba(0,0,0,0)']}
        start={start}
        end={end}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {band('top',    { top: 0, left: 0, right: 0, height: depth },   { x: 0.5, y: 0 }, { x: 0.5, y: 1 })}
        {band('bottom', { bottom: 0, left: 0, right: 0, height: depth }, { x: 0.5, y: 1 }, { x: 0.5, y: 0 })}
        {band('left',   { top: 0, bottom: 0, left: 0, width: depth * 0.8 }, { x: 0, y: 0.5 }, { x: 1, y: 0.5 })}
        {band('right',  { top: 0, bottom: 0, right: 0, width: depth * 0.8 }, { x: 1, y: 0.5 }, { x: 0, y: 0.5 })}
      </View>
      <DismissPill opacity={pillOpacity} onPress={() => onDismiss?.()} />
    </View>
  );
}

// ─── Switchboard ─────────────────────────────────────────────────────────────

export default function CelebrationVariant({ variant, ...rest }: VariantProps) {
  if (variant === 'refined') return <RefinedConfetti {...rest} />;
  if (variant === 'motes')   return <RisingMotes {...rest} />;
  if (variant === 'edge')    return <EdgeBloom {...rest} />;
  if (variant === 'badge')   return <BadgeHero {...rest} />;
  return <LightBloom {...rest} />;
}
