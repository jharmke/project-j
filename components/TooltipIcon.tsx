import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useTooltip } from '../useTooltip';
import { useTheme } from '../theme';

interface Props {
  tooltipKey: string;
  onPress: () => void;
}

export default function TooltipIcon({ tooltipKey, onPress }: Props) {
  const { theme } = useTheme();
  const { seen } = useTooltip(tooltipKey);
  const scale = useRef(new Animated.Value(1)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (seen === false && !hasAnimated.current) {
      hasAnimated.current = true;
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.35, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 300, useNativeDriver: true }),
          Animated.delay(200),
          Animated.timing(scale, { toValue: 1.35, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 300, useNativeDriver: true }),
          Animated.delay(200),
          Animated.timing(scale, { toValue: 1.35, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0,  duration: 300, useNativeDriver: true }),
        ]).start();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [seen]);

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name="information-circle" size={13} color={theme.textMuted} />
      </Animated.View>
    </TouchableOpacity>
  );
}