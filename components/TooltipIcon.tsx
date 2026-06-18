import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useTooltip } from '../useTooltip';
import { useTheme } from '../theme';
import TooltipModal from './TooltipModal';

interface Props {
  tooltipKey: string;
  size?: number;
  /** Hide the "Take a Tour" button in the tooltip modal (explainer only).
   *  Use where the linked tutorial cannot run from here, e.g. inside another
   *  modal -- the tour lives on the full Day Summary page instead. */
  hideTour?: boolean;
  /** Override the (i) icon color. Defaults to the blue accent; faith cards pass amber. */
  color?: string;
}

export default function TooltipIcon({ tooltipKey, size = 13, hideTour, color }: Props) {
  const { theme } = useTheme();
  const { seen, markSeen } = useTooltip(tooltipKey);
  const [modalVisible, setModalVisible] = useState(false);
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

  const handleClose = () => {
    markSeen();
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setModalVisible(true); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="information-circle" size={size} color={color ?? theme.accentBlueRaw} />
        </Animated.View>
      </TouchableOpacity>
      <TooltipModal
        tooltipKey={tooltipKey}
        visible={modalVisible}
        onClose={handleClose}
        hideTour={hideTour}
      />
    </>
  );
}