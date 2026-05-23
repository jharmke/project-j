import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';

// ─── Global Emitter ───────────────────────────────────────────────────────────

type CelebTier = 'small' | 'medium' | 'large' | 'diamond';
type CelebPayload = { tier: CelebTier; label?: string };
type CelebListener = (payload: CelebPayload) => void;
const celebListeners: Set<CelebListener> = new Set();

export function showCelebration(tier: CelebTier, label?: string) {
  celebListeners.forEach(fn => fn({ tier, label }));
}

function subscribeCeleb(fn: CelebListener) {
  celebListeners.add(fn);
  return () => celebListeners.delete(fn);
}

// ─── Renderer (mount in _layout.tsx) ─────────────────────────────────────────

interface CelebQueued { id: number; tier: CelebTier; label?: string; }
let _celebCounter = 0;

export function CelebrationRenderer() {
  const { theme } = useTheme();
  const [queue, setQueue] = useState<CelebQueued[]>([]);

  useEffect(() => {
    return subscribeCeleb(({ tier, label }) => {
      const id = _celebCounter++;
      setQueue(prev => [...prev, { id, tier, label }]);
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
      onDismiss={() => dismiss(active.id)}
    />
  );
}

const { width: SW, height: SH } = Dimensions.get('window');
const GOLD = '#d4860a';
const WHITE = '#f0f0f0';

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

export default function CelebrationOverlay({ visible, tier, accentColor, label, onDismiss }: Props) {
  const duration = tier === 'small' ? 2200 : tier === 'medium' ? 2800 : 3500; // diamond falls through to large (4000ms planned)
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
              {label ?? (tier === 'diamond' ? 'GOAL WEIGHT' : tier === 'large' ? 'MILESTONE' : 'NICE WORK')}
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