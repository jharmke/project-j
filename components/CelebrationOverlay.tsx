import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { AchievementDef } from '../achievementData';
import { useTheme } from '../theme';

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
  return () => celebListeners.delete(fn);
}

// ─── Renderer (mount in _layout.tsx) ─────────────────────────────────────────

interface CelebQueued { id: number; tier: CelebTier; label?: string; def?: AchievementDef; }
let _celebCounter = 0;

export function CelebrationRenderer() {
  const { theme } = useTheme();
  const [queue, setQueue] = useState<CelebQueued[]>([]);

  useEffect(() => {
    return subscribeCeleb(({ tier, label, def }) => {
      const id = _celebCounter++;
      setQueue(prev => [...prev, { id, tier, label, def }]);
    });
  }, []);

  const active = queue[0] ?? null;
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
    const originX = SW / 2;
    const originY = SH * 0.42;
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
          <Animated.Text style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTransY }],
            fontSize: 12,
            fontFamily: 'DMSans_700Bold',
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
          <Animated.Text style={{
            opacity: nameOpacity,
            transform: [{ translateY: nameTransY }],
            fontSize: 44,
            fontFamily: 'BebasNeue_400Regular',
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
          <Animated.Text style={{
            opacity: subtextOpacity,
            fontSize: 11,
            fontFamily: 'DMSans_500Medium',
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
  const duration = tier === 'small' ? 2200 : tier === 'medium' ? 2800 : 3500;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Create particles synchronously so they exist on first render
  const particles = useMemo(() => {
    const count = tier === 'small' ? 60 : tier === 'medium' ? 80 : 120; // diamond falls through to large
    const freshColors = getParticleColors(accentColor);
    return Array.from({ length: count }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      color: freshColors[i % freshColors.length],
      size: tier === 'small' ? Math.random() * 5 + 3 : tier === 'medium' ? Math.random() * 6 + 3 : Math.random() * 8 + 4,
      shape: (Math.random() > 0.5 ? 'circle' : 'rect') as 'circle' | 'rect',
    }));
  }, [tier, accentColor]);

  useEffect(() => {
    if (!visible) return;
    // Diamond has its own component -- skip all legacy animation logic
    if (tier === 'diamond') return;

    // Reset all particle values before animating
    particles.forEach(p => { p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(0); p.scale.setValue(0); });

    textScale.setValue(0);
    textOpacity.setValue(0);
    pillOpacity.setValue(0);

    // Fire particles
    const fireWave = (waveParticles: Particle[], waveDelay: number) => {
      setTimeout(() => {
        const anims = waveParticles.map((p) => {
          const angle = (Math.random() * 180) * (Math.PI / 180);
          const distance = Math.random() * SH * ((tier === 'large' || tier === 'diamond') ? 1.1 : tier === 'medium' ? 0.85 : 0.65) + SH * 0.2;
          const targetX = Math.cos(angle) * (Math.random() * SW * ((tier === 'large' || tier === 'diamond') ? 1.8 : tier === 'medium' ? 1.5 : 0.8));
          const targetY = Math.sin(angle) * distance * -1;
          const delay = Math.random() * 250;
          const waveDuration = duration - waveDelay;

          return Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
              Animated.timing(p.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.timing(p.x, { toValue: targetX, duration: waveDuration - delay, useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(p.y, { toValue: targetY, duration: (waveDuration - delay) * 0.6, useNativeDriver: true }),
                Animated.timing(p.y, { toValue: targetY + 80, duration: (waveDuration - delay) * 0.4, useNativeDriver: true }),
              ]),
              Animated.sequence([
                Animated.delay((waveDuration - delay) * 0.5),
                Animated.timing(p.opacity, { toValue: 0, duration: (waveDuration - delay) * 0.5, useNativeDriver: true }),
              ]),
            ]),
          ]);
        });
        Animated.parallel(anims).start();
      }, waveDelay);
    };

    if (tier === 'large' || tier === 'diamond') {
      const third = Math.floor(particles.length / 3);
      fireWave(particles.slice(0, third), 0);
      fireWave(particles.slice(third, third * 2), 500);
      fireWave(particles.slice(third * 2), 1000);
    } else {
      const anims = particles.map((p) => {
        const angle = (Math.random() * 180) * (Math.PI / 180);
        const distance = Math.random() * SH * (tier === 'medium' ? 0.85 : 0.65) + SH * 0.2;
        const targetX = Math.cos(angle) * (Math.random() * SW * (tier === 'medium' ? 1.5 : 0.8));
        const targetY = Math.sin(angle) * distance * -1;
        const delay = Math.random() * 300;

        return Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(p.x, { toValue: targetX, duration: duration - delay, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(p.y, { toValue: targetY, duration: (duration - delay) * 0.6, useNativeDriver: true }),
              Animated.timing(p.y, { toValue: targetY + 80, duration: (duration - delay) * 0.4, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.delay((duration - delay) * 0.5),
              Animated.timing(p.opacity, { toValue: 0, duration: (duration - delay) * 0.5, useNativeDriver: true }),
            ]),
          ]),
        ]);
      });
      Animated.parallel(anims).start();
    }

    // Slam text for medium and large
    if (tier === 'medium' || tier === 'large' || tier === 'diamond') {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(textScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
          Animated.timing(textOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setTimeout(() => {
          Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
        }, duration - 600);
      }, 300);
    }

    // Dismiss pill for small/medium -- slight delay then fade in
    if (tier !== 'large') {
      pillOpacity.setValue(0);
      setTimeout(() => {
        Animated.timing(pillOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }, 400);
    }

    // Auto dismiss -- fade everything out then dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(pillOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => onDismiss?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  // Diamond has its own full-screen experience
  if (tier === 'diamond') {
    return <DiamondCelebration def={def} label={label} onDismiss={onDismiss} />;
  }

  const originX = SW / 2;
  const originY = SH * 0.85;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Particle layer -- non-interactive */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: originX,
              top: originY,
              width: p.size,
              height: p.shape === 'rect' ? p.size * 1.6 : p.size,
              borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
              backgroundColor: p.color,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
              opacity: p.opacity,
            }}
          />
        ))}

        {(tier === 'medium' || tier === 'large') && (
          <Animated.View style={{
            position: 'absolute',
            top: SH * 0.35,
            left: 0,
            right: 0,
            alignItems: 'center',
            opacity: textOpacity,
            transform: [{ scale: textScale }],
          }}>
            <Text style={{
              fontSize: tier === 'large' ? 52 : 38,
              fontFamily: 'BebasNeue_400Regular',
              color: '#ffffff',
              letterSpacing: 4,
              textShadowColor: accentColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 20,
            }}>
              {label ?? (tier === 'large' ? 'MILESTONE' : 'NICE WORK')}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Dismiss pill -- tappable, appears at 1.2s, fades in cleanly */}
      {tier !== 'large' && tier !== 'diamond' && (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: 120,
            right: 24,
            opacity: pillOpacity,
          }}>
          <TouchableOpacity
            onPress={() => onDismiss?.()}
            style={{
              backgroundColor: 'rgba(0,0,0,0.65)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}>
            <Text style={{ color: '#ffffff', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Tap to dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}