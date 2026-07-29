import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Pressable } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// HOUSE PRESS FEEL: scale 0.97 on a 100ms TIMING curve, never a spring. This used to spring to 0.94,
// which read as bouncy -- two other places in the app (the Recipe Log meal picker rows and the photo
// options modal) hand-rolled the correct 0.97 timing specifically to avoid importing this component.
// Fixed at the source instead, so everything reaching for this now inherits the right feel.
const PRESS_SCALE = 0.97;
const PRESS_MS = 100;

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
        scale.value = withTiming(PRESS_SCALE, { duration: PRESS_MS, easing: Easing.out(Easing.cubic) });
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => { scale.value = withTiming(1, { duration: PRESS_MS, easing: Easing.out(Easing.cubic) }); }}
      onPress={onPress}>
      <Animated.View style={[style, animatedStyle, { flex: 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}