import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { CardPeriod, DATA_KEY_META, StatsCard } from '../statsCardRegistry';
import { TrendData } from '../utils/statsData';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 150;
const CHART_PAD_LEFT = 38;
const CHART_PAD_RIGHT = 4;
const CHART_PAD_TOP = 16;
const CHART_PAD_BOTTOM = 20;

export const MACRO_PROTEIN = '#0d9268';
export const MACRO_CARBS   = '#c47d1a';
export const MACRO_FAT     = '#a83232';
export const GRAPH_SWATCHES = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];

const fmtDate = (dk: string) => { const [,m,d] = dk.split('-'); return `${parseInt(m)}/${parseInt(d)}`; };

function niceYTicks(minVal: number, maxVal: number, targetCount = 4): number[] {
  const range = (maxVal - minVal) || 1;
  const roughStep = range / (targetCount - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceSteps = [1, 2, 2.5, 5, 10];
  const niceStep = niceSteps.reduce((best, s) => {
    const step = s * pow;
    return Math.abs(step - roughStep) < Math.abs(best - roughStep) ? step : best;
  }, Infinity);
  const start = Math.floor(minVal / niceStep) * niceStep;
  const ticks: number[] = [];
  let t = start;
  while (t <= maxVal + niceStep * 0.1 && ticks.length <= targetCount + 1) {
    ticks.push(Math.round(t * 10000) / 10000);
    t += niceStep;
  }
  if (ticks.length > 0 && ticks[ticks.length - 1] < maxVal) {
    ticks.push(Math.round((ticks[ticks.length - 1] + niceStep) * 10000) / 10000);
  }
  return ticks;
}

function useChartAnim(hasData: boolean) {
  const slideAnim = useRef(new Animated.Value(8)).current;
  const hasPlayed = useRef(false);
  useEffect(() => {
    if (!hasData || hasPlayed.current) return;
    hasPlayed.current = true;
    Animated.timing(slideAnim, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [hasData]);
  return { slideAnim };
}

function LineChart({ data, color, unit, goalValue, theme, fmtY, fmtFull, gradientId }: {
  data: { date: string, value: number }[],
  color: string,
  unit: string,
  goalValue?: number,
  theme: any,
  fmtY?: (v: number) => string,
  fmtFull?: (v: number) => string,
  gradientId: string,
}) {
  const [callout, setCallout] = useState<{ x: number; y: number; label1: string; label2: string } | null>(null);
  const { slideAnim } = useChartAnim(data.length >= 2);

  if (data.length < 2) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="analytics-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>Not enough data yet</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const allVals = goalValue !== undefined ? [...values, goalValue] : values;
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);

  const ticks = niceYTicks(dataMin, dataMax, 4);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1];
  const tickRange = tickMax - tickMin || 1;

  const chartH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const plotLeft = CHART_PAD_LEFT;
  const plotRight = CHART_WIDTH - CHART_PAD_RIGHT;
  const plotW = plotRight - plotLeft;
  const chartBottom = CHART_PAD_TOP + chartH;

  const toX = (i: number) => plotLeft + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => CHART_PAD_TOP + (1 - (v - tickMin) / tickRange) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const lastVal = data[data.length - 1].value;
  const lastY = toY(lastVal);
  const lastX = toX(data.length - 1);
  const midIdx = Math.floor(data.length / 2);

  const areaPath =
    `M ${toX(0)},${toY(data[0].value)} ` +
    data.slice(1).map((d, i) => `L ${toX(i + 1)},${toY(d.value)}`).join(' ') +
    ` L ${lastX},${chartBottom} L ${toX(0)},${chartBottom} Z`;

  const defaultFmtY = (v: number) =>
    v >= 10000 ? `${Math.round(v / 1000)}k` :
    v >= 1000  ? `${(v / 1000).toFixed(1)}k` :
    `${Math.round(v * 10) / 10}`;
  const fmt = fmtY || defaultFmtY;

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>

        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
        ))}

        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmt(tick)}
          </SvgText>
        ))}

        {goalValue !== undefined && goalValue >= tickMin && goalValue <= tickMax * 1.05 && (
          <>
            <Line x1={plotLeft} y1={toY(goalValue)} x2={plotRight} y2={toY(goalValue)}
              stroke={theme.accentBlueBorder} strokeWidth={1} strokeDasharray="4,3" />
            <SvgText x={plotRight} y={toY(goalValue) - 3}
              fill={theme.accentBlue} fontSize={8} fontFamily="DMSans_600SemiBold" textAnchor="end">
              {fmt(goalValue)}
            </SvgText>
          </>
        )}

        <Path d={areaPath} fill={`url(#${gradientId})`} />

        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Data point dots */}
        {data.map((d, i) => (
          <Circle key={`dot${i}`} cx={toX(i)} cy={toY(d.value)} r={3} fill={color} />
        ))}

        {/* X-axis dates */}
        <SvgText x={plotLeft} y={CHART_HEIGHT} fill={theme.textDim}
          fontSize={8} fontFamily="DMSans_500Medium">
          {fmtDate(data[0].date)}
        </SvgText>
        {data.length > 10 && (
          <SvgText x={toX(midIdx)} y={CHART_HEIGHT} fill={theme.textDim}
            fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
            {fmtDate(data[midIdx].date)}
          </SvgText>
        )}
        <SvgText x={plotRight} y={CHART_HEIGHT} fill={theme.textDim}
          fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
          {fmtDate(data[data.length - 1].date)}
        </SvgText>

        {/* Invisible tap circles at each data point */}
        {data.map((d, i) => (
          <Circle key={`tap${i}`} cx={toX(i)} cy={toY(d.value)} r={18} fill="transparent"
            onPress={() => setCallout(prev =>
              prev?.label1 === fmtDate(d.date) ? null :
              { x: toX(i), y: toY(d.value), label1: fmtDate(d.date), label2: fmtFull ? fmtFull(d.value) : `${fmt(d.value)}${unit}` }
            )} />
        ))}

        {callout !== null && (() => {
          const cPillW = Math.max(callout.label1.length, callout.label2.length) * 6 + 14;
          const cPillH = 32;
          const cPillX = Math.min(Math.max(callout.x - cPillW / 2, plotLeft), plotRight - cPillW);
          const cPillY = Math.max(CHART_PAD_TOP - 2, callout.y - cPillH - 10);
          return (
            <>
              <Rect x={cPillX} y={cPillY} width={cPillW} height={cPillH}
                fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6}
                onPress={() => setCallout(null)} />
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 12} fill={theme.textDim}
                fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
                {callout.label1}
              </SvgText>
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 26} fill={theme.textPrimary}
                fontSize={10} fontFamily="DMSans_700Bold" textAnchor="middle">
                {callout.label2}
              </SvgText>
            </>
          );
        })()}
      </Svg>
    </Animated.View>
  );
}

