import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { AchievementDef, AchievementDisplayTier } from '../achievementData';
import { useTheme } from '../theme';

const CARD_WIDTH = 280;
const CARD_HEIGHT = 72;
const OFFSCREEN = CARD_WIDTH + 60;

// ─── Global Event Emitter ─────────────────────────────────────────────────────

type Listener = (def: AchievementDef) => void;
const listeners: Set<Listener> = new Set();

export function showAchievementToast(def: AchievementDef) {
  console.log('showAchievementToast global called', def.name, 'listeners:', listeners.size);
  listeners.forEach(fn => fn(def));
}

function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Tier Config ──────────────────────────────────────────────────────────────

interface TierConfig {
  label: string;
  badgeColor: string;
  badgeColorDark: string;
  borderColor: string;
  glowColor: string;
  iconColor: string;
  leftBorderColor: string;
}

const TIER_CONFIG: Record<AchievementDisplayTier, TierConfig> = {
  bronze: {
    label:           'Bronze',
    badgeColor:      '#cd7f32',
    badgeColorDark:  '#8b5220',
    borderColor:     'rgba(205,127,50,0.5)',
    glowColor:       'rgba(205,127,50,0.4)',
    iconColor:       '#fff8f0',
    leftBorderColor: '#cd7f32',
  },
  silver: {
    label:           'Silver',
    badgeColor:      '#a8a8c0',
    badgeColorDark:  '#6a6a88',
    borderColor:     'rgba(168,168,192,0.5)',
    glowColor:       'rgba(168,168,192,0.4)',
    iconColor:       '#ffffff',
    leftBorderColor: '#a8a8c0',
  },
  gold: {
    label:           'Gold',
    badgeColor:      '#d4860a',
    badgeColorDark:  '#8a5200',
    borderColor:     'rgba(212,134,10,0.5)',
    glowColor:       'rgba(212,134,10,0.5)',
    iconColor:       '#fff8e0',
    leftBorderColor: '#d4860a',
  },
  platinum: {
    label:           'Platinum',
    badgeColor:      '#bfdbfe',
    badgeColorDark:  '#60a5c8',
    borderColor:     'rgba(191,219,254,0.6)',
    glowColor:       'rgba(191,219,254,0.6)',
    iconColor:       '#ffffff',
    leftBorderColor: '#93c5fd',
  },
};

function getDisplayTier(def: AchievementDef): AchievementDisplayTier {
  if (def.displayTier) return def.displayTier;
  if (def.tier === 'small')  return 'bronze';
  if (def.tier === 'medium') return 'silver';
  return 'gold';
}

// ─── Hex Path ─────────────────────────────────────────────────────────────────

function hexPath(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.46;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

// ─── Mini Hex Badge ───────────────────────────────────────────────────────────

function MiniHexBadge({ def, size = 44 }: { def: AchievementDef; size?: number }) {
  const tier   = getDisplayTier(def);
  const config = TIER_CONFIG[tier];
  const isPlat = tier === 'platinum';
  const gradId = `toast_grad_${def.id}`;

  const rotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isPlat) return;
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size * 0.85, height: size * 0.85, borderRadius: size,
        shadowColor: config.glowColor, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isPlat ? 1.0 : 0.8, shadowRadius: isPlat ? 12 : 8,
      }} pointerEvents="none" />
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={config.badgeColor}     stopOpacity="1" />
            <Stop offset="1" stopColor={config.badgeColorDark} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Path d={hexPath(size)} fill={`url(#${gradId})`} />
        <Path d={hexPath(size)} fill="none" stroke={config.borderColor} strokeWidth={1.5} />
      </Svg>
      {isPlat && (
        <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }} pointerEvents="none">
          <Svg width={size} height={size}>
            <Defs>
              <SvgLinearGradient id={`plat_b_${def.id}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.9" />
                <Stop offset="0.4" stopColor="#bfdbfe" stopOpacity="0.5" />
                <Stop offset="1"   stopColor="#ffffff" stopOpacity="0.0" />
              </SvgLinearGradient>
            </Defs>
            <Path d={hexPath(size)} fill="none" stroke={`url(#plat_b_${def.id})`} strokeWidth={2} />
          </Svg>
        </Animated.View>
      )}
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Ionicons name={def.icon as any} size={size * 0.36} color={config.iconColor} />
      </View>
    </View>
  );
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────

