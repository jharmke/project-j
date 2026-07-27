import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react'; // useRef used in PlatinumAnimatedBorder and PlatinumGlow
import { Animated, Easing, LayoutAnimation, Platform, ScrollView, StyleSheet, TouchableOpacity, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import {
  ACHIEVEMENTS,
  AchievementDef,
  AchievementDisplayTier,
  AchievementsStore,
  loadAchievements,
  DailyGoalCounts,
  DailyGoalId,
  DEFAULT_DAILY_GOAL_COUNTS,
  loadGoalHitCounts,
} from '../achievementData';
import { loadProgressValues } from '../utils/achievementProgress';
import { useTheme } from '../theme';
import { Type, numLine, PAGE_TITLE } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import ButtonShine from '../components/ButtonShine';
import GradientTitle from '../components/GradientTitle';
import GradientNumber from '../components/GradientNumber';

// ─── Tier Config ──────────────────────────────────────────────────────────────

interface TierConfig {
  label: string;
  badgeColor: string;       // main fill
  badgeColorDark: string;   // inner gradient darker stop
  borderColor: string;
  glowColor: string;
  iconColor: string;
}

const TIER_CONFIG: Record<AchievementDisplayTier, TierConfig> = {
  // Copper, not amber. The old bronze sat within a few degrees of gold's hue and the two tiers were
  // indistinguishable side by side. Pushed redder and darker so bronze reads as the lower metal.
  // Kept in lockstep with TIER_CONFIG in AchievementToast.
  bronze: {
    label: 'Bronze',
    badgeColor:     '#b26a3c',
    badgeColorDark: '#6b3a1d',
    borderColor:    'rgba(178,106,60,0.6)',
    glowColor:      'rgba(178,106,60,0.35)',
    iconColor:      '#fff8f0',
  },
  silver: {
    label: 'Silver',
    badgeColor:     '#a8a8c0',
    badgeColorDark: '#6a6a88',
    borderColor:    'rgba(168,168,192,0.6)',
    glowColor:      'rgba(168,168,192,0.35)',
    iconColor:      '#ffffff',
  },
  gold: {
    label: 'Gold',
    badgeColor:     '#d4860a',
    badgeColorDark: '#8a5200',
    borderColor:    'rgba(212,134,10,0.6)',
    glowColor:      'rgba(212,134,10,0.40)',
    iconColor:      '#fff8e0',
  },
  // Cool silver-white, no blue. Kept in lockstep with TIER_CONFIG in AchievementToast -- platinum has
  // to be the same metal in both places or the badge and its toast look like two different tiers.
  platinum: {
    label: 'Platinum',
    badgeColor:     '#e8edf2',
    badgeColorDark: '#8f9bab',
    borderColor:    'rgba(232,237,242,0.7)',
    glowColor:      'rgba(232,237,242,0.45)',
    iconColor:      '#ffffff',
  },
  diamond: {
    label: 'Diamond',
    badgeColor:     '#e0f2fe',
    badgeColorDark: '#38bdf8',
    borderColor:    'rgba(224,242,254,0.85)',
    glowColor:      'rgba(224,242,254,0.55)',
    iconColor:      '#ffffff',
  },
};

// Derive display tier from def
function getDisplayTier(def: AchievementDef): AchievementDisplayTier {
  if (def.displayTier) return def.displayTier;
  if (def.tier === 'small')   return 'bronze';
  if (def.tier === 'medium')  return 'silver';
  if (def.tier === 'diamond') return 'diamond';
  return 'gold';
}

// ─── Hexagon Path ─────────────────────────────────────────────────────────────
// Flat-top hexagon centered in a square of given size

function hexPath(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.46; // slight inset from edge
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

// ─── Platinum Animated Border ─────────────────────────────────────────────────

function PlatinumAnimatedBorder({ size }: { size: number }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // We fake a rotating border by overlaying a thin ring that has a gradient shimmer
  // Implemented as a subtle rotating opacity overlay on the hex outline
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: [{ rotate }],
      }}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="plat_border" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0"   stopColor="#ffffff" stopOpacity="0.9" />
            <Stop offset="0.3" stopColor="#bfdbfe" stopOpacity="0.6" />
            <Stop offset="0.6" stopColor="#60a5fa" stopOpacity="0.2" />
            <Stop offset="1"   stopColor="#ffffff" stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={hexPath(size)}
          fill="none"
          stroke="url(#plat_border)"
          strokeWidth={2.5}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Platinum Breathing Glow ──────────────────────────────────────────────────

function PlatinumGlow({ size }: { size: number }) {
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        opacity: glowAnim,
      }}
      pointerEvents="none"
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="plat_glow" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0"   stopColor="#e0f2fe" stopOpacity="0.5" />
            <Stop offset="0.5" stopColor="#bfdbfe" stopOpacity="0.3" />
            <Stop offset="1"   stopColor="#93c5fd" stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={hexPath(size)} fill="url(#plat_glow)" />
      </Svg>
    </Animated.View>
  );
}

