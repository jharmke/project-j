import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useTooltip } from '../useTooltip';
import { useTheme } from '../theme';
import TooltipModal from './TooltipModal';

interface Props {
  tooltipKey: string;
}

export default function TooltipIcon({ tooltipKey }: Props) {
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
        onPress={() => setModalVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="information-circle" size={13} color={theme.textMuted} />
        </Animated.View>
      </TouchableOpacity>
      <TooltipModal
        tooltipKey={tooltipKey}
        visible={modalVisible}
        onClose={handleClose}
      />
    </>
  );
}