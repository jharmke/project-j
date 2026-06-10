import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';
import type { TextStyle } from 'react-native';

interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  decimals?: number;
  duration?: number;
  formatter?: (n: number) => string;
}

export default function AnimatedNumber({ value, style, decimals = 0, duration = 350, formatter }: Props) {
  const animRef = useRef(new Animated.Value(value));
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    const prev = prevRef.current;
    prevRef.current = value;

    if (prev === 0) {
      animRef.current.setValue(value);
      setDisplay(value);
      return;
    }

    const id = animRef.current.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(animRef.current, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setDisplay(value));

    return () => animRef.current.removeListener(id);
  }, [value, duration]);

  const rounded = decimals > 0 ? display : Math.round(display);
  const formatted = formatter ? formatter(rounded) : decimals > 0 ? (rounded as number).toFixed(decimals) : `${rounded}`;

  return <Text style={style}>{formatted}</Text>;
}