// ─── Hex Badge ────────────────────────────────────────────────────────────────

interface HexBadgeProps {
  def: AchievementDef;
  unlocked: boolean;
  size?: number;
}

function HexBadge({ def, unlocked, size = 64 }: HexBadgeProps) {
  const tier    = getDisplayTier(def);
  const config  = TIER_CONFIG[tier];
  const isPlat  = tier === 'platinum' || tier === 'diamond';
  const gradId  = `grad_${def.id}`;
  const lockId  = `lock_${def.id}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Unlocked fill gradient */}
          <SvgLinearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0"   stopColor={unlocked ? config.badgeColor     : '#2a2a3a'} stopOpacity="1" />
            <Stop offset="1"   stopColor={unlocked ? config.badgeColorDark : '#1a1a28'} stopOpacity="1" />
          </SvgLinearGradient>
          {/* Locked mystery gradient -- slightly lighter than bg */}
          <SvgLinearGradient id={lockId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={isPlat ? '#2a3060' : '#252535'} stopOpacity="1" />
            <Stop offset="1" stopColor={isPlat ? '#1a2040' : '#18182a'} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        {/* Main hex fill */}
        <Path
          d={hexPath(size)}
          fill={`url(#${unlocked ? gradId : lockId})`}
        />
        {/* Border */}
        <Path
          d={hexPath(size)}
          fill="none"
          stroke={unlocked ? config.borderColor : (isPlat ? 'rgba(100,120,200,0.4)' : 'rgba(255,255,255,0.08)')}
          strokeWidth={unlocked ? 1.5 : 1}
        />
      </Svg>

      {/* Platinum effects -- only when unlocked */}
      {isPlat && unlocked && <PlatinumAnimatedBorder size={size} />}
      {isPlat && unlocked && <PlatinumGlow size={size} />}

      {/* Outer glow shadow when unlocked */}
      {unlocked && (
        <View style={{
          position: 'absolute',
          width: size * 0.85,
          height: size * 0.85,
          borderRadius: size,
          backgroundColor: 'transparent',
          shadowColor: config.glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isPlat ? 0.9 : 0.7,
          shadowRadius: isPlat ? 14 : 10,
        }} pointerEvents="none" />
      )}

      {/* Icon or lock */}
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        {unlocked ? (
          <Ionicons
            name={def.icon as any}
            size={size * 0.36}
            color={unlocked ? config.iconColor : 'rgba(255,255,255,0.15)'}
          />
        ) : (
          <Ionicons
            name="lock-closed"
            size={size * 0.30}
            color={isPlat ? 'rgba(160,180,255,0.5)' : 'rgba(255,255,255,0.18)'}
          />
        )}
      </View>
    </View>
  );
}

// ─── Achievement Card ─────────────────────────────────────────────────────────

interface AchievementCardProps {
  def: AchievementDef;
  unlocked: UnlockedInfo | null;
  progressValue?: number; // current value toward progressTarget
  highlight?: boolean;
}

interface UnlockedInfo {
  unlockedAt: string;
  count: number;
}

