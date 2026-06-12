// components/SleepDonut.tsx
// Shared sleep-stage donut. Single source of truth for the Core/Deep/REM ring
// shown on the home Sleep card AND the Sleep Hub hero. Extracted verbatim from
// app/(tabs)/index.tsx so both surfaces render the exact same donut -- no drift.
//
// Colors are passed in by the caller (always from the active theme's
// sleepCore / sleepDeep / sleepRem tokens) so the donut stays theme-correct
// everywhere it renders.

import { useEffect } from 'react';
import { Text, View } from 'react-native';
import ReAnimated, {
  cancelAnimation,
  Easing as ReAnimEasing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimCircle = ReAnimated.createAnimatedComponent(Circle);

export default function SleepDonut({ coreFrac, deepFrac, remFrac, donutCirc, donutSize, donutStroke, donutRadius, coreColor, deepColor, remColor, trackColor, gapFrac, refreshKey, score, scoreColor, shimmer }: {
  coreFrac: number; deepFrac: number; remFrac: number; donutCirc: number;
  donutSize: number; donutStroke: number; donutRadius: number;
  coreColor: string; deepColor: string; remColor: string; trackColor: string; gapFrac: number; refreshKey?: number;
  score: number; scoreColor: string; shimmer?: boolean;
}) {
  const coreAnim = useSharedValue(0);
  const deepAnim = useSharedValue(0);
  const remAnim  = useSharedValue(0);
  const shimmerScale = useSharedValue(1);

  useEffect(() => {
    coreAnim.value = 0;
    deepAnim.value = 0;
    remAnim.value  = 0;
    setTimeout(() => {
      coreAnim.value = withTiming(Math.max(0, coreFrac - gapFrac), { duration: 800 });
    }, 200);
    setTimeout(() => {
      deepAnim.value = withTiming(Math.max(0, deepFrac - gapFrac), { duration: 700 });
    }, 900);
    setTimeout(() => {
      remAnim.value = withTiming(Math.max(0, remFrac - gapFrac), { duration: 600 });
    }, 1500);
  }, [coreFrac, deepFrac, remFrac, refreshKey]);

  useEffect(() => {
    if (shimmer) {
      shimmerScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 200, easing: ReAnimEasing.out(ReAnimEasing.cubic) }),
          withTiming(1.0,  { duration: 350, easing: ReAnimEasing.in(ReAnimEasing.cubic) }),
          withDelay(2800, withTiming(1.0, { duration: 1 })),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(shimmerScale);
      shimmerScale.value = 1;
    }
  }, [shimmer]);

  const coreStyle = useAnimatedStyle(() => ({ strokeDasharray: `${coreAnim.value} ${donutCirc}` } as any));
  const deepStyle = useAnimatedStyle(() => ({ strokeDasharray: `${deepAnim.value} ${donutCirc}` } as any));
  const remStyle  = useAnimatedStyle(() => ({ strokeDasharray: `${remAnim.value} ${donutCirc}`  } as any));
  const shimmerCenterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shimmerScale.value }] }));

  return (
    <View>
      <Svg width={donutSize} height={donutSize}>
        <Circle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={trackColor} strokeWidth={donutStroke} fill="none" />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={coreColor} strokeWidth={donutStroke} fill="none"
          animatedProps={coreStyle} strokeDashoffset={0} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={deepColor} strokeWidth={donutStroke} fill="none"
          animatedProps={deepStyle} strokeDashoffset={-(coreFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
        <AnimCircle cx={donutSize/2} cy={donutSize/2} r={donutRadius} stroke={remColor} strokeWidth={donutStroke} fill="none"
          animatedProps={remStyle} strokeDashoffset={-(coreFrac+deepFrac)} strokeLinecap="butt" rotation="-90" origin={`${donutSize/2},${donutSize/2}`} />
      </Svg>
      <View style={{ position:'absolute', top:0, left:0, width:donutSize, height:donutSize, alignItems:'center', justifyContent:'center' }}>
        <ReAnimated.View style={[{ alignItems: 'center' }, shimmerCenterStyle]}>
          <View style={{ shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0 }}>
            <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', color: scoreColor, letterSpacing: 1, lineHeight: 38, opacity: 0.88 }}>{score}</Text>
          </View>
          <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: scoreColor, textTransform: 'uppercase', opacity: 0.7 }}>/100</Text>
        </ReAnimated.View>
      </View>
    </View>
  );
}