function ShimmerOverlay({ trigger }: { trigger: boolean }) {
  const shimmerX       = useRef(new Animated.Value(-CARD_WIDTH)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    shimmerX.setValue(-CARD_WIDTH);
    shimmerOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(shimmerOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(shimmerX, { toValue: CARD_WIDTH * 1.5, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(shimmerOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      shimmerX.setValue(-CARD_WIDTH);
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(shimmerOpacity, { toValue: 0.7, duration: 80, useNativeDriver: true }),
          Animated.timing(shimmerX, { toValue: CARD_WIDTH * 1.5, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(shimmerOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
      }, 180);
    });
  }, [trigger]);

  return (
    <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 60, opacity: shimmerOpacity, transform: [{ translateX: shimmerX }] }} pointerEvents="none">
      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ skewX: '-20deg' }] }} />
    </Animated.View>
  );
}

// ─── Toast Card ───────────────────────────────────────────────────────────────

function ToastCard({ def, onDone }: { def: AchievementDef; onDone: () => void }) {
  const { theme } = useTheme();
  const tier   = getDisplayTier(def);
  const config = TIER_CONFIG[tier];
  const isPlat = tier === 'platinum';

  const slideX         = useRef(new Animated.Value(OFFSCREEN)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const badgeScale     = useRef(new Animated.Value(0.5)).current;
  const badgeOpacity   = useRef(new Animated.Value(0)).current;
  const labelOpacity   = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(8)).current;
  const nameOpacity    = useRef(new Animated.Value(0)).current;
  const [shimmerTrigger, setShimmerTrigger] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.spring(slideX, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(badgeScale,   { toValue: 1, tension: 180, friction: 6, useNativeDriver: true }),
        Animated.timing(badgeOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(labelOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(nameOpacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(nameTranslateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]).start();
        }, 80);
        setTimeout(() => setShimmerTrigger(true), 380);
      });
    });

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(slideX, { toValue: OFFSCREEN, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => onDone());
    }, 4200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateX: slideX }], opacity: cardOpacity }} pointerEvents="none">
      <View style={[styles.card, {
        backgroundColor: isPlat ? 'rgba(18,25,55,0.97)' : 'rgba(15,15,20,0.96)',
        borderColor: config.borderColor,
        shadowColor: config.glowColor,
        shadowOpacity: isPlat ? 0.7 : 0.5,
        shadowRadius: isPlat ? 20 : 14,
      }]}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: config.leftBorderColor, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }} />
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
          <ShimmerOverlay trigger={shimmerTrigger} />
        </View>
        <View style={styles.content}>
          <Animated.View style={{ transform: [{ scale: badgeScale }], opacity: badgeOpacity, marginLeft: 14, marginRight: 12 }}>
            <MiniHexBadge def={def} size={44} />
          </Animated.View>
          <View style={{ flex: 1, justifyContent: 'center', paddingRight: 14 }}>
            <Animated.Text style={[styles.label, { color: config.badgeColor, opacity: labelOpacity }]}>
              ACHIEVEMENT UNLOCKED
            </Animated.Text>
            <Animated.Text style={[styles.name, { color: '#ffffff', opacity: nameOpacity, transform: [{ translateY: nameTranslateY }] }]}>
              {def.name}
            </Animated.Text>
            <Animated.Text style={[styles.tier, { color: theme.textMuted, opacity: labelOpacity }]}>
              {config.label}
            </Animated.Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

interface QueuedToast { id: number; def: AchievementDef; }
let _counter = 0;

export function AchievementToastRenderer() {
  const [queue, setQueue] = useState<QueuedToast[]>([]);

  useEffect(() => {
    const unsub = subscribe((def) => {
      console.log('AchievementToastRenderer received', def.name);
      const id = _counter++;
      setQueue(prev => [...prev, { id, def }]);
    });
    return () => { unsub(); };
  }, []);

  const dismiss = (id: number) => setQueue(prev => prev.filter(t => t.id !== id));
  const active  = queue[0] ?? null;

  return (
    <View style={styles.renderer} pointerEvents="none">
      {active && <ToastCard key={active.id} def={active.def} onDone={() => dismiss(active.id)} />}
    </View>
  );
}

// No-op provider -- keeps _layout.tsx import working
export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Hook -- now just returns the global function
export function useAchievementToast() {
  return { showAchievementToast };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  renderer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 16,
    zIndex: 99999,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 8,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  tier: {
    fontSize: 9,
    fontFamily: 'DMSans_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