function AchievementCard({ def, unlocked, progressValue = 0, highlight = false }: AchievementCardProps) {
  const { theme } = useTheme();
  const tier      = getDisplayTier(def);
  const config    = TIER_CONFIG[tier];
  const isPlat    = tier === 'platinum';
  const isUnlocked = !!unlocked;

  const hasProgress = def.progressTarget !== undefined && !isUnlocked;
  const progress    = hasProgress
    ? Math.min(progressValue / (def.progressTarget ?? 1), 1)
    : 0;

  const dateStr = unlocked
    ? new Date(unlocked.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!highlight) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 375, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 375, easing: Easing.in(Easing.cubic),  useNativeDriver: true }),
      ]),
      { iterations: 2 }
    ).start();
  }, [highlight]);

  return (
    <Animated.View style={{
      flex: 1,
      transform: [{ scale: pulseAnim }],
      // The LIFT lives here, on the wrapper, and every badge gets it. A view casts ONE shadow, so the card
      // below had to choose between identity (its tier colour) and lift -- and it chose identity, which
      // meant EARNED badges did not lift: bronze/gold/silver are LIGHT colours, and a light shadow on a
      // near-white page darkens nothing (the same physics that makes Dark's black-on-black shadow
      // pointless). Locked badges, on a neutral shadow, ended up looking MORE raised than earned ones.
      // Now: wrapper = neutral lift for all, card = the tier glow on top for earned only.
      borderRadius: 14,
      shadowColor: theme.cardShadow,
      shadowOpacity: theme.cardShadowOpacity,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 6,
    }}>
    <View style={[
      styles.card,
      {
        flex: 1,
        backgroundColor: isUnlocked
          ? (isPlat ? 'rgba(30,40,80,0.85)' : theme.bgCard)
          : theme.bgCard,
        borderColor: isUnlocked ? config.borderColor : theme.borderCard,
        borderTopColor: isUnlocked ? config.borderColor : theme.borderCardTop,
        // The tier GLOW, earned only -- pure identity now that the wrapper above carries the lift. Offset
        // 0,0 on purpose: this one IS meant to be a halo (it rings the badge), not a drop shadow. A locked
        // badge has no glow at all; its lift comes from the wrapper like everything else.
        shadowColor: isUnlocked ? config.glowColor : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isUnlocked ? (isPlat ? 0.5 : 0.3) : 0,
        shadowRadius: isUnlocked ? (isPlat ? 16 : 10) : 0,
        opacity: isUnlocked ? 1 : 0.75,
      }
    ]}>
      {/* Tier pip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{
          backgroundColor: isUnlocked ? config.badgeColor : 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          paddingHorizontal: 5,
          paddingVertical: 2,
        }}>
          <Text style={{
            fontSize: 7,
            fontFamily: Type.uiBold,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: isUnlocked ? '#000000aa' : theme.textDim,
          }}>
            {config.label}
          </Text>
        </View>
        {unlocked && unlocked.count > 1 && (
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiMedium, marginLeft: 6 }}>
            x{unlocked.count}
          </Text>
        )}
      </View>

      {/* Badge */}
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <HexBadge def={def} unlocked={isUnlocked} size={72} />
      </View>

      {/* Name */}
      {isUnlocked ? (
        <GradientTitle title={def.name} color={theme.textSecondary} numberOfLines={1} style={{
          fontSize: 13,
          fontFamily: Type.uiBold,
          textAlign: 'center',
          marginBottom: 3,
          letterSpacing: 0.3,
        }} />
      ) : (
        <Text style={{
          fontSize: 13,
          fontFamily: Type.uiBold,
          color: theme.textMuted,
          textAlign: 'center',
          marginBottom: 3,
          letterSpacing: 0.3,
        }} numberOfLines={1}>
          {def.name}
        </Text>
      )}

      {/* Criteria */}
      <Text style={{
        fontSize: 9,
        fontFamily: Type.uiMedium,
        color: theme.textDim,
        textAlign: 'center',
        lineHeight: 13,
        marginBottom: 6,
      }}>
        {def.criteria}
      </Text>

      {/* Description */}
      <Text style={{
        fontSize: 10,
        fontFamily: Type.ui,
        color: theme.textMuted,
        textAlign: 'center',
        lineHeight: 14,
        marginBottom: isUnlocked || hasProgress ? 8 : 0,
      }}>
        {def.description}
      </Text>

      {/* Unlocked date */}
      {isUnlocked && dateStr && (
        <Text style={{
          fontSize: 9,
          fontFamily: Type.uiSemibold,
          // Diamond's badgeColor (#e0f2fe) is a near-white pale blue -- nearly the same as the
          // card's own light tint, unreadable. badgeColorDark is the established "readable darker
          // variant" this file already uses elsewhere (the hex badge gradient). Bronze/silver/gold
          // keep badgeColor -- their values are saturated enough to read fine, not reported broken.
          color: isPlat ? '#93c5fd' : tier === 'diamond' ? config.badgeColorDark : config.badgeColor,
          textAlign: 'center',
          letterSpacing: 0.5,
          opacity: 0.85,
        }}>
          {dateStr}
        </Text>
      )}

      {/* Progress bar for locked */}
      {hasProgress && def.progressTarget !== undefined && (
        <View>
          <View style={{
            height: 3,
            backgroundColor: theme.bgProgressTrack,
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 4,
          }}>
            <View style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: isPlat ? '#60a5fa' : config.badgeColor,
              borderRadius: 2,
            }} />
          </View>
          <Text style={{
            fontSize: 9,
            fontFamily: Type.uiSemibold,
            color: theme.textDim,
            textAlign: 'center',
          }}>
            {Math.round(Math.min(progressValue, def.progressTarget) * 10) / 10} / {def.progressTarget}
          </Text>
        </View>
      )}
    </View>
    </Animated.View>
  );
}

