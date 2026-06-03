import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import FaithIconFish from './FaithIconFish';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_BAR_HEIGHT = 64;

// The first four tabs never change. The FIFTH slot is tier-aware: Faith for
// Rooted/Exploring users, Profile for "Not Right Now" users. Keeping it always
// 5 buttons means the pill geometry (SCREEN_WIDTH / 5) never has to handle a
// 4-tab case. Profile stays reachable for Faith users via the header avatar.
const BASE_TABS = [
  { name: 'log', label: 'Log', icon: 'restaurant', iconActive: 'restaurant' },
  { name: 'workout', label: 'Workout', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'index', label: 'Home', icon: 'home', iconActive: 'home', isHome: true },
  { name: 'stats', label: 'Stats', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
];
const PROFILE_TAB = { name: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' };
const FAITH_TAB = { name: 'faith', label: 'Faith', isFaith: true };

function HomeButton({ isFocused, scale, homePulse, onPress, bgCard, textSecondary, macroProtein }: { isFocused: boolean, scale: any, homePulse: any, onPress: () => void, bgCard: string, textSecondary: string, macroProtein: string }) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: isFocused ? homePulse.value : 0,
  }));
  return (
    <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 64 }} onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: isFocused ? macroProtein : bgCard,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: isFocused ? macroProtein : `${macroProtein}66`,
        shadowColor: macroProtein,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 14,
        elevation: 8,
      }, animStyle]}>
        <Ionicons name="home" size={22} color={isFocused ? '#ffffff' : textSecondary} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function LabelAnimated({ translate, opacity, label, color }: { translate: any, opacity: any, label: string, color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  return <Animated.Text style={[{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase', color }, style]}>{label}</Animated.Text>;
}

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const hapticsEnabled = useRef(true);
  const [activeIndex, setActiveIndex] = useState(state.index);
  const [showFaith, setShowFaith] = useState(true); // faith on by default; corrected after settings load
  const pillX = useSharedValue(0);
  const tabWidth = SCREEN_WIDTH / 5;

  // Fifth slot is tier-aware. Always exactly 5 buttons.
  const tabs = [...BASE_TABS, showFaith ? FAITH_TAB : PROFILE_TAB];

  // Read tab settings (haptics + faith tier). Called on mount and on every tab
  // navigation, so a Faith Journey change in Settings swaps the 5th slot the
  // moment the user navigates back, no restart needed. setShowFaith bails out
  // when the value is unchanged, so the per-nav read costs nothing extra.
  const loadTabSettings = () => {
    AsyncStorage.getItem('pj_settings').then(saved => {
      if (saved) {
        const data = JSON.parse(saved);
        if (data.hapticsEnabled !== undefined) hapticsEnabled.current = data.hapticsEnabled;
        setShowFaith(data.faithJourney !== 'notrightnow');
      } else {
        setShowFaith(true);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadTabSettings();
  }, []);

  // Map router state index to our tabs order. Returns -1 when the active route
  // is NOT a visible bar button (e.g. a Faith user opening Profile via the
  // header avatar), so the effects below can guard against it.
  const getTabsIndex = (routerIndex: number) => {
    const routeName = state.routes[routerIndex]?.name;
    return tabs.findIndex(t => t.name === routeName);
  };

  const currentTabsIndex = getTabsIndex(state.index);

  const pillOpacity = useSharedValue(1);
  const homePulse = useSharedValue(0.4);

  useEffect(() => {
    loadTabSettings();
    const tabIdx = getTabsIndex(state.index);
    if (tabIdx < 0) return; // on a non-bar screen; nothing to animate
    if (tabIdx !== 2) {
      labelOpacities[tabIdx].value = 0;
      labelOpacities[tabIdx].value = withTiming(1, { duration: 200 });
    }
  }, [state.index]);

  useEffect(() => {
    setActiveIndex(state.index);
    const tabIdx = getTabsIndex(state.index);
    if (tabIdx < 0) {
      // On a screen that is not a bar button (e.g. Profile for a Faith user).
      // Hide the pill so no tab reads as active.
      pillOpacity.value = withTiming(0, { duration: 150 });
      return;
    }
    const targetX = tabIdx * tabWidth + tabWidth / 2 - 36;
    if (tabIdx === 2) {
      // Going to home -- slide to home position and fade out
      pillX.value = withSpring(targetX, { damping: 50, stiffness: 500 });
      pillOpacity.value = withTiming(0, { duration: 200 });
    } else {
      // Going to a regular tab -- fade in and slide
      pillOpacity.value = withTiming(1, { duration: 150 });
      pillX.value = withSpring(targetX, { damping: 50, stiffness: 500 });
    }
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    opacity: pillOpacity.value,
  }));

  const scales = tabs.map(() => useSharedValue(1));
  const labelTranslates = tabs.map(() => useSharedValue(8));
  const labelOpacities = tabs.map(() => useSharedValue(0));

  useEffect(() => {
    homePulse.value = withRepeat(
      withTiming(1, { duration: 1800 }),
      -1,
      true
    );
  }, []);

  const handlePress = (tabName: string, tabIdx: number) => {
    const routeIdx = state.routes.findIndex(r => r.name === tabName);
    if (routeIdx === -1) return;

    if (hapticsEnabled.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Press down
    scales[tabIdx].value = withSpring(0.85, { damping: 50, stiffness: 1500 });
    // Bounce up past 1.0 then settle
    setTimeout(() => {
      scales[tabIdx].value = withSpring(1.04, { damping: 50, stiffness: 1500 });
      setTimeout(() => {
        scales[tabIdx].value = withSpring(1.0, { damping: 30, stiffness: 500 });
      }, 80);
    }, 80);

    const isFocused = state.index === routeIdx;
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[routeIdx].key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(tabName);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom, backgroundColor: theme.bgPrimary, borderTopColor: theme.borderCardTop }]}>
      <Animated.View style={[styles.pill, { backgroundColor: theme.borderSubtle, borderColor: theme.borderCard }, pillStyle]} />

      {tabs.map((tab, i) => {
        const routeIdx = state.routes.findIndex(r => r.name === tab.name);
        const isFocused = state.index === routeIdx;
        const color = isFocused ? theme.textPrimary : theme.textDim;
        const scaleStyle = useAnimatedStyle(() => ({
          transform: [{ scale: scales[i].value }],
        }));

        if (tab.isHome) {
          return (
            <HomeButton
              key={tab.name}
              isFocused={isFocused}
              scale={scales[i]}
              homePulse={homePulse}
              onPress={() => handlePress(tab.name, i)}
              bgCard={theme.bgCard}
              textSecondary={theme.textSecondary}
              macroProtein={theme.accentBlueRaw}
            />
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handlePress(tab.name, i)}
            activeOpacity={0.8}>
            <Animated.View style={[styles.tabInner, scaleStyle]}>
              {tab.isFaith ? (
                <FaithIconFish size={22} color={color} />
              ) : (
                <Ionicons
                  name={(isFocused ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={color}
                />
              )}
              {isFocused && (
                <LabelAnimated translate={labelTranslates[i]} opacity={labelOpacities[i]} label={tab.label} color={color} />
              )}
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0d0d0f',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  pill: {
    position: 'absolute',
    top: 8,
    width: 72,
    height: 46,
    borderRadius: 23,
    borderWidth: 0.5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  homeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
  },
  homeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(13,146,104,0.4)',
  },
  homeButtonActive: {
    backgroundColor: '#0d9268',
    borderColor: '#0d9268',
    shadowColor: '#0d9268',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
});
