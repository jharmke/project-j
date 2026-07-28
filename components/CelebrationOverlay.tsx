import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { AchievementDef } from '../achievementData';
import { setCelebrationActive } from '../utils/assistantFab';
import { useTheme } from '../theme';
import { Type } from '../typography';

// ─── Global Emitter ───────────────────────────────────────────────────────────

type CelebTier = 'small' | 'medium' | 'large' | 'diamond';
type CelebPayload = { tier: CelebTier; label?: string; def?: AchievementDef };
type CelebListener = (payload: CelebPayload) => void;
const celebListeners: Set<CelebListener> = new Set();

export function showCelebration(tier: CelebTier, label?: string, def?: AchievementDef) {
  celebListeners.forEach(fn => fn({ tier, label, def }));
}

function subscribeCeleb(fn: CelebListener) {
  celebListeners.add(fn);
  return () => { celebListeners.delete(fn); };
}

// ─── Renderer (mount in _layout.tsx) ─────────────────────────────────────────

interface CelebQueued { id: number; tier: CelebTier; label?: string; def?: AchievementDef; }
let _celebCounter = 0;

export function CelebrationRenderer({ hold = false }: { hold?: boolean }) {
  const { theme } = useTheme();
  const [queue, setQueue] = useState<CelebQueued[]>([]);

  useEffect(() => {
    return subscribeCeleb(({ tier, label, def }) => {
      const id = _celebCounter++;
      setQueue(prev => [...prev, { id, tier, label, def }]);
    });
  }, []);

  // While `hold` is true (the launch splash is still up on a cold start), keep enqueuing but render
  // NOTHING, so a celebration's confetti/text never plays hidden behind the splash. The queued
  // celebration plays in full the moment the splash finishes and hold flips false. Mirrors the
  // AchievementToastRenderer hold.
  const active = hold ? null : (queue[0] ?? null);
  const dismiss = (id: number) => setQueue(prev => prev.filter(c => c.id !== id));

  if (!active) return null;

  return (
    <CelebrationOverlay
      key={active.id}
      visible={true}
      tier={active.tier}
      accentColor={theme.accentBlueRaw}
      label={active.label}
      def={active.def}
      onDismiss={() => dismiss(active.id)}
    />
  );
}

const { width: SW, height: SH } = Dimensions.get('window');
const GOLD = '#d4860a';
const WHITE = '#f0f0f0';

// ─── Diamond Hex Path ─────────────────────────────────────────────────────────