function CalorieBarChart({ data, calTarget, theme, color }: {
  data: { date: string, cal: number }[],
  calTarget: number,
  theme: any,
  color?: string,
}) {
  const [callout, setCallout] = useState<{ x: number; y: number; label1: string; label2: string } | null>(null);
  const { slideAnim } = useChartAnim(data.length > 0);

  if (data.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="flame-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No calorie data yet</Text>
      </View>
    );
  }

  const maxCal = Math.max(...data.map(d => d.cal), 1);
  const ticks = niceYTicks(0, maxCal, 4);
  const tickMax = ticks[ticks.length - 1];

  const chartH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const plotLeft = CHART_PAD_LEFT;
  const plotRight = CHART_WIDTH - CHART_PAD_RIGHT;
  const plotW = plotRight - plotLeft;
  const chartBottom = CHART_PAD_TOP + chartH;

  const toY = (v: number) => CHART_PAD_TOP + (1 - v / tickMax) * chartH;
  const midIdx = Math.floor(data.length / 2);

  const BAR_W = Math.min(16, plotW / data.length - 3);
  const slot = plotW / data.length;
  const fmtK = (v: number) => v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`;

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
        ))}

        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmtK(tick)}
          </SvgText>
        ))}

        {data.map((d, i) => {
          const barColor = color ?? '#e06840';
          const barH = Math.max(2, (d.cal / tickMax) * chartH);
          const x = plotLeft + i * slot + (slot - BAR_W) / 2;
          const cx = x + BAR_W / 2;
          return (
            <Rect key={i} x={x} y={chartBottom - barH} width={BAR_W} height={barH}
              fill={barColor} opacity={0.85} rx={2}
              onPress={() => setCallout(prev =>
                prev?.label1 === fmtDate(d.date) ? null :
                { x: cx, y: chartBottom - barH, label1: fmtDate(d.date), label2: `${Math.round(d.cal).toLocaleString()} kcal` }
              )} />
          );
        })}

        <SvgText x={plotLeft} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">
          {fmtDate(data[0].date)}
        </SvgText>
        {data.length > 10 && (
          <SvgText x={plotLeft + (midIdx / data.length) * plotW + slot / 2} y={CHART_HEIGHT}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
            {fmtDate(data[midIdx].date)}
          </SvgText>
        )}
        <SvgText x={plotRight} y={CHART_HEIGHT} fill={theme.textDim}
          fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
          {fmtDate(data[data.length - 1].date)}
        </SvgText>

        {callout !== null && (() => {
          const cPillW = Math.max(callout.label1.length, callout.label2.length) * 6 + 14;
          const cPillH = 32;
          const cPillX = Math.min(Math.max(callout.x - cPillW / 2, plotLeft), plotRight - cPillW);
          const cPillY = Math.max(CHART_PAD_TOP - 2, callout.y - cPillH - 10);
          return (
            <>
              <Rect x={cPillX} y={cPillY} width={cPillW} height={cPillH}
                fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6}
                onPress={() => setCallout(null)} />
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 12} fill={theme.textDim}
                fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
                {callout.label1}
              </SvgText>
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 26} fill={theme.textPrimary}
                fontSize={10} fontFamily="DMSans_700Bold" textAnchor="middle">
                {callout.label2}
              </SvgText>
            </>
          );
        })()}
      </Svg>
    </Animated.View>
  );
}

function GenericBarChart({ data, color, unit, theme, fmtY, fmtFull, startFromZero = true }: {
  data: { date: string, value: number }[],
  color: string,
  unit: string,
  theme: any,
  fmtY?: (v: number) => string,
  fmtFull?: (v: number) => string,
  startFromZero?: boolean,
}) {
  const [callout, setCallout] = useState<{ x: number; y: number; label1: string; label2: string } | null>(null);
  const { slideAnim } = useChartAnim(data.length > 0);

  if (data.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="analytics-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>Not enough data yet</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minVal = startFromZero ? 0 : Math.min(...values);
  const maxVal = Math.max(...values);
  const ticks = niceYTicks(minVal, maxVal, 4);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1] || 1;
  const tickRange = tickMax - tickMin || 1;
  const fmt = fmtY ?? ((v: number) => `${Math.round(v)}`);
  const fmtFull_ = fmtFull ?? fmt;

  const chartH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const plotLeft = CHART_PAD_LEFT;
  const plotRight = CHART_WIDTH - CHART_PAD_RIGHT;
  const plotW = plotRight - plotLeft;
  const chartBottom = CHART_PAD_TOP + chartH;
  const toY = (v: number) => CHART_PAD_TOP + (1 - (v - tickMin) / tickRange) * chartH;
  const midIdx = Math.floor(data.length / 2);
  const BAR_W = Math.min(16, plotW / data.length - 3);
  const slot = plotW / data.length;

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={theme.borderSubtle} strokeWidth={1} />
        ))}
        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmt(tick)}
          </SvgText>
        ))}
        {data.map((d, i) => {
          const barH = Math.max(2, ((d.value - tickMin) / tickRange) * chartH);
          const x = plotLeft + i * slot + (slot - BAR_W) / 2;
          const cx = x + BAR_W / 2;
          return (
            <Rect key={i} x={x} y={chartBottom - barH} width={BAR_W} height={barH}
              fill={color} opacity={0.85} rx={2}
              onPress={() => setCallout(prev =>
                prev?.label1 === fmtDate(d.date) ? null :
                { x: cx, y: chartBottom - barH, label1: fmtDate(d.date), label2: `${fmtFull_(d.value)}${unit}` }
              )} />
          );
        })}
        <SvgText x={plotLeft} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">
          {fmtDate(data[0].date)}
        </SvgText>
        {data.length > 10 && (
          <SvgText x={plotLeft + (midIdx / data.length) * plotW + slot / 2} y={CHART_HEIGHT}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
            {fmtDate(data[midIdx].date)}
          </SvgText>
        )}
        <SvgText x={plotRight} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
          {fmtDate(data[data.length - 1].date)}
        </SvgText>
        {callout !== null && (() => {
          const cPillW = Math.max(callout.label1.length, callout.label2.length) * 6 + 14;
          const cPillH = 32;
          const cPillX = Math.min(Math.max(callout.x - cPillW / 2, plotLeft), plotRight - cPillW);
          const cPillY = Math.max(CHART_PAD_TOP - 2, callout.y - cPillH - 10);
          return (
            <>
              <Rect x={cPillX} y={cPillY} width={cPillW} height={cPillH}
                fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6}
                onPress={() => setCallout(null)} />
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 12} fill={theme.textDim}
                fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{callout.label1}</SvgText>
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 26} fill={theme.textPrimary}
                fontSize={10} fontFamily="DMSans_700Bold" textAnchor="middle">{callout.label2}</SvgText>
            </>
          );
        })()}
      </Svg>
    </Animated.View>
  );
}

function MacroBarChart({ data, theme, proteinColor, carbsColor, fatColor }: {
  data: { date: string; protein: number; carbs: number; fat: number }[],
  theme: any,
  proteinColor?: string,
  carbsColor?: string,
  fatColor?: string,
}) {
  const pColor = proteinColor ?? MACRO_PROTEIN;
  const cColor = carbsColor ?? MACRO_CARBS;
  const fColor = fatColor ?? MACRO_FAT;
  const [callout, setCallout] = useState<{ x: number; y: number; date: string; protein: number; carbs: number; fat: number } | null>(null);
  const { slideAnim } = useChartAnim(data.length > 0);

  if (data.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="nutrition-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No macro data yet</Text>
      </View>
    );
  }

  const maxTotal = Math.max(...data.map(d => d.protein + d.carbs + d.fat), 1);
  const ticks = niceYTicks(0, maxTotal, 4);
  const tickMax = ticks[ticks.length - 1];

  const chartH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const plotLeft = CHART_PAD_LEFT;
  const plotRight = CHART_WIDTH - CHART_PAD_RIGHT;
  const plotW = plotRight - plotLeft;
  const chartBottom = CHART_PAD_TOP + chartH;

  const toH = (v: number) => Math.max(0, (v / tickMax) * chartH);
  const toY  = (v: number) => CHART_PAD_TOP + (1 - v / tickMax) * chartH;
  const midIdx = Math.floor(data.length / 2);

  const BAR_W = Math.min(16, plotW / data.length - 3);
  const slot = plotW / data.length;

  return (
    <>
      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

          {ticks.map((tick, i) => (
            <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
              stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
          ))}

          {ticks.map((tick, i) => (
            <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
              fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
              {`${Math.round(tick)}g`}
            </SvgText>
          ))}

          {data.map((d, i) => {
            const x = plotLeft + i * slot + (slot - BAR_W) / 2;
            const cx = x + BAR_W / 2;
            const pH = toH(d.protein);
            const cH = toH(d.carbs);
            const fH = toH(d.fat);
            const totalH = pH + cH + fH;
            return [
              <Rect key={`p${i}`} x={x} y={chartBottom - pH}           width={BAR_W} height={pH} fill={pColor} opacity={0.9} />,
              <Rect key={`c${i}`} x={x} y={chartBottom - pH - cH}      width={BAR_W} height={cH} fill={cColor} opacity={0.9} />,
              <Rect key={`f${i}`} x={x} y={chartBottom - pH - cH - fH} width={BAR_W} height={fH} fill={fColor} opacity={0.9} rx={2} />,
              <Rect key={`t${i}`} x={x} y={chartBottom - totalH}       width={BAR_W} height={Math.max(totalH, 12)}
                fill="transparent"
                onPress={() => setCallout(prev =>
                  prev?.date === fmtDate(d.date) ? null :
                  { x: cx, y: chartBottom - totalH, date: fmtDate(d.date), protein: Math.round(d.protein), carbs: Math.round(d.carbs), fat: Math.round(d.fat) }
                )} />,
            ];
          })}

          <SvgText x={plotLeft} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">
            {fmtDate(data[0].date)}
          </SvgText>
          {data.length > 10 && (
            <SvgText x={plotLeft + (midIdx / data.length) * plotW + slot / 2} y={CHART_HEIGHT}
              fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
              {fmtDate(data[midIdx].date)}
            </SvgText>
          )}
          <SvgText x={plotRight} y={CHART_HEIGHT} fill={theme.textDim}
            fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmtDate(data[data.length - 1].date)}
          </SvgText>

          {callout !== null && (() => {
            const maxG = Math.max(callout.protein, callout.carbs, callout.fat);
            const cPillW = Math.max(String(maxG).length * 7 + 52, 72);
            const cPillH = 62;
            const cPillX = Math.min(Math.max(callout.x - cPillW / 2, plotLeft), plotRight - cPillW);
            const cPillY = Math.max(CHART_PAD_TOP - 2, callout.y - cPillH - 10);
            const tx = cPillX + 10;
            return (
              <>
                <Rect x={cPillX} y={cPillY} width={cPillW} height={cPillH}
                  fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6}
                  onPress={() => setCallout(null)} />
                <SvgText x={cPillX + cPillW / 2} y={cPillY + 13} fill={theme.textDim}
                  fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
                  {callout.date}
                </SvgText>
                <SvgText x={tx} y={cPillY + 27} fill={pColor} fontSize={9} fontFamily="DMSans_700Bold">
                  {`P  ${callout.protein}g`}
                </SvgText>
                <SvgText x={tx} y={cPillY + 41} fill={cColor} fontSize={9} fontFamily="DMSans_700Bold">
                  {`C  ${callout.carbs}g`}
                </SvgText>
                <SvgText x={tx} y={cPillY + 55} fill={fColor} fontSize={9} fontFamily="DMSans_700Bold">
                  {`F  ${callout.fat}g`}
                </SvgText>
              </>
            );
          })()}
        </Svg>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
        {[
          { color: pColor, label: 'Protein' },
          { color: cColor, label: 'Carbs' },
          { color: fColor, label: 'Fat' },
        ].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function WorkoutFrequencyChart({ data, theme }: {
  data: { date: string, hadWorkout: boolean }[],
  theme: any,
}) {
  const weeks: { label: string, count: number }[] = [];
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7);
    weeks.push({ label: fmtDate(chunk[0].date), count: chunk.filter(d => d.hadWorkout).length });
  }

  const firstNonZero = weeks.findIndex(w => w.count > 0);
  const visibleWeeks = firstNonZero > 0 ? weeks.slice(firstNonZero) : weeks;

  const [callout, setCallout] = useState<{ x: number; y: number; label1: string; label2: string } | null>(null);
  const { slideAnim } = useChartAnim(visibleWeeks.length > 0);

  if (visibleWeeks.length === 0) {
    return (
      <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ionicons name="barbell-outline" size={24} color={theme.iconMuted} />
        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No workout data yet</Text>
      </View>
    );
  }

  const chartH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const plotLeft = CHART_PAD_LEFT;
  const plotRight = CHART_WIDTH - CHART_PAD_RIGHT;
  const plotW = plotRight - plotLeft;
  const chartBottom = CHART_PAD_TOP + chartH;
  const maxY = 7;

  const toY = (v: number) => CHART_PAD_TOP + (1 - v / maxY) * chartH;
  const fixedTicks = [0, 2, 4, 7];

  const BAR_W = Math.min(28, plotW / visibleWeeks.length - 4);
  const slot = plotW / visibleWeeks.length;

  return (
    <>
      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

          {fixedTicks.map((tick, i) => (
            <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
              stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
          ))}

          {fixedTicks.map((tick, i) => (
            <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
              fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
              {tick}
            </SvgText>
          ))}

          {visibleWeeks.map((w, i) => {
            const barH = Math.max(2, (w.count / maxY) * chartH);
            const x = plotLeft + i * slot + (slot - BAR_W) / 2;
            const cx = x + BAR_W / 2;
            const barColor = w.count >= 5 ? theme.statusGood : w.count >= 3 ? theme.accentBlue : w.count > 0 ? theme.statusWarn : theme.borderSubtle;
            const dayLabel = w.count === 1 ? '1 day' : `${w.count} days`;
            return (
              <Rect key={i} x={x} y={chartBottom - barH} width={BAR_W} height={barH}
                fill={barColor} opacity={0.85} rx={3}
                onPress={() => setCallout(prev =>
                  prev?.label1 === w.label ? null :
                  { x: cx, y: chartBottom - barH, label1: w.label, label2: dayLabel }
                )} />
            );
          })}

          {visibleWeeks.length <= 8 ? (
            visibleWeeks.map((w, i) => (
              <SvgText key={i} x={plotLeft + i * slot + slot / 2} y={CHART_HEIGHT}
                fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
                {w.label}
              </SvgText>
            ))
          ) : (
            <>
              <SvgText x={plotLeft} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">
                {visibleWeeks[0].label}
              </SvgText>
              <SvgText x={plotRight} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
                {visibleWeeks[visibleWeeks.length - 1].label}
              </SvgText>
            </>
          )}

          {callout !== null && (() => {
            const cPillW = Math.max(callout.label1.length, callout.label2.length) * 6 + 14;
            const cPillH = 32;
            const cPillX = Math.min(Math.max(callout.x - cPillW / 2, plotLeft), plotRight - cPillW);
            const cPillY = Math.max(CHART_PAD_TOP - 2, callout.y - cPillH - 10);
            return (
              <>
                <Rect x={cPillX} y={cPillY} width={cPillW} height={cPillH}
                  fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6}
                  onPress={() => setCallout(null)} />
                <SvgText x={cPillX + cPillW / 2} y={cPillY + 12} fill={theme.textDim}
                  fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">
                  {callout.label1}
                </SvgText>
                <SvgText x={cPillX + cPillW / 2} y={cPillY + 26} fill={theme.textPrimary}
                  fontSize={10} fontFamily="DMSans_700Bold" textAnchor="middle">
                  {callout.label2}
                </SvgText>
              </>
            );
          })()}
        </Svg>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
        {[
          { color: theme.statusGood, label: '5+ days' },
          { color: theme.accentBlue, label: '3-4 days' },
          { color: theme.statusWarn, label: '1-2 days' },
        ].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

export function StatsGraphCard({ card, cardTrendData, theme, calTarget, stepGoal, sleepGoal, onPeriodChange, onEditPress, homeMode = false }: {
  card: StatsCard;
  cardTrendData: TrendData;
  theme: any;
  calTarget: number;
  stepGoal: number;
  sleepGoal: number;
  onPeriodChange?: (cardId: string, period: CardPeriod) => void;
  onEditPress?: (card: StatsCard) => void;
  homeMode?: boolean;
}) {
  const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 };

  const getChart = () => {
    const ct = card.chartType;
    const gc = card.color;
    switch (card.dataKey) {
      case 'weight':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.weight} color={gc ?? theme.textSecondary} unit=" lbs"
              fmtY={(v) => v % 1 === 0 ? `${v}` : `${v.toFixed(1)}`}
              fmtFull={(v) => v % 1 === 0 ? `${v}` : `${v.toFixed(1)}`} startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.weight} color={gc ?? theme.textSecondary} unit=" lbs"
              fmtY={(v) => v % 1 === 0 ? `${v}` : `${v.toFixed(1)}`} gradientId={`wt_${card.id}`} theme={theme} />;
      case 'calories':
        return ct === 'line'
          ? <LineChart data={cardTrendData.cal.map(d => ({ date: d.date, value: d.cal }))} color={gc ?? '#e06840'} unit=" kcal"
              fmtY={(v) => v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`}
              fmtFull={(v) => Math.round(v).toLocaleString()} gradientId={`cl_${card.id}`} theme={theme} />
          : <CalorieBarChart data={cardTrendData.cal} calTarget={calTarget} theme={theme} color={gc} />;
      case 'macros':
        return <MacroBarChart data={cardTrendData.macro} theme={theme}
          proteinColor={card.macroColors?.protein} carbsColor={card.macroColors?.carbs} fatColor={card.macroColors?.fat} />;
      case 'steps':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.steps} color={gc ?? theme.accentBlue} unit=""
              fmtY={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`}
              fmtFull={(v) => Math.round(v).toLocaleString()} theme={theme} />
          : <LineChart data={cardTrendData.steps} color={gc ?? theme.accentBlue} unit=""
              goalValue={stepGoal} fmtY={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`}
              fmtFull={(v) => Math.round(v).toLocaleString()} gradientId={`st_${card.id}`} theme={theme} />;
      case 'activeCals':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.activeCal} color={gc ?? theme.statusWarn} unit=" kcal"
              fmtY={(v) => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.activeCal} color={gc ?? theme.statusWarn} unit=" kcal"
              fmtY={(v) => `${Math.round(v)}`} gradientId={`ac_${card.id}`} theme={theme} />;
      case 'sleep':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.sleep} color={gc ?? theme.sleepRem} unit=""
              fmtY={(v) => `${Math.round(v * 10) / 10}h`}
              fmtFull={(v) => { const h = Math.floor(v); const m = Math.round((v % 1) * 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; }}
              startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.sleep} color={gc ?? theme.sleepRem} unit=""
              goalValue={sleepGoal} fmtY={(v) => `${Math.round(v * 10) / 10}h`}
              fmtFull={(v) => { const h = Math.floor(v); const m = Math.round((v % 1) * 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; }}
              gradientId={`sl_${card.id}`} theme={theme} />;
      case 'workoutFreq':
        return <WorkoutFrequencyChart data={cardTrendData.workoutDay} theme={theme} />;
      case 'water':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.water} color={gc ?? '#06b6d4'} unit=" oz" fmtY={v => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.water} color={gc ?? '#06b6d4'} unit=" oz" fmtY={v => `${Math.round(v)}`} gradientId={`wtr_${card.id}`} theme={theme} />;
      case 'netCalories':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.netCal} color={gc ?? '#e06840'} unit=" kcal" fmtY={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.netCal} color={gc ?? '#e06840'} unit=" kcal" fmtY={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`} fmtFull={v => Math.round(v).toLocaleString()} gradientId={`ncl_${card.id}`} theme={theme} />;
      case 'sleepScore':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.sleepScore} color={gc ?? '#8b5cf6'} unit="" fmtY={v => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.sleepScore} color={gc ?? '#8b5cf6'} unit="" goalValue={85} fmtY={v => `${Math.round(v)}`} gradientId={`ss_${card.id}`} theme={theme} />;
      case 'restingHR':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.restingHR} color={gc ?? '#ef4444'} unit=" bpm" fmtY={v => `${Math.round(v)}`} startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.restingHR} color={gc ?? '#ef4444'} unit=" bpm" fmtY={v => `${Math.round(v)}`} gradientId={`rhr_${card.id}`} theme={theme} />;
      case 'respiratoryRate':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.respiratoryRate} color={gc ?? '#06b6d4'} unit=" br/min" fmtY={v => `${Math.round(v * 10) / 10}`} startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.respiratoryRate} color={gc ?? '#06b6d4'} unit=" br/min" fmtY={v => `${Math.round(v * 10) / 10}`} gradientId={`rr_${card.id}`} theme={theme} />;
      case 'bloodOxygen':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.bloodOxygen} color={gc ?? '#ef4444'} unit="%" fmtY={v => `${Math.round(v * 10) / 10}%`} startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.bloodOxygen} color={gc ?? '#ef4444'} unit="%" fmtY={v => `${Math.round(v * 10) / 10}%`} gradientId={`bo_${card.id}`} theme={theme} />;
      case 'bodyFatPct':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.bodyFatPct} color={gc ?? '#f97316'} unit="%" fmtY={v => `${Math.round(v * 10) / 10}%`} startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.bodyFatPct} color={gc ?? '#f97316'} unit="%" fmtY={v => `${Math.round(v * 10) / 10}%`} gradientId={`bf_${card.id}`} theme={theme} />;
      case 'exerciseMinutes':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.exerciseMinutes} color={gc ?? '#10b981'} unit=" min" fmtY={v => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.exerciseMinutes} color={gc ?? '#10b981'} unit=" min" fmtY={v => `${Math.round(v)}`} gradientId={`em_${card.id}`} theme={theme} />;
      case 'fiber':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.fiber} color={gc ?? '#10b981'} unit="g" fmtY={v => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.fiber} color={gc ?? '#10b981'} unit="g" fmtY={v => `${Math.round(v)}`} gradientId={`fb_${card.id}`} theme={theme} />;
      case 'sodium':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.sodium} color={gc ?? '#8b5cf6'} unit=" mg" fmtY={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.sodium} color={gc ?? '#8b5cf6'} unit=" mg" fmtY={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`} fmtFull={v => `${Math.round(v).toLocaleString()} mg`} gradientId={`sod_${card.id}`} theme={theme} />;
      case 'cholesterol':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.cholesterol} color={gc ?? '#14b8a6'} unit=" mg" fmtY={v => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.cholesterol} color={gc ?? '#14b8a6'} unit=" mg" fmtY={v => `${Math.round(v)}`} gradientId={`cho_${card.id}`} theme={theme} />;
      case 'saturatedFat':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.saturatedFat} color={gc ?? '#f97316'} unit="g" fmtY={v => `${Math.round(v)}`} theme={theme} />
          : <LineChart data={cardTrendData.saturatedFat} color={gc ?? '#f97316'} unit="g" fmtY={v => `${Math.round(v)}`} gradientId={`sf_${card.id}`} theme={theme} />;
      default:
        return null;
    }
  };

  const getStats = (): { label: string; value: string }[] | undefined => {
    const d = cardTrendData;
    switch (card.dataKey) {
      case 'weight': {
        if (d.weight.length === 0) return undefined;
        const avg = Math.round(d.weight.reduce((s, x) => s + x.value, 0) / d.weight.length * 10) / 10;
        const change = d.weight.length >= 2 ? Math.round((d.weight[d.weight.length - 1].value - d.weight[0].value) * 10) / 10 : null;
        return [
          { label: 'Avg Weight', value: `${avg} lbs` },
          ...(change !== null ? [{ label: 'Change This Period', value: `${change > 0 ? '+' : ''}${change} lbs` }] : []),
        ];
      }
      case 'calories': {
        if (d.cal.length === 0) return undefined;
        const avg = Math.round(d.cal.reduce((s, x) => s + x.cal, 0) / d.cal.length);
        return [{ label: 'Avg / Day', value: `${avg.toLocaleString()} kcal` }, { label: 'Days Logged', value: `${d.cal.length}` }];
      }
      case 'macros': {
        if (d.macro.length === 0) return undefined;
        const avgP = Math.round(d.macro.reduce((s, x) => s + x.protein, 0) / d.macro.length * 10) / 10;
        const avgC = Math.round(d.macro.reduce((s, x) => s + x.carbs, 0) / d.macro.length * 10) / 10;
        const avgF = Math.round(d.macro.reduce((s, x) => s + x.fat, 0) / d.macro.length * 10) / 10;
        return [{ label: 'Avg Protein', value: `${avgP}g` }, { label: 'Avg Carbs', value: `${avgC}g` }, { label: 'Avg Fat', value: `${avgF}g` }];
      }
      case 'steps': {
        if (d.steps.length === 0) return undefined;
        const avg = Math.round(d.steps.reduce((s, x) => s + x.value, 0) / d.steps.length);
        const above = d.steps.filter(x => x.value >= stepGoal).length;
        return [{ label: 'Avg / Day', value: avg.toLocaleString() }, { label: 'Days Above Goal', value: `${above}` }];
      }
      case 'activeCals': {
        if (d.activeCal.length === 0) return undefined;
        const avg = Math.round(d.activeCal.reduce((s, x) => s + x.value, 0) / d.activeCal.length);
        return [{ label: 'Avg / Day', value: `${avg.toLocaleString()} kcal` }, { label: 'Days Tracked', value: `${d.activeCal.length}` }];
      }
      case 'sleep': {
        if (d.sleep.length === 0) return undefined;
        const avg = Math.round(d.sleep.reduce((s, x) => s + x.value, 0) / d.sleep.length * 10) / 10;
        const atGoal = d.sleep.filter(x => x.value >= sleepGoal).length;
        const h = Math.floor(avg); const m = Math.round((avg % 1) * 60);
        return [{ label: 'Avg / Night', value: m > 0 ? `${h}h ${m}m` : `${h}h` }, { label: 'Nights at Goal', value: `${atGoal}` }];
      }
      case 'workoutFreq': {
        if (d.workoutDay.length === 0) return undefined;
        const total = d.workoutDay.filter(x => x.hadWorkout).length;
        const weeks = Math.max(1, Math.ceil(d.workoutDay.length / 7));
        return [{ label: 'Avg / Week', value: `${Math.round(total / weeks * 10) / 10}` }, { label: 'Total Workout Days', value: `${total}` }];
      }
      case 'water': {
        if (d.water.length === 0) return undefined;
        const avg = Math.round(d.water.reduce((s, x) => s + x.value, 0) / d.water.length);
        return [{ label: 'Avg / Day', value: `${avg} oz` }, { label: 'Days Tracked', value: `${d.water.length}` }];
      }
      case 'netCalories': {
        if (d.netCal.length === 0) return undefined;
        const avg = Math.round(d.netCal.reduce((s, x) => s + x.value, 0) / d.netCal.length);
        return [{ label: 'Avg / Day', value: `${avg.toLocaleString()} kcal` }, { label: 'Days Logged', value: `${d.netCal.length}` }];
      }
      case 'sleepScore': {
        if (d.sleepScore.length === 0) return undefined;
        const avg = Math.round(d.sleepScore.reduce((s, x) => s + x.value, 0) / d.sleepScore.length);
        const wellRested = d.sleepScore.filter(x => x.value >= 85).length;
        return [{ label: 'Avg Score', value: `${avg}` }, { label: 'Well Rested Nights', value: `${wellRested}` }];
      }
      case 'restingHR': {
        if (d.restingHR.length === 0) return undefined;
        const avg = Math.round(d.restingHR.reduce((s, x) => s + x.value, 0) / d.restingHR.length);
        const min = Math.min(...d.restingHR.map(x => x.value));
        return [{ label: 'Avg', value: `${avg} bpm` }, { label: 'Lowest', value: `${min} bpm` }];
      }
      case 'respiratoryRate': {
        if (d.respiratoryRate.length === 0) return undefined;
        const avg = Math.round(d.respiratoryRate.reduce((s, x) => s + x.value, 0) / d.respiratoryRate.length * 10) / 10;
        return [{ label: 'Avg', value: `${avg} br/min` }, { label: 'Days Tracked', value: `${d.respiratoryRate.length}` }];
      }
      case 'bloodOxygen': {
        if (d.bloodOxygen.length === 0) return undefined;
        const avg = Math.round(d.bloodOxygen.reduce((s, x) => s + x.value, 0) / d.bloodOxygen.length * 10) / 10;
        const min = Math.round(Math.min(...d.bloodOxygen.map(x => x.value)) * 10) / 10;
        return [{ label: 'Avg', value: `${avg}%` }, { label: 'Lowest', value: `${min}%` }];
      }
      case 'bodyFatPct': {
        if (d.bodyFatPct.length === 0) return undefined;
        const latest = Math.round(d.bodyFatPct[d.bodyFatPct.length - 1].value * 10) / 10;
        const change = d.bodyFatPct.length >= 2
          ? Math.round((d.bodyFatPct[d.bodyFatPct.length - 1].value - d.bodyFatPct[0].value) * 10) / 10
          : null;
        return [
          { label: 'Latest', value: `${latest}%` },
          ...(change !== null ? [{ label: 'Change This Period', value: `${change > 0 ? '+' : ''}${change}%` }] : []),
        ];
      }
      case 'exerciseMinutes': {
        if (d.exerciseMinutes.length === 0) return undefined;
        const avg = Math.round(d.exerciseMinutes.reduce((s, x) => s + x.value, 0) / d.exerciseMinutes.length);
        const total = Math.round(d.exerciseMinutes.reduce((s, x) => s + x.value, 0));
        return [{ label: 'Avg / Day', value: `${avg} min` }, { label: 'Total This Period', value: `${total} min` }];
      }
      case 'fiber': {
        if (d.fiber.length === 0) return undefined;
        const avg = Math.round(d.fiber.reduce((s, x) => s + x.value, 0) / d.fiber.length * 10) / 10;
        return [{ label: 'Avg / Day', value: `${avg}g` }, { label: 'Days Tracked', value: `${d.fiber.length}` }];
      }
      case 'sodium': {
        if (d.sodium.length === 0) return undefined;
        const avg = Math.round(d.sodium.reduce((s, x) => s + x.value, 0) / d.sodium.length);
        return [{ label: 'Avg / Day', value: `${avg.toLocaleString()} mg` }, { label: 'Days Tracked', value: `${d.sodium.length}` }];
      }
      case 'cholesterol': {
        if (d.cholesterol.length === 0) return undefined;
        const avg = Math.round(d.cholesterol.reduce((s, x) => s + x.value, 0) / d.cholesterol.length);
        return [{ label: 'Avg / Day', value: `${avg} mg` }, { label: 'Days Tracked', value: `${d.cholesterol.length}` }];
      }
      case 'saturatedFat': {
        if (d.saturatedFat.length === 0) return undefined;
        const avg = Math.round(d.saturatedFat.reduce((s, x) => s + x.value, 0) / d.saturatedFat.length * 10) / 10;
        return [{ label: 'Avg / Day', value: `${avg}g` }, { label: 'Days Tracked', value: `${d.saturatedFat.length}` }];
      }
      default: return undefined;
    }
  };

  const stats = getStats();
  const iconName = card.dataKey ? DATA_KEY_META[card.dataKey].icon : 'analytics-outline';

  return (
    <View style={{ borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name={iconName as any} size={11} color={theme.textMuted} />
        <Text style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, flex: 1, marginLeft: 6 }}>{card.label}</Text>
        <View style={{ flexDirection: 'row', gap: 4, marginRight: homeMode ? 0 : 8 }}>
          {([7, 30, 90] as CardPeriod[]).map(p => (
            <TouchableOpacity key={p} onPress={() => onPeriodChange?.(card.id, p)}
              style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
                backgroundColor: card.period === p ? theme.accentBlueBg : 'transparent',
                borderWidth: 1, borderColor: card.period === p ? theme.accentBlueBorder : theme.borderInput }}>
              <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: card.period === p ? theme.accentBlue : theme.textMuted }}>
                {p}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!homeMode && (
          <TouchableOpacity onPress={() => onEditPress?.(card)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="settings-outline" size={13} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {getChart()}
      {stats && stats.length > 0 && (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, flexDirection: 'row' }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, letterSpacing: 1.5, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 3, textAlign: 'center' }}>{s.label}</Text>
              <Text style={{ fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' }}>{s.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
