import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function HapticTab(props: BottomTabBarButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={props.style as any}
      onPress={props.onPress as any}
      onLongPress={props.onLongPress as any}
      onPressIn={() => {
        scale.value = withSpring(0.85, { damping: 50, stiffness: 1500 });
        AsyncStorage.getItem('pj_settings').then(saved => {
          const enabled = saved ? (JSON.parse(saved).hapticsEnabled ?? true) : true;
          if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 50, stiffness: 1500 });
      }}>
      <Animated.View style={[animatedStyle, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
        {props.children}
      </Animated.View>
    </Pressable>
  );
}