function hexPath(size: number): string {
  const cx = size / 2, cy = size / 2, r = size * 0.46;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

// ─── Diamond Celebration ──────────────────────────────────────────────────────

const BADGE_SIZE     = 140;
const D_BLUE         = '#7dd3fc';
const D_LIGHT        = '#e0f2fe';
const D_MID          = '#38bdf8';
const DIAMOND_DUR    = 5200;

function DiamondCelebration({ def, label, onDismiss }: {
  def?: AchievementDef;
  label?: string;
  onDismiss?: () => void;
}) {
  const router = useRouter();

  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const badgeScale      = useRef(new Animated.Value(0)).current;
  const badgeOpacity    = useRef(new Animated.Value(0)).current;
  const titleTransY     = useRef(new Animated.Value(-28)).current;
  const titleOpacity    = useRef(new Animated.Value(0)).current;
  const nameTransY      = useRef(new Animated.Value(20)).current;
  const nameOpacity     = useRef(new Animated.Value(0)).current;
  const subtextOpacity  = useRef(new Animated.Value(0)).current;
  const glowScale       = useRef(new Animated.Value(1)).current;
  const rotateAnim      = useRef(new Animated.Value(0)).current;

  const particles = useMemo(() => {
    const colors = [D_BLUE, D_LIGHT, D_MID, '#ffffff', D_BLUE, D_BLUE, '#bae6fd'];
    return Array.from({ length: 120 }, (_, i) => ({
      x:       new Animated.Value(0),
      y:       new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0),
      color:   colors[i % colors.length],
      size:    Math.random() * 7 + 3,
      shape:   (Math.random() > 0.4 ? 'circle' : 'rect') as 'circle' | 'rect',
    }));
  }, []);

  const justDismiss = () => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 380, useNativeDriver: true })
      .start(() => onDismiss?.());
  };

  const dismissAndNavigate = () => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 380, useNativeDriver: true })
      .start(() => { onDismiss?.(); router.push('/achievements'); });
  };

  useEffect(() => {
    // Reset
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0); });

    // 1. Dark overlay fades in
    Animated.timing(overlayOpacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();

    // 2. Badge pops in at 220ms
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(badgeScale,   { toValue: 1, tension: 180, friction: 7, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
      ).start();
      Animated.loop(Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.15, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.0,  duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }, 220);

    // 3. Title slams down at 380ms
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(titleTransY,   { toValue: 0, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(titleOpacity,  { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    }, 380);

    // 4. Name fades up at 580ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(nameTransY,  { toValue: 0, tension: 120, friction: 9, useNativeDriver: true }),
      ]).start();
    }, 580);

    // 5. Tap hint at 820ms
    setTimeout(() => {
      Animated.timing(subtextOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }, 820);

    // 6. Particles burst from badge center in all 360 degrees -- 3 waves
    const WAVE    = 40;
    const fireWave = (waveParts: typeof particles, waveDelay: number) => {
      setTimeout(() => {
        Animated.parallel(waveParts.map(p => {
          const angle   = Math.random() * Math.PI * 2;
          const dist    = Math.random() * SH * 0.55 + SH * 0.12;
          const targetX = Math.cos(angle) * dist;
          const targetY = Math.sin(angle) * dist;
          const d       = Math.random() * 200;
          const dur     = DIAMOND_DUR - waveDelay - 600;
          return Animated.sequence([
            Animated.delay(d),
            Animated.parallel([
              Animated.timing(p.opacity, { toValue: 0.9, duration: 120, useNativeDriver: true }),
              Animated.timing(p.scale,   { toValue: 1,   duration: 180, useNativeDriver: true }),
              Animated.timing(p.x,       { toValue: targetX, duration: dur - d, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(p.y, { toValue: targetY,      duration: (dur - d) * 0.55, useNativeDriver: true }),
                Animated.timing(p.y, { toValue: targetY + 60, duration: (dur - d) * 0.45, useNativeDriver: true }),
              ]),
              Animated.sequence([
                Animated.delay((dur - d) * 0.45),
                Animated.timing(p.opacity, { toValue: 0, duration: (dur - d) * 0.55, useNativeDriver: true }),
              ]),
            ]),
          ]);
        })).start();
      }, waveDelay);
    };
    fireWave(particles.slice(0, WAVE),          300);
    fireWave(particles.slice(WAVE, WAVE * 2),   700);
    fireWave(particles.slice(WAVE * 2),         1100);
    // No auto-dismiss -- user controls when to leave
  }, []);

  const rotate   = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const originX  = SW / 2;
  const originY  = SH * 0.42;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Layer 1: Dark overlay -- tap to just dismiss, stay where you are */}
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={justDismiss} activeOpacity={1}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,8,28,0.90)', opacity: overlayOpacity }]} />
      </TouchableOpacity>

      {/* Layer 2: Ice-blue particle burst -- non-interactive */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.View key={i} style={{
            position: 'absolute',
            left: originX,
            top:  originY,
            width:  p.size,
            height: p.shape === 'rect' ? p.size * 1.6 : p.size,
            borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
            backgroundColor: p.color,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
            opacity: p.opacity,
          }} />
        ))}
      </View>

      {/* Layer 3: Content -- tap badge/text to dismiss + go to achievements */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="box-none">
        <TouchableOpacity onPress={dismissAndNavigate} activeOpacity={0.9} style={{ alignItems: 'center' }}>

          {/* DIAMOND ACHIEVEMENT header */}
          <Animated.Text allowFontScaling={false} style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTransY }],
            fontSize: 12,
            fontFamily: Type.uiBold,
            letterSpacing: 4,
            color: D_BLUE,
            textTransform: 'uppercase',
            marginBottom: 28,
          }}>
            DIAMOND ACHIEVEMENT
          </Animated.Text>

          {/* Badge */}
          <Animated.View style={{ opacity: badgeOpacity, transform: [{ scale: badgeScale }], marginBottom: 28 }}>
            {/* Pulsing glow halo */}
            <Animated.View style={{
              position: 'absolute',
              width:  BADGE_SIZE * 1.6,
              height: BADGE_SIZE * 1.6,
              borderRadius: BADGE_SIZE,
              top:  -(BADGE_SIZE * 0.3),
              left: -(BADGE_SIZE * 0.3),
              shadowColor: D_BLUE,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: 48,
              transform: [{ scale: glowScale }],
            }} />
            {/* Rotating shimmer border */}
            <Animated.View style={{
              position: 'absolute',
              width:  BADGE_SIZE,
              height: BADGE_SIZE,
              transform: [{ rotate }],
            }}>
              <Svg width={BADGE_SIZE} height={BADGE_SIZE}>
                <Defs>
                  <SvgLinearGradient id="d_rot" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0"   stopColor="#ffffff" stopOpacity="1"   />
                    <Stop offset="0.4" stopColor={D_BLUE}  stopOpacity="0.55" />
                    <Stop offset="1"   stopColor="#ffffff" stopOpacity="0.0" />
                  </SvgLinearGradient>
                </Defs>
                <Path d={hexPath(BADGE_SIZE)} fill="none" stroke="url(#d_rot)" strokeWidth={3} />
              </Svg>
            </Animated.View>
            {/* Filled hex */}
            <Svg width={BADGE_SIZE} height={BADGE_SIZE}>
              <Defs>
                <SvgLinearGradient id="d_fill" x1="0.5" y1="0" x2="0.5" y2="1">
                  <Stop offset="0" stopColor={D_LIGHT} stopOpacity="1" />
                  <Stop offset="1" stopColor={D_MID}   stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Path d={hexPath(BADGE_SIZE)} fill="url(#d_fill)" />
              <Path d={hexPath(BADGE_SIZE)} fill="none" stroke="rgba(224,242,254,0.8)" strokeWidth={2} />
            </Svg>
            {/* Icon */}
            <View style={{
              position: 'absolute', width: BADGE_SIZE, height: BADGE_SIZE,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={(def?.icon ?? 'trophy') as any} size={BADGE_SIZE * 0.38} color="#ffffff" />
            </View>
          </Animated.View>

          {/* Achievement name */}
          <Animated.Text allowFontScaling={false} style={{
            opacity: nameOpacity,
            transform: [{ translateY: nameTransY }],
            fontSize: 44,
            fontFamily: Type.num,
            color: '#ffffff',
            letterSpacing: 3,
            textShadowColor: D_BLUE,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 18,
            marginBottom: 8,
            textAlign: 'center',
            paddingHorizontal: 32,
          }}>
            {def?.name ?? label ?? 'ACHIEVEMENT'}
          </Animated.Text>

          {/* Tap hint */}
          <Animated.Text allowFontScaling={false} style={{
            opacity: subtextOpacity,
            fontSize: 11,
            fontFamily: Type.uiMedium,
            letterSpacing: 2,
            color: D_BLUE,
            textTransform: 'uppercase',
          }}>
            Tap badge to view achievement
          </Animated.Text>

        </TouchableOpacity>
      </View>
    </View>
  );
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getParticleColors(accent: string): string[] {
  const lum = getLuminance(accent);
  const dominant = (lum > 230 || lum < 25) ? GOLD : accent;
  const colors: string[] = [];
  const total = 20;
  for (let i = 0; i < total; i++) {
    if (i < total * 0.6) colors.push(dominant);
    else if (i < total * 0.85) colors.push(WHITE);
    else colors.push(GOLD);
  }
  return colors;
}

interface Props {
  visible: boolean;
  tier: CelebTier;
  accentColor: string;
  label?: string;
  def?: AchievementDef;
  onDismiss?: () => void;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  shape: 'circle' | 'rect';
}

export default function CelebrationOverlay({ visible, tier, accentColor, label, def, onDismiss }: Props) {
  const duration = tier === 'small' ? 2200 : tier === 'medium' ? 2800 : 3400;
  const pillOpacity  = useRef(new Animated.Value(0)).current;
  // The whole field fades together at the end. Motes are staggered and take seconds to cross, so some
  // are always still mid-flight when the overlay unmounts -- without this they were cut off mid-rise and
  // vanished in a single frame.
  const fieldOpacity = useRef(new Animated.Value(1)).current;
  const FADE_OUT = 600;

  const motes = useMemo(() => {
    const count = tier === 'small' ? 42 : tier === 'medium' ? 68 : 100;
    const palette = getParticleColors(accentColor);
    return Array.from({ length: count }, (_, i) => {
      const depth = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.75 : 0.55;
      return {
        t:      new Animated.Value(0),
        color:  palette[i % palette.length],
        size:   (Math.random() * 6 + 4) * depth,
        depth,
        startX: Math.random() * SW,
        // Travel is NOT scaled by depth -- doing that kept the smaller motes pinned to the bottom of the
        // screen and bunched the whole field into the lower half. Depth belongs to size and opacity.
        rise:   (Math.random() * 0.45 + 0.8) * SH,
        sway:   (Math.random() * 2 - 1) * 60,
        delay:  Math.random() * (duration * 0.45),
        dur:    (Math.random() * 1000 + 1800),
      };
    });
  }, [tier, accentColor]);

  // Hide the floating assistant button, DIAMOND ONLY. Diamond is the one tier that dims the screen and
  // takes it over, so a lit FAB on top of it is wrong. small/medium/large deliberately float over a
  // live, still-usable screen -- every other FAB stays put there, so hiding this one would be the odd
  // one out. Unwinds on unmount so an early dismiss still restores the button.
  useEffect(() => {
    if (!visible || tier !== 'diamond') return;
    setCelebrationActive(true);
    return () => setCelebrationActive(false);
  }, [visible, tier]);

  useEffect(() => {
    if (!visible || tier === 'diamond') return;   // diamond has its own component

    motes.forEach(m => m.t.setValue(0));
    fieldOpacity.setValue(1);
    pillOpacity.setValue(0);

    Animated.parallel(motes.map(m => Animated.sequence([
      Animated.delay(m.delay),
      Animated.timing(m.t, { toValue: 1, duration: m.dur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]))).start();

    Animated.timing(pillOpacity, { toValue: 1, duration: 400, delay: 400, useNativeDriver: true }).start();

    // Starts the fade BEFORE the overlay goes, so whatever is still rising dims out on its way up.
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fieldOpacity, { toValue: 0, duration: FADE_OUT, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pillOpacity,  { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, duration - FADE_OUT);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  // Diamond has its own full-screen experience
  if (tier === 'diamond') {
    return <DiamondCelebration def={def} label={label} onDismiss={onDismiss} />;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fieldOpacity }]} pointerEvents="none">
        {motes.map((m, i) => {
          const translateY = m.t.interpolate({ inputRange: [0, 1], outputRange: [0, -m.rise] });
          // Sways left then settles, so the field breathes instead of marching straight up.
          const translateX = m.t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, m.sway, m.sway * 0.3] });
          const opacity = m.t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, m.depth, m.depth * 0.9, 0] });
          const scale = m.t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.5, 1, 0.85] });
          return (
            <Animated.View key={i} style={{
              position: 'absolute',
              // Just off the bottom edge, so motes drift INTO frame rather than appearing in it.
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

      {/* NO CENTRE TEXT. 25 of the 29 triggers fire the achievement TOAST at the same moment, and that
          toast already carries the badge, the name, the tier and what you did. Printing the name in the
          middle of the screen as well was the same information twice, simultaneously -- and it was the
          bit that was illegible on Light, because it was hardcoded white with no backdrop. The toast
          informs; this just makes the moment feel like something. */}

      {/* Dismiss pill on EVERY tier now. `large` used to be the only one you could not skip, which was
          46 achievements' worth of celebration you had to sit through. */}
      <Animated.View
        pointerEvents="box-none"
        style={{ position: 'absolute', bottom: 120, right: 24, opacity: pillOpacity }}>
        <TouchableOpacity
          onPress={() => onDismiss?.()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: Type.uiSemibold }}>Tap to dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