// ─── Daily Goal Config ────────────────────────────────────────────────────────

interface DailyGoalDef { id: DailyGoalId; name: string; icon: string; color: string; }

const DAILY_GOALS: DailyGoalDef[] = [
  { id: 'water',        name: 'Water Goal',    icon: 'water',       color: '#3b82f6' },
  { id: 'steps',        name: 'Step Goal',     icon: 'footsteps',   color: '#10b981' },
  { id: 'activeCals',   name: 'Active Cals',   icon: 'flame',       color: '#f97316' },
  { id: 'exerciseMins', name: 'Exercise Goal', icon: 'bicycle',     color: '#8b5cf6' },
];

function DailyGoalHexBadge({ color, icon, size = 56 }: { color: string; icon: string; size?: number }) {
  const gradId = `dg_ach_${icon}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size * 0.85, height: size * 0.85, borderRadius: size,
        shadowColor: color, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 8,
      }} pointerEvents="none" />
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.5" />
          </SvgLinearGradient>
        </Defs>
        <Path d={hexPath(size)} fill={`url(#${gradId})`} />
        <Path d={hexPath(size)} fill="none" stroke={color + '88'} strokeWidth={1.5} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Ionicons name={icon as any} size={size * 0.38} color="#ffffff" />
      </View>
    </View>
  );
}

// Which loadProgressValues recount key backs each daily goal's COUNT. The count comes from the historical
// day-scan (same source as the badge progress bars + Otto), NOT the lossy pj_goal_hit_counts tally, which
// misses backfilled/edited days. The tally is still used for the "Last earned" DATE only.
// protein is NOT in DAILY_GOALS (below) and never rendered as a card -- Justin's call, protein goal-hit
// stays silent, only feeds the Rate Us trigger (SPEC_rate_us_and_feedback.md). Entry exists purely to
// satisfy the Record<DailyGoalId, string> type after DailyGoalId gained 'protein'; never looked up.
const GOAL_RECOUNT_KEY: Record<DailyGoalId, string> = {
  water: 'waterGoalDays', steps: 'stepGoalDays', activeCals: 'activeCalGoalDays', exerciseMins: 'exerciseMinsGoalDays', protein: 'proteinGoalDays',
};

