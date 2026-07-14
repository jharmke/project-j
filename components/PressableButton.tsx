import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  flex?: number;
  // Styles the OUTER Pressable (the flex child of the row), not the button face. Needed for layout
  // constraints like maxWidth, which have to live on the element the parent row is measuring.
  wrapperStyle?: any;
}

export default function PressableButton({ onPress, children, style, flex, wrapperStyle }: Props) {
  const scale = useSharedValue(1);
  

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={[{ flex: flex !== undefined ? flex : 1 }, wrapperStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15, stiffness: 300 });
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={onPress}>
      <Animated.View style={[style, animatedStyle, { flex: 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}