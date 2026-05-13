import { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - 4;

export default function ToggleSwitch({ value, onValueChange, disabled }: Props) {
  const { theme } = useTheme();
  const translateX = useRef(new Animated.Value(value ? THUMB_TRAVEL : 2)).current;
  const trackOpacity = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? THUMB_TRAVEL : 2,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.timing(trackOpacity, {
        toValue: value ? 1 : 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => !disabled && onValueChange(!value)}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Off track */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: theme.bgProgressTrack,
        borderRadius: TRACK_HEIGHT / 2,
      }} />
      {/* On track */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: theme.accentBlueBg,
        borderRadius: TRACK_HEIGHT / 2,
        borderWidth: 1,
        borderColor: theme.accentBlueBorder,
        opacity: trackOpacity,
      }} />
      {/* Thumb */}
      <Animated.View style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: value ? theme.accentBlueRaw : '#ffffff',
        transform: [{ translateX }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      }} />
    </TouchableOpacity>
  );
}