function DailyGoalCard({ def, count, lastEarned }: { def: DailyGoalDef; count: number; lastEarned: string }) {
  const { theme } = useTheme();
  // LOCAL date (must match the writer in achievementData.ts localGoalDateKey) so "Last: Today"
  // lines up with the day the user actually earned it, not the UTC calendar day.
  const ld = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today      = ld(new Date());
  const yesterday  = ld(new Date(Date.now() - 86400000));

  const lastLabel = !lastEarned
    ? 'Not yet earned'
    : lastEarned === today
      ? 'Last: Today'
      : lastEarned === yesterday
        ? 'Last: Yesterday'
        : `Last: ${new Date(lastEarned + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <View style={[
      styles.card,
      {
        flex: 1,
        backgroundColor: theme.bgCard,
        borderColor: count > 0 ? def.color + '50' : theme.borderCard,
        borderTopColor: def.color,
        borderTopWidth: 1.5,
        shadowColor: count > 0 ? def.color : '#000',
        shadowOpacity: count > 0 ? 0.22 : 0.15,
        shadowRadius: count > 0 ? 8 : 6,
      }
    ]}>
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <DailyGoalHexBadge color={def.color} icon={def.icon} size={56} />
      </View>
      <GradientTitle title={def.name} color={theme.textSecondary} numberOfLines={1} style={{ fontSize: 11, fontFamily: Type.uiBold, textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 }} />
      <GradientNumber value={`${count}×`} color={count > 0 ? def.color : theme.textMuted} style={{ fontSize: 30, fontFamily: Type.num, textAlign: 'center', letterSpacing: 1, lineHeight: numLine(30) }} />
      <Text style={{ fontSize: 8, fontFamily: Type.uiSemibold, color: theme.textMuted, textAlign: 'center', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        achieved
      </Text>
      <Text style={{ fontSize: 9, fontFamily: Type.uiMedium, color: lastEarned && lastEarned === today ? def.color : (lastEarned ? theme.textMuted : theme.textDim), textAlign: 'center', opacity: 0.85 }}>
        {lastLabel}
      </Text>
    </View>
  );
}

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; icon: string }> = {
  hydration: { label: 'Hydration',  icon: 'water-outline'       },
  steps:     { label: 'Steps',      icon: 'footsteps-outline'   },
  weight:    { label: 'Weight',     icon: 'trending-down-outline'},
  momentum:  { label: 'Momentum',   icon: 'flame-outline'       },
  workout:   { label: 'Workout',    icon: 'barbell-outline'     },
  sleep:     { label: 'Sleep',      icon: 'moon-outline'        },
  faith:     { label: 'Faith',      icon: 'book-outline'        },
  nutrition: { label: 'Nutrition',  icon: 'nutrition-outline'   },
  journal:   { label: 'Journal',    icon: 'create-outline'      },
};

const CATEGORY_ORDER = ['hydration', 'steps', 'weight', 'momentum', 'workout', 'sleep', 'faith', 'nutrition', 'journal'];

// ─── Collapsible Category Section ────────────────────────────────────────────
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function CollapsibleCategory({
  label, icon, catUnlocked, total, defaultOpen, children, forceOpen, onCategoryLayout,
}: {
  label: string; icon: string; catUnlocked: number; total: number;
  defaultOpen: boolean; children: React.ReactNode;
  forceOpen?: boolean; onCategoryLayout?: (y: number) => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const opacityAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const isFirstRender = useRef(true);

  // Fire fade-in AFTER children mount so they are guaranteed to start at opacity 0.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (open) {
      Animated.timing(opacityAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [open]);

  // Force-open from parent (e.g. highlight scroll navigation)
  useEffect(() => {
    if (!forceOpen) return;
    if (!open) {
      opacityAnim.setValue(0);
      setOpen(true);
    }
  }, [forceOpen]);

  const toggle = () => {
    if (open) {
      Animated.timing(opacityAnim, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen(false);
      });
    } else {
      opacityAnim.setValue(0);
      setOpen(true);
    }
  };

  return (
    <View style={{ marginBottom: 28 }} onLayout={(e) => onCategoryLayout?.(e.nativeEvent.layout.y)}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: open ? 14 : 0, gap: 8, paddingVertical: 4 }}
      >
        {/* SECTION headers are ink, matching Stats and Profile. These are the page's structure, not a
            card's quiet caption -- on a glowing accent ground a muted label just dissolves. */}
        <Ionicons name={icon as any} size={14} color={theme.textSecondary} />
        <Text style={{ fontSize: 11, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', color: theme.textSecondary, flex: 1 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 11, fontFamily: Type.uiSemibold, color: catUnlocked === total ? theme.accentGreen : theme.textSecondary, letterSpacing: 1, marginRight: 6 }}>
          {catUnlocked}/{total}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textSecondary} />
      </TouchableOpacity>

      {open && (
        <Animated.View style={{ opacity: opacityAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [store,      setStore]      = useState<AchievementsStore>({});
  const [progress,   setProgress]   = useState<Record<string, number>>({});
  const [goalCounts, setGoalCounts] = useState<DailyGoalCounts>(DEFAULT_DAILY_GOAL_COUNTS);
  const [weightDir,  setWeightDir]  = useState<'loss' | 'gain' | 'none'>('none');
  const [loading,    setLoading]    = useState(true);
  const [forceOpenCat, setForceOpenCat] = useState<string | null>(null);

  const scrollRef    = useRef<ScrollView>(null);
  const categoryYMap = useRef<Record<string, number>>({});

  const rawHighlightParam = useLocalSearchParams().highlightId;
  const highlightId = Array.isArray(rawHighlightParam) ? rawHighlightParam[0] : (rawHighlightParam ?? undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        const [s, p, gc] = await Promise.all([
          loadAchievements(),
          loadProgressValues(),
          loadGoalHitCounts(),
        ]);
        if (active) {
          setStore(s);
          setProgress(p);
          setGoalCounts(gc);
          const gw = p['_goalWeight'] ?? 0;
          const sw = p['_startWeight'] ?? 0;
          setWeightDir(gw > 0 && sw > 0 && gw !== sw
            ? gw < sw ? 'loss' : 'gain'
            : 'none'
          );
          setLoading(false);
        }
      };
      load();
      return () => { active = false; };
    }, [])
  );

  // Scroll to + open category when arriving via toast tap
  useEffect(() => {
    if (!highlightId || loading) return;
    const cat = CATEGORY_ORDER.find(c => ACHIEVEMENTS.some(a => a.id === highlightId && a.category === c));
    if (!cat) return;
    setForceOpenCat(cat);
    const t = setTimeout(() => {
      const y = categoryYMap.current[cat];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }, 450);
    return () => clearTimeout(t);
  }, [highlightId, loading]);

  // Group achievements by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, AchievementDef[]>>((acc, cat) => {
    let defs = ACHIEVEMENTS.filter(a => a.category === cat);
    if (cat === 'weight') {
      defs = defs.filter(d => {
        if (d.id === 'weight_first' || d.id === 'weight_goal') return true;
        const isLoss = d.id.startsWith('weight_loss_');
        const isGain = d.id.startsWith('weight_gain_');
        const earned = !!store[d.id];
        if (weightDir === 'loss' && isGain) return earned;
        if (weightDir === 'gain' && isLoss) return earned;
        if (weightDir === 'none' && (isLoss || isGain)) return earned;
        return true;
      });
    }
    if (defs.length > 0) acc[cat] = defs;
    return acc;
  }, {});

  // Count unlocked
  const totalUnlocked = ACHIEVEMENTS.filter(a => !!store[a.id]).length;

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <BackgroundLayers />

      {/* NOTE on the `right` badge below: it is a BADGE, not a button -- a plain View showing the earned
          count, nothing to tap. It wears the tinted recipe and now the shine too, at Justin's call
          (2026-07-15), so the header reads consistently with every other tinted square in the app. The
          standing "shine = tappable surface" rule is knowingly bent here; if it ever reads as a dead button
          that users poke at, this is the one to pull back. */}
      <ScreenHeader
        title="Achievements"
        topInset={false}
        right={
          <View style={{
            backgroundColor: theme.accentBlueBg,
            borderWidth: 1,
            borderColor: theme.accentBlueBorder,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            alignItems: 'center',
          }}>
            <ButtonShine radius={8} />
            <Text style={{ fontSize: 16, fontFamily: Type.num, color: theme.accentBlue, letterSpacing: 1 }}>
              {totalUnlocked}
            </Text>
            <Text style={{ fontSize: 7, fontFamily: Type.uiBold, letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textMuted }}>
              Earned
            </Text>
          </View>
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textMuted, fontFamily: Type.ui, fontSize: 13 }}>Loading...</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 96 }}>

          {/* Categories -- collapsible sections */}
          {Object.entries(grouped).map(([cat, defs]) => {
            const catConfig   = CATEGORY_CONFIG[cat];
            const catUnlocked = defs.filter(d => !!store[d.id]).length;
            const grid = (
              <View style={{ gap: 10 }}>
                {defs.reduce<AchievementDef[][]>((rows, def, i) => {
                  if (i % 2 === 0) rows.push([def]);
                  else rows[rows.length - 1].push(def);
                  return rows;
                }, []).map((pair, rowIdx) => (
                  <View key={rowIdx} style={{ flexDirection: 'row', gap: 10 }}>
                    {pair.map(def => {
                      const unlockedEntry = store[def.id] ?? null;
                      const progressVal   = def.progressKey ? (progress[def.progressKey] ?? 0) : 0;
                      return (
                        <View key={def.id} style={{ flex: 1 }}>
                          <AchievementCard
                            def={def}
                            unlocked={unlockedEntry ? { unlockedAt: unlockedEntry.unlockedAt, count: unlockedEntry.count } : null}
                            progressValue={progressVal}
                            highlight={typeof highlightId === 'string' && def.id === highlightId}
                          />
                        </View>
                      );
                    })}
                    {pair.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                ))}
              </View>
            );
            return (
              <CollapsibleCategory
                key={cat}
                label={catConfig.label}
                icon={catConfig.icon}
                catUnlocked={catUnlocked}
                total={defs.length}
                defaultOpen={false}
                forceOpen={forceOpenCat === cat}
                onCategoryLayout={(y) => { categoryYMap.current[cat] = y; }}
              >
                {grid}
              </CollapsibleCategory>
            );
          })}

          {/* Daily Goals */}
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
              <Ionicons name="trophy" size={14} color={theme.textSecondary} />
              <Text style={{ fontSize: 11, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', color: theme.textSecondary, flex: 1 }}>
                Daily Goals
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {DAILY_GOALS.reduce<DailyGoalDef[][]>((rows, def, i) => {
                if (i % 2 === 0) rows.push([def]);
                else rows[rows.length - 1].push(def);
                return rows;
              }, []).map((pair, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: 'row', gap: 10 }}>
                  {pair.map(def => (
                    <View key={def.id} style={{ flex: 1 }}>
                      <DailyGoalCard def={def} count={progress[GOAL_RECOUNT_KEY[def.id]] ?? 0} lastEarned={goalCounts[def.id]?.lastEarned ?? ''} />
                    </View>
                  ))}
                  {pair.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          </View>

          {/* Disclaimer. textDim (the DIMMEST token) at 9px, sitting on the PAGE at the very bottom -- i.e.
              exactly where the accent glow is strongest. It was unreadable, and a health disclaimer is the
              one line that is not allowed to be. textMuted + 10px; the house minimum for muted text. */}
          <Text style={{
            fontSize: 10,
            fontFamily: Type.ui,
            color: theme.textMuted,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 15,
          }}>
            For informational purposes only. Not medical advice.
          </Text>

        </ScrollView>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    marginBottom: 0,
  },
  headerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontFamily: Type.uiBold,
  },
  headerTitle: { ...PAGE_TITLE },
  card: {
    borderWidth: 0.5,
    borderTopWidth: 0.5,
    borderRadius: 14,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
  },
});
