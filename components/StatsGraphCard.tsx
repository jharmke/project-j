import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { ADVANCED_NUTRIENTS, CardPeriod, DATA_KEY_META, NUTRIENT_CATEGORIES, StatsCard } from '../statsCardRegistry';
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

// Net calorie semantic color: deficit = green (on track for a cut), surplus =
// amber, red when large. Shared by the net cal bar + line so they never drift.
const netSignColor = (v: number, theme: any) =>
  v < 0 ? (theme.accentGreen ?? '#0d9268') : (v > 300 ? (theme.accentRed ?? '#cc3333') : '#d4860a');

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

// Net calorie bar chart with a dynamic zero baseline. The zero line floats to
// wherever 0 falls within the actual data range, so the chart uses its full
// height no matter the distribution. Deficit bars hang below zero (green),
// surplus bars rise above it (amber, or red when large). Mirrors the locked
// NetCalBarChart spec.
function NetCalBarChart({ data, theme, fmtFull }: {
  data: { date: string; value: number }[],
  theme: any,
  fmtFull?: (v: number) => string,
}) {
  const [callout, setCallout] = useState<{ x: number; v: number; label1: string; label2: string } | null>(null);
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
  // Range always includes zero so the baseline is on-chart.
  const rangeMin = Math.min(0, ...values);
  const rangeMax = Math.max(0, ...values);
  const ticks = niceYTicks(rangeMin, rangeMax, 4);
  const tickMin = ticks[0];
  const tickMax = ticks[ticks.length - 1] || 1;
  const tickRange = tickMax - tickMin || 1;
  const fmtY = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
  const fmtFull_ = fmtFull ?? ((v: number) => Math.round(v).toLocaleString());

  const chartH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const plotLeft = CHART_PAD_LEFT;
  const plotRight = CHART_WIDTH - CHART_PAD_RIGHT;
  const plotW = plotRight - plotLeft;
  const toY = (v: number) => CHART_PAD_TOP + (1 - (v - tickMin) / tickRange) * chartH;
  const zeroY = toY(0);
  const midIdx = Math.floor(data.length / 2);
  const BAR_W = Math.min(16, plotW / data.length - 3);
  const slot = plotW / data.length;

  const barColor = (v: number) => netSignColor(v, theme);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={tick === 0 ? theme.textDim : theme.borderSubtle} strokeWidth={1} opacity={tick === 0 ? 0.55 : 1} />
        ))}
        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmtY(tick)}
          </SvgText>
        ))}
        {data.map((d, i) => {
          const v = d.value;
          const valY = toY(v);
          let barH = Math.abs(valY - zeroY);
          if (barH < 2) barH = 2;
          const drawTop = v >= 0 ? zeroY - barH : zeroY;
          const x = plotLeft + i * slot + (slot - BAR_W) / 2;
          return (
            <Rect key={i} x={x} y={drawTop} width={BAR_W} height={barH}
              fill={barColor(v)} opacity={0.85} rx={2} />
          );
        })}
        {/* Full-height transparent hit targets: tapping anywhere in a day's
            column selects it, so tiny near-zero bars are still easy to hit. */}
        {data.map((d, i) => {
          const cx = plotLeft + i * slot + slot / 2;
          return (
            <Rect key={`hit${i}`} x={plotLeft + i * slot} y={CHART_PAD_TOP} width={slot} height={chartH}
              fill="transparent"
              onPress={() => setCallout(prev =>
                prev?.label1 === fmtDate(d.date) ? null :
                { x: cx, v: d.value, label1: fmtDate(d.date), label2: `${fmtFull_(d.value)} kcal` }
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
          // Anchor on the opposite side of zero from the bar so the pill never
          // covers the tapped bar: deficit -> above the zero line, surplus -> below.
          const cPillY = callout.v < 0
            ? Math.max(CHART_PAD_TOP - 2, zeroY - cPillH - 10)
            : Math.min(CHART_HEIGHT - cPillH - 2, zeroY + 10);
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

// Net calorie line chart. Semantic, not color-customizable: neutral line, an
// emphasized zero baseline, and dots colored by sign (green deficit / amber-red
// surplus) so above/below zero reads at a glance.
function NetCalLineChart({ data, theme, gradientId }: {
  data: { date: string; value: number }[],
  theme: any,
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
  // Range always includes zero so the baseline is on-chart.
  const dataMin = Math.min(0, ...values);
  const dataMax = Math.max(0, ...values);
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

  const lineColor = theme.textSecondary;
  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const midIdx = Math.floor(data.length / 2);
  const fmtY = (v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
  const fmtFull = (v: number) => Math.round(v).toLocaleString();

  const areaPath =
    `M ${toX(0)},${toY(data[0].value)} ` +
    data.slice(1).map((d, i) => `L ${toX(i + 1)},${toY(d.value)}`).join(' ') +
    ` L ${toX(data.length - 1)},${chartBottom} L ${toX(0)},${chartBottom} Z`;

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity={0.18} />
            <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />
        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={tick === 0 ? theme.textDim : theme.borderSubtle} strokeWidth={tick === 0 ? 1.5 : 1} opacity={tick === 0 ? 0.6 : 1} />
        ))}
        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{fmtY(tick)}</SvgText>
        ))}
        <Path d={areaPath} fill={`url(#${gradientId})`} />
        <Polyline points={points} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots colored by sign */}
        {data.map((d, i) => (
          <Circle key={`dot${i}`} cx={toX(i)} cy={toY(d.value)} r={3.5} fill={netSignColor(d.value, theme)} />
        ))}
        <SvgText x={plotLeft} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium">{fmtDate(data[0].date)}</SvgText>
        {data.length > 10 && (
          <SvgText x={toX(midIdx)} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{fmtDate(data[midIdx].date)}</SvgText>
        )}
        <SvgText x={plotRight} y={CHART_HEIGHT} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">{fmtDate(data[data.length - 1].date)}</SvgText>
        {/* Invisible tap circles at each data point */}
        {data.map((d, i) => (
          <Circle key={`tap${i}`} cx={toX(i)} cy={toY(d.value)} r={18} fill="transparent"
            onPress={() => setCallout(prev =>
              prev?.label1 === fmtDate(d.date) ? null :
              { x: toX(i), y: toY(d.value), label1: fmtDate(d.date), label2: `${fmtFull(d.value)} kcal` }
            )} />
        ))}
        {callout !== null && (() => {
          const cPillW = Math.max(callout.label1.length, callout.label2.length) * 6 + 14;
          const cPillH = 32;
          const cPillX = Math.min(Math.max(callout.x - cPillW / 2, plotLeft), plotRight - cPillW);
          const cPillY = Math.max(CHART_PAD_TOP - 2, callout.y - cPillH - 10);
          return (
            <>
              <Rect x={cPillX} y={cPillY} width={cPillW} height={cPillH} fill={theme.bgCard} stroke={theme.borderCard} strokeWidth={0.5} rx={6} onPress={() => setCallout(null)} />
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 12} fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="middle">{callout.label1}</SvgText>
              <SvgText x={cPillX + cPillW / 2} y={cPillY + 26} fill={theme.textPrimary} fontSize={10} fontFamily="DMSans_700Bold" textAnchor="middle">{callout.label2}</SvgText>
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

export function StatsGraphCard({ card, cardTrendData, theme, calTarget, stepGoal, sleepGoal, onPeriodChange, onEditPress, onNutrientChange, homeMode = false, showNetCarbs = false, editBtnRef }: {
  card: StatsCard;
  cardTrendData: TrendData;
  theme: any;
  calTarget: number;
  stepGoal: number;
  sleepGoal: number;
  onPeriodChange?: (cardId: string, period: CardPeriod) => void;
  onEditPress?: (card: StatsCard) => void;
  onNutrientChange?: (cardId: string, nutrientKey: string) => void;
  homeMode?: boolean;
  showNetCarbs?: boolean;
  editBtnRef?: React.RefObject<any>;
}) {
  const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 };
  const [nutrientPickerVisible, setNutrientPickerVisible] = useState(false);
  const pickerOverlayAnim = useRef(new Animated.Value(0)).current;
  const pickerScaleAnim = useRef(new Animated.Value(0.92)).current;
  const pickerOpacityAnim = useRef(new Animated.Value(0)).current;

  const openNutrientPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNutrientPickerVisible(true);
    pickerOverlayAnim.setValue(0);
    pickerScaleAnim.setValue(0.92);
    pickerOpacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(pickerOverlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pickerScaleAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pickerOpacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  };

  const closeNutrientPicker = () => {
    Animated.parallel([
      Animated.timing(pickerOverlayAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(pickerScaleAnim, { toValue: 0.92, duration: 140, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pickerOpacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(() => setNutrientPickerVisible(false));
  };

  const selectNutrient = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeNutrientPicker();
    onNutrientChange?.(card.id, key);
  };

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
      case 'macros': {
        const macroData = showNetCarbs
          ? cardTrendData.macro.map(m => {
              const fiberEntry = cardTrendData.fiber.find(f => f.date === m.date);
              const fiber = fiberEntry?.value ?? 0;
              const saEntry = cardTrendData.sugarAlcohols?.find(f => f.date === m.date);
              const sugarAlc = saEntry?.value ?? 0;
              return { ...m, carbs: Math.max(0, m.carbs - Math.round(fiber) - Math.round(sugarAlc)) };
            })
          : cardTrendData.macro;
        return <MacroBarChart data={macroData} theme={theme}
          proteinColor={card.macroColors?.protein} carbsColor={card.macroColors?.carbs} fatColor={card.macroColors?.fat} />;
      }
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
              fmtY={(v) => `${Math.round(v)}`} fmtFull={(v) => Math.round(v).toLocaleString()} theme={theme} />
          : <LineChart data={cardTrendData.activeCal} color={gc ?? theme.statusWarn} unit=" kcal"
              fmtY={(v) => `${Math.round(v)}`} fmtFull={(v) => Math.round(v).toLocaleString()} gradientId={`ac_${card.id}`} theme={theme} />;
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
          ? <NetCalBarChart data={cardTrendData.netCal} fmtFull={v => Math.round(v).toLocaleString()} theme={theme} />
          : <NetCalLineChart data={cardTrendData.netCal} gradientId={`ncl_${card.id}`} theme={theme} />;
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
      case 'effortScore':
        return ct === 'bar'
          ? <GenericBarChart data={cardTrendData.effortScore} color={gc ?? '#f97316'} unit="" fmtY={v => `${Math.round(v)}`} startFromZero={false} theme={theme} />
          : <LineChart data={cardTrendData.effortScore} color={gc ?? '#f97316'} unit="" fmtY={v => `${Math.round(v)}`} gradientId={`ef_${card.id}`} theme={theme} />;
      case 'advancedNutrition': {
        const nk = card.nutrientKey;
        const nutrientDef = nk ? ADVANCED_NUTRIENTS.find(n => n.key === nk) : null;
        const data = nk ? (cardTrendData.nutrients?.[nk] ?? []) : [];
        if (!nutrientDef || data.length === 0) return null;
        const color = gc ?? nutrientDef.defaultColor;
        const unit = nutrientDef.unit;
        const isMg = unit === 'mg';
        const fmtY = isMg
          ? (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
          : (v: number) => `${Math.round(v * 10) / 10}`;
        const fmtFull = isMg
          ? (v: number) => `${Math.round(v).toLocaleString()} mg`
          : (v: number) => `${Math.round(v * 10) / 10} ${unit}`;
        return ct === 'bar'
          ? <GenericBarChart data={data} color={color} unit={` ${unit}`} fmtY={fmtY} fmtFull={fmtFull} theme={theme} />
          : <LineChart data={data} color={color} unit={` ${unit}`} fmtY={fmtY} fmtFull={fmtFull} gradientId={`an_${card.id}`} theme={theme} />;
      }
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
        const avgF = Math.round(d.macro.reduce((s, x) => s + x.fat, 0) / d.macro.length * 10) / 10;
        const avgC = showNetCarbs
          ? Math.round(d.macro.reduce((s, x) => {
              const fiberEntry = d.fiber.find(f => f.date === x.date);
              const fiber = fiberEntry?.value ?? 0;
              const saEntry = d.sugarAlcohols?.find(f => f.date === x.date);
              const sugarAlc = saEntry?.value ?? 0;
              return s + Math.max(0, x.carbs - fiber - sugarAlc);
            }, 0) / d.macro.length * 10) / 10
          : Math.round(d.macro.reduce((s, x) => s + x.carbs, 0) / d.macro.length * 10) / 10;
        return [{ label: 'Avg Protein', value: `${avgP}g` }, { label: showNetCarbs ? 'Avg Net Carbs' : 'Avg Carbs', value: `${avgC}g` }, { label: 'Avg Fat', value: `${avgF}g` }];
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
      case 'effortScore': {
        if (d.effortScore.length === 0) return undefined;
        const avg = Math.round(d.effortScore.reduce((s, x) => s + x.value, 0) / d.effortScore.length * 10) / 10;
        const highEffort = d.effortScore.filter(x => x.value >= 7).length;
        return [{ label: 'Avg Effort', value: `${avg} / 10` }, { label: 'High Effort Days', value: `${highEffort}` }];
      }
      case 'advancedNutrition': {
        const nk = card.nutrientKey;
        const nutrientDef = nk ? ADVANCED_NUTRIENTS.find(n => n.key === nk) : null;
        const arr = nk ? (d.nutrients?.[nk] ?? []) : [];
        if (!nutrientDef || arr.length === 0) return undefined;
        const unit = nutrientDef.unit;
        const avg = arr.reduce((s, x) => s + x.value, 0) / arr.length;
        const fmtVal = unit === 'g'
          ? `${Math.round(avg * 10) / 10}${unit}`
          : `${Math.round(avg).toLocaleString()} ${unit}`;
        return [{ label: 'Avg / Day', value: fmtVal }, { label: 'Days Tracked', value: `${arr.length}` }];
      }
      default: return undefined;
    }
  };

  const stats = getStats();
  const iconName = card.dataKey ? (DATA_KEY_META[card.dataKey]?.icon ?? 'analytics-outline') : 'analytics-outline';

  // Sample-size sublabel: how many data points this card is actually based on.
  // Uniform across every card so averages never hide their sample size.
  const sampleInfo = (() => {
    if (!card.dataKey) return null;
    if (card.dataKey === 'advancedNutrition') {
      const arr = card.nutrientKey ? (cardTrendData.nutrients?.[card.nutrientKey] ?? []) : [];
      return arr.length > 0 ? { count: arr.length, noun: 'day' } : null;
    }
    const arrByKey: Record<string, { date: string }[]> = {
      weight: cardTrendData.weight, calories: cardTrendData.cal, steps: cardTrendData.steps,
      activeCals: cardTrendData.activeCal, sleep: cardTrendData.sleep, macros: cardTrendData.macro,
      water: cardTrendData.water, netCalories: cardTrendData.netCal,
      sleepScore: cardTrendData.sleepScore, restingHR: cardTrendData.restingHR,
      respiratoryRate: cardTrendData.respiratoryRate, bloodOxygen: cardTrendData.bloodOxygen,
      bodyFatPct: cardTrendData.bodyFatPct, exerciseMinutes: cardTrendData.exerciseMinutes,
      effortScore: cardTrendData.effortScore, fiber: cardTrendData.fiber, sodium: cardTrendData.sodium,
      cholesterol: cardTrendData.cholesterol, saturatedFat: cardTrendData.saturatedFat,
    };
    const arr = arrByKey[card.dataKey];
    if (!arr || arr.length === 0) return null;
    const noun = (card.dataKey === 'sleep' || card.dataKey === 'sleepScore') ? 'night' : 'day';
    return { count: arr.length, noun };
  })();

  return (
    <View style={{ borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name={iconName as any} size={11} color={theme.textMuted} />
        <Text style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted, flex: 1, marginLeft: 6 }}>{card.label}</Text>
        <View style={{ flexDirection: 'row', gap: 4, marginRight: homeMode ? 0 : 8 }}>
          {([7, 30, 90] as CardPeriod[]).map(p => (
            <TouchableOpacity key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPeriodChange?.(card.id, p); }}
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
          <TouchableOpacity ref={editBtnRef} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEditPress?.(card); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="settings" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {card.dataKey === 'advancedNutrition' && (
        <TouchableOpacity
          onPress={openNutrientPicker}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
            borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: theme.accentBlue }}>
            {card.nutrientKey ? (ADVANCED_NUTRIENTS.find(n => n.key === card.nutrientKey)?.label ?? 'Select Nutrient') : 'Select Nutrient'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={theme.accentBlue} />
        </TouchableOpacity>
      )}

      <Modal visible={nutrientPickerVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeNutrientPicker}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: pickerOverlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeNutrientPicker} />
        </Animated.View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
          <Animated.View style={{ transform: [{ scale: pickerScaleAnim }], opacity: pickerOpacityAnim,
            width: '88%', maxHeight: '78%', backgroundColor: theme.bgSheet,
            borderRadius: 16, borderWidth: 0.5, borderColor: theme.borderSheet,
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderSubtle, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
              <Text style={{ flex: 1, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.textMuted }}>NUTRIENT</Text>
              <TouchableOpacity onPress={closeNutrientPicker} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {NUTRIENT_CATEGORIES.map(cat => {
                const items = ADVANCED_NUTRIENTS.filter(n => n.category === cat);
                return (
                  <View key={cat}>
                    <Text style={{ fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold',
                      color: theme.textMuted, marginTop: 14, marginBottom: 4, paddingHorizontal: 16 }}>{cat}</Text>
                    {items.map(n => {
                      const selected = card.nutrientKey === n.key;
                      return (
                        <TouchableOpacity key={n.key} onPress={() => selectNutrient(n.key)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11,
                            backgroundColor: selected ? theme.accentBlueBg : 'transparent' }}>
                          <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans_400Regular',
                            color: selected ? theme.accentBlue : theme.textPrimary }}>{n.label}</Text>
                          <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginRight: selected ? 8 : 0 }}>{n.unit}</Text>
                          {selected && <Ionicons name="checkmark" size={16} color={theme.accentBlue} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
              <View style={{ height: 16 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <View key={card.period}>{getChart()}</View>
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
      {sampleInfo && (
        <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 8 }}>
          Based on {sampleInfo.count} {sampleInfo.noun}{sampleInfo.count !== 1 ? 's' : ''} of data
        </Text>
      )}
      {(() => {
        const excMapping: Partial<Record<string, 'diet' | 'water' | 'exercise'>> = {
          calories: 'diet', macros: 'diet', netCalories: 'diet', fiber: 'diet',
          sodium: 'diet', cholesterol: 'diet', saturatedFat: 'diet', advancedNutrition: 'diet',
          water: 'water',
          activeCals: 'exercise', workoutFreq: 'exercise', exerciseMinutes: 'exercise', effortScore: 'exercise',
        };
        const excType = card.dataKey ? excMapping[card.dataKey] : undefined;
        const count = excType ? (cardTrendData.excludedCounts?.[excType] ?? 0) : 0;
        if (count === 0) return null;
        return (
          <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 8 }}>
            {count} day{count !== 1 ? 's' : ''} excluded
          </Text>
        );
      })()}
    </View>
  );
}
