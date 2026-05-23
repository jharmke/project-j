import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react'; // useRef used in PlatinumAnimatedBorder and PlatinumGlow
import { Animated, Easing, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
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
import { useTheme } from '../theme';

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
  bronze: {
    label: 'Bronze',
    badgeColor:     '#cd7f32',
    badgeColorDark: '#8b5220',
    borderColor:    'rgba(205,127,50,0.6)',
    glowColor:      'rgba(205,127,50,0.35)',
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
  platinum: {
    label: 'Platinum',
    badgeColor:     '#bfdbfe',
    badgeColorDark: '#60a5c8',
    borderColor:    'rgba(191,219,254,0.7)',
    glowColor:      'rgba(191,219,254,0.45)',
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
}

interface UnlockedInfo {
  unlockedAt: string;
  count: number;
}

function AchievementCard({ def, unlocked, progressValue = 0 }: AchievementCardProps) {
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

  return (
    <View style={[
      styles.card,
      {
        flex: 1,
        backgroundColor: isUnlocked
          ? (isPlat ? 'rgba(30,40,80,0.85)' : theme.bgCard)
          : theme.bgCard,
        borderColor: isUnlocked ? config.borderColor : theme.borderCard,
        borderTopColor: isUnlocked ? config.borderColor : theme.borderCardTop,
        shadowColor: isUnlocked ? config.glowColor : '#000',
        shadowOpacity: isUnlocked ? (isPlat ? 0.5 : 0.3) : 0.15,
        shadowRadius: isUnlocked ? (isPlat ? 16 : 10) : 6,
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
            fontFamily: 'DMSans_700Bold',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: isUnlocked ? '#000000aa' : theme.textDim,
          }}>
            {config.label}
          </Text>
        </View>
        {unlocked && unlocked.count > 1 && (
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_500Medium', marginLeft: 6 }}>
            x{unlocked.count}
          </Text>
        )}
      </View>

      {/* Badge */}
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <HexBadge def={def} unlocked={isUnlocked} size={72} />
      </View>

      {/* Name */}
      <Text style={{
        fontSize: 13,
        fontFamily: 'DMSans_700Bold',
        color: isUnlocked ? theme.textPrimary : theme.textMuted,
        textAlign: 'center',
        marginBottom: 3,
        letterSpacing: 0.3,
      }}>
        {def.name}
      </Text>

      {/* Criteria */}
      <Text style={{
        fontSize: 9,
        fontFamily: 'DMSans_500Medium',
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
        fontFamily: 'DMSans_400Regular',
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
          fontFamily: 'DMSans_600SemiBold',
          color: isPlat ? '#93c5fd' : config.badgeColor,
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
            fontFamily: 'DMSans_600SemiBold',
            color: theme.textDim,
            textAlign: 'center',
          }}>
            {Math.round(Math.min(progressValue, def.progressTarget) * 10) / 10} / {def.progressTarget}
          </Text>
        </View>
      )}
    </View>
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

function DailyGoalCard({ def, counts }: { def: DailyGoalDef; counts: DailyGoalCounts }) {
  const { theme } = useTheme();
  const entry      = counts[def.id];
  const count      = entry?.count ?? 0;
  const lastEarned = entry?.lastEarned ?? '';
  const today      = new Date().toISOString().split('T')[0];
  const yesterday  = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
      <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 }}>
        {def.name}
      </Text>
      <Text style={{ fontSize: 30, fontFamily: 'BebasNeue_400Regular', color: count > 0 ? def.color : theme.textMuted, textAlign: 'center', letterSpacing: 1, lineHeight: 32 }}>
        {count}×
      </Text>
      <Text style={{ fontSize: 8, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted, textAlign: 'center', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
        achieved
      </Text>
      <Text style={{ fontSize: 9, fontFamily: 'DMSans_500Medium', color: lastEarned && lastEarned === today ? def.color : (lastEarned ? theme.textMuted : theme.textDim), textAlign: 'center', opacity: 0.85 }}>
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
  faith:     { label: 'Faith',      icon: 'book-outline'        },
  nutrition: { label: 'Nutrition',  icon: 'nutrition-outline'   },
  journal:   { label: 'Journal',    icon: 'create-outline'      },
};

const CATEGORY_ORDER = ['hydration', 'steps', 'weight', 'momentum', 'workout', 'faith', 'nutrition', 'journal'];

// ─── Progress Value Loader ────────────────────────────────────────────────────
// Reads AsyncStorage to figure out current progress toward each progressKey

async function loadProgressValues(): Promise<Record<string, number>> {
  const values: Record<string, number> = {};

  try {
    // waterGoalDays and stepGoalDays -- count days in storage where goal was hit
    // We scan last 365 days
    const profile = await AsyncStorage.getItem('pj_profile');
    const parsed  = profile ? JSON.parse(profile) : {};
    const waterTarget = 128; // default, could read from profile

    let waterDays = 0;
    let stepDays  = 0;
    const stepGoal = parsed.stepGoal ? parseInt(parsed.stepGoal) : 10000;

    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d  = new Date(today);
      d.setDate(d.getDate() - i);
      const dk = d.toISOString().split('T')[0];
      try {
        const raw = await AsyncStorage.getItem(`pj_${dk}`);
        if (raw) {
          const day = JSON.parse(raw);
          if ((day.water ?? 0) >= waterTarget) waterDays++;
          if ((day.steps ?? 0) >= stepGoal)    stepDays++;
        }
      } catch { /* skip */ }
    }

    values['waterGoalDays'] = waterDays;
    values['stepGoalDays']  = stepDays;

    // totalLost -- earliest vs most recent weight
    let earliestWeight: number | null = null;
    let mostRecentWeight: number | null = null;
    for (let i = 364; i >= 0; i--) {
      const d  = new Date(today);
      d.setDate(d.getDate() - i);
      const dk = d.toISOString().split('T')[0];
      try {
        const raw = await AsyncStorage.getItem(`pj_${dk}`);
        if (raw) {
          const day = JSON.parse(raw);
          if (day.weight) {
            if (!earliestWeight) earliestWeight = day.weight;
            mostRecentWeight = day.weight;
          }
        }
      } catch { /* skip */ }
    }
    if (earliestWeight && mostRecentWeight) {
      values['totalLost']   = Math.max(0, earliestWeight - mostRecentWeight);
      values['totalGained'] = Math.max(0, mostRecentWeight - earliestWeight);
    } else {
      values['totalLost']   = 0;
      values['totalGained'] = 0;
    }
    values['_startWeight'] = earliestWeight ?? 0;
    if (parsed.goalWeight) values['_goalWeight'] = parseFloat(parsed.goalWeight);

    // logStreak -- count consecutive days from today going back that have any data
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d  = new Date(today);
      d.setDate(d.getDate() - i);
      const dk = d.toISOString().split('T')[0];
      try {
        const raw = await AsyncStorage.getItem(`pj_${dk}`);
        if (raw) {
          streak++;
        } else {
          break;
        }
      } catch { break; }
    }
    values['logStreak'] = streak;

    // generalJournalEntries -- personal/fitness/workout entries only (gratitude is in faith)
    const GENERAL_JOURNAL_CATS = ['personal', 'fitness', 'workout'];
    const journalRaw = await AsyncStorage.getItem('pj_bible_reflections');
    const journalEntries: Array<{ category?: string }> = journalRaw ? JSON.parse(journalRaw) : [];
    values['generalJournalEntries'] = Array.isArray(journalEntries)
      ? journalEntries.filter(e => GENERAL_JOURNAL_CATS.includes(e.category ?? '')).length
      : 0;

    // Faith journal counts -- verse, prayer, gratitude from pj_bible_reflections
    if (Array.isArray(journalEntries)) {
      values['verseReflections']  = journalEntries.filter(e => e.category === 'verse').length;
      values['prayerEntries']     = journalEntries.filter(e => e.category === 'prayer').length;
      values['gratitudeEntries']  = journalEntries.filter(e => e.category === 'gratitude').length;
    } else {
      values['verseReflections']  = 0;
      values['prayerEntries']     = 0;
      values['gratitudeEntries']  = 0;
    }

    // bibleReadingDays -- cumulative completed days across all reading plans
    const plansRaw = await AsyncStorage.getItem('pj_reading_plans');
    const plans: Record<string, { completedDays?: number[] }> = plansRaw ? JSON.parse(plansRaw) : {};
    values['bibleReadingDays'] = Object.values(plans).reduce(
      (acc, prog) => acc + new Set(prog.completedDays ?? []).size,
      0
    );

    // workoutDays -- days with at least one exercise logged
    const workoutRaw = await AsyncStorage.getItem('pj_workout_state');
    const workoutState = workoutRaw ? JSON.parse(workoutRaw) : {};
    const workoutPrograms: Record<string, { exercises?: unknown[] }> = workoutState.programs ?? {};
    values['workoutDays'] = Object.keys(workoutPrograms).filter(
      key => Array.isArray(workoutPrograms[key]?.exercises) && (workoutPrograms[key].exercises?.length ?? 0) > 0
    ).length;

  } catch (e) {
    console.log('Progress load error', e);
  }

  return values;
}

// ─── Collapsible Category Section ────────────────────────────────────────────
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function CollapsibleCategory({
  label, icon, catUnlocked, total, defaultOpen, children,
}: {
  label: string; icon: string; catUnlocked: number; total: number;
  defaultOpen: boolean; children: React.ReactNode;
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
    <View style={{ marginBottom: 28 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: open ? 14 : 0, gap: 8, paddingVertical: 4 }}
      >
        <Ionicons name={icon as any} size={14} color={theme.textMuted} />
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, flex: 1 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: catUnlocked === total ? theme.accentGreen : theme.textMuted, letterSpacing: 1, marginRight: 6 }}>
          {catUnlocked}/{total}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={theme.textMuted} />
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
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color={theme.accentBlue} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Achievements</Text>
        </View>
        <View style={{
          backgroundColor: theme.accentBlueBg,
          borderWidth: 1,
          borderColor: theme.accentBlueBorder,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 16, fontFamily: 'BebasNeue_400Regular', color: theme.accentBlue, letterSpacing: 1 }}>
            {totalUnlocked}
          </Text>
          <Text style={{ fontSize: 7, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.textMuted }}>
            Earned
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontSize: 13 }}>Loading...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

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
                defaultOpen={cat === 'hydration'}
              >
                {grid}
              </CollapsibleCategory>
            );
          })}

          {/* Daily Goals */}
          <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
              <Ionicons name="trophy" size={14} color={theme.textMuted} />
              <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, flex: 1 }}>
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
                      <DailyGoalCard def={def} counts={goalCounts} />
                    </View>
                  ))}
                  {pair.length === 1 && <View style={{ flex: 1 }} />}
                </View>
              ))}
            </View>
          </View>

          {/* Disclaimer */}
          <Text style={{
            fontSize: 9,
            fontFamily: 'DMSans_400Regular',
            color: theme.textDim,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 14,
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
    fontFamily: 'DMSans_700Bold',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 2,
  },
  card: {
    borderWidth: 0.5,
    borderTopWidth: 0.5,
    borderRadius: 14,
    padding: 14,
    shadowOffset: { width: 0, height: 4 },
  },
});
