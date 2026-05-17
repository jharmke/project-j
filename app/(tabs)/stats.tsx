import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DayDetailContent } from '../day-detail';
import { useTheme } from '../../theme';
import { CardPeriod, ChartType, DATA_KEY_META, DataKey, DEFAULT_STATS_CARDS, StatsCard, availableChartTypes, generateCardId, loadStatsCards, saveStatsCards } from '../../statsCardRegistry';
import { ToastRenderer, useToast } from '../../components/Toast';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const RECORD_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 150;
const CHART_PAD_LEFT = 38;
const CHART_PAD_RIGHT = 4;
const CHART_PAD_TOP = 16;
const CHART_PAD_BOTTOM = 20;

const EMPTY_TREND_DATA: { weight: { date: string; value: number }[]; cal: { date: string; cal: number }[]; steps: { date: string; value: number }[]; activeCal: { date: string; value: number }[]; sleep: { date: string; value: number }[]; macro: { date: string; protein: number; carbs: number; fat: number }[]; workoutDay: { date: string; hadWorkout: boolean }[]; } = { weight: [], cal: [], steps: [], activeCal: [], sleep: [], macro: [], workoutDay: [] };

type DayStatus = 'green' | 'yellow' | 'red' | 'future' | 'none';

const fmtRecordDate = (dk: string | null) => {
  if (!dk) return null;
  const [y, m, d] = dk.split('-');
  return `${RECORD_MONTHS[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
};

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

// ── Shared chart fade-in animation ───────────────────────────────────────────

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

// ── Line chart ────────────────────────────────────────────────────────────────

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

  const labelText = fmtFull ? fmtFull(lastVal) : fmt(lastVal);
  const labelPillW = labelText.length * 5.5 + 10;
  const labelPillH = 14;
  const labelPillCX = Math.min(Math.max(lastX, plotLeft + labelPillW / 2), plotRight - labelPillW / 2);
  const labelPillX = labelPillCX - labelPillW / 2;
  const labelPillY = Math.max(CHART_PAD_TOP - 2, lastY - 4 - 4 - labelPillH);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>

        {/* Dismiss area -- behind all other elements */}
        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

        {/* Grid lines */}
        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
        ))}

        {/* Y-axis labels */}
        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmt(tick)}
          </SvgText>
        ))}

        {/* Goal line */}
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

        {/* Area fill */}
        <Path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Latest point dot */}
        <Circle cx={lastX} cy={lastY} r={4} fill={color} />

        {/* Latest value label -- floats above dot, accent pill */}
        <Rect
          x={labelPillX} y={labelPillY} width={labelPillW} height={labelPillH}
          fill={theme.accentBlueRaw} opacity={0.65} rx={3}
        />
        <SvgText x={labelPillCX} y={labelPillY + labelPillH - 3}
          fill="#ffffff" fontSize={9} fontFamily="DMSans_700Bold" textAnchor="middle">
          {labelText}
        </SvgText>

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

        {/* Callout bubble */}
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

// ── Calorie bar chart ─────────────────────────────────────────────────────────

function CalorieBarChart({ data, calTarget, theme }: {
  data: { date: string, cal: number }[],
  calTarget: number,
  theme: any,
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
        {/* Dismiss area -- behind all other elements */}
        <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

        {/* Grid lines */}
        {ticks.map((tick, i) => (
          <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
            stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
        ))}

        {/* Y-axis labels */}
        {ticks.map((tick, i) => (
          <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
            fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
            {fmtK(tick)}
          </SvgText>
        ))}

        {/* Bars with tap targets */}
        {data.map((d, i) => {
          const barColor = '#e06840';
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

        {/* X-axis dates */}
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

        {/* Callout bubble */}
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

// ── Macro stacked bar chart ───────────────────────────────────────────────────

const MACRO_PROTEIN = '#0d9268';
const MACRO_CARBS   = '#c47d1a';
const MACRO_FAT     = '#a83232';

function MacroBarChart({ data, theme }: {
  data: { date: string; protein: number; carbs: number; fat: number }[],
  theme: any,
}) {
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
          {/* Dismiss area -- behind all other elements */}
          <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

          {/* Grid lines */}
          {ticks.map((tick, i) => (
            <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
              stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
          ))}

          {/* Y-axis labels */}
          {ticks.map((tick, i) => (
            <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
              fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
              {`${Math.round(tick)}g`}
            </SvgText>
          ))}

          {/* Stacked bars + invisible overlay tap target */}
          {data.map((d, i) => {
            const x = plotLeft + i * slot + (slot - BAR_W) / 2;
            const cx = x + BAR_W / 2;
            const pH = toH(d.protein);
            const cH = toH(d.carbs);
            const fH = toH(d.fat);
            const totalH = pH + cH + fH;
            return [
              <Rect key={`p${i}`} x={x} y={chartBottom - pH}           width={BAR_W} height={pH} fill={MACRO_PROTEIN} opacity={0.9} />,
              <Rect key={`c${i}`} x={x} y={chartBottom - pH - cH}      width={BAR_W} height={cH} fill={MACRO_CARBS}   opacity={0.9} />,
              <Rect key={`f${i}`} x={x} y={chartBottom - pH - cH - fH} width={BAR_W} height={fH} fill={MACRO_FAT}     opacity={0.9} rx={2} />,
              <Rect key={`t${i}`} x={x} y={chartBottom - totalH}       width={BAR_W} height={Math.max(totalH, 12)}
                fill="transparent"
                onPress={() => setCallout(prev =>
                  prev?.date === fmtDate(d.date) ? null :
                  { x: cx, y: chartBottom - totalH, date: fmtDate(d.date), protein: Math.round(d.protein), carbs: Math.round(d.carbs), fat: Math.round(d.fat) }
                )} />,
            ];
          })}

          {/* X-axis dates */}
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

          {/* Callout bubble -- 4-row layout: date + P/C/F each on own line with macro color */}
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
                <SvgText x={tx} y={cPillY + 27} fill={MACRO_PROTEIN}
                  fontSize={9} fontFamily="DMSans_700Bold">
                  {`P  ${callout.protein}g`}
                </SvgText>
                <SvgText x={tx} y={cPillY + 41} fill={MACRO_CARBS}
                  fontSize={9} fontFamily="DMSans_700Bold">
                  {`C  ${callout.carbs}g`}
                </SvgText>
                <SvgText x={tx} y={cPillY + 55} fill={MACRO_FAT}
                  fontSize={9} fontFamily="DMSans_700Bold">
                  {`F  ${callout.fat}g`}
                </SvgText>
              </>
            );
          })()}
        </Svg>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
        {[
          { color: MACRO_PROTEIN, label: 'Protein' },
          { color: MACRO_CARBS,   label: 'Carbs' },
          { color: MACRO_FAT,     label: 'Fat' },
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

// ── Workout frequency chart ───────────────────────────────────────────────────

function WorkoutFrequencyChart({ data, theme }: {
  data: { date: string, hadWorkout: boolean }[],
  theme: any,
}) {
  const weeks: { label: string, count: number }[] = [];
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7);
    weeks.push({ label: fmtDate(chunk[0].date), count: chunk.filter(d => d.hadWorkout).length });
  }

  // Filter leading all-zero weeks (before app existed)
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
          {/* Dismiss area -- behind all other elements */}
          <Rect x={0} y={0} width={CHART_WIDTH} height={CHART_HEIGHT} fill="transparent" onPress={() => setCallout(null)} />

          {/* Grid lines */}
          {fixedTicks.map((tick, i) => (
            <Line key={`g${i}`} x1={plotLeft} y1={toY(tick)} x2={plotRight} y2={toY(tick)}
              stroke={theme.borderSubtle} strokeWidth={1} opacity={1} />
          ))}

          {/* Y-axis labels */}
          {fixedTicks.map((tick, i) => (
            <SvgText key={`y${i}`} x={plotLeft - 4} y={toY(tick) + 3}
              fill={theme.textDim} fontSize={8} fontFamily="DMSans_500Medium" textAnchor="end">
              {tick}
            </SvgText>
          ))}

          {/* Bars with tap targets */}
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

          {/* X dates */}
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

          {/* Callout bubble */}
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

// ── Stats graph card (registry-driven) ───────────────────────────────────────

type TrendData = {
  weight: { date: string; value: number }[];
  cal: { date: string; cal: number }[];
  steps: { date: string; value: number }[];
  activeCal: { date: string; value: number }[];
  sleep: { date: string; value: number }[];
  macro: { date: string; protein: number; carbs: number; fat: number }[];
  workoutDay: { date: string; hadWorkout: boolean }[];
};

function StatsGraphCard({ card, cardTrendData, theme, calTarget, stepGoal, sleepGoal, onPeriodChange, onEditPress }: {
  card: StatsCard; cardTrendData: typeof EMPTY_TREND_DATA; theme: any;
  calTarget: number; stepGoal: number; sleepGoal: number;
  onPeriodChange: (cardId: string, period: CardPeriod) => void;
  onEditPress: (card: StatsCard) => void;
}) {
  const shadow = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 };

  const getChart = () => {
    switch (card.dataKey) {
      case 'weight':
        return <LineChart data={cardTrendData.weight} color={theme.textSecondary} unit=" lbs"
          fmtY={(v) => v % 1 === 0 ? `${v}` : `${v.toFixed(1)}`} gradientId={`wt_${card.id}`} theme={theme} />;
      case 'calories':
        return <CalorieBarChart data={cardTrendData.cal} calTarget={calTarget} theme={theme} />;
      case 'macros':
        return <MacroBarChart data={cardTrendData.macro} theme={theme} />;
      case 'steps':
        return <LineChart data={cardTrendData.steps} color={theme.accentBlue} unit=""
          goalValue={stepGoal} fmtY={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`}
          fmtFull={(v) => Math.round(v).toLocaleString()} gradientId={`st_${card.id}`} theme={theme} />;
      case 'activeCals':
        return <LineChart data={cardTrendData.activeCal} color={theme.statusWarn} unit=" kcal"
          fmtY={(v) => `${Math.round(v)}`} gradientId={`ac_${card.id}`} theme={theme} />;
      case 'sleep':
        return <LineChart data={cardTrendData.sleep} color={theme.sleepRem} unit=""
          goalValue={sleepGoal} fmtY={(v) => `${Math.round(v * 10) / 10}h`}
          fmtFull={(v) => { const h = Math.floor(v); const m = Math.round((v % 1) * 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; }}
          gradientId={`sl_${card.id}`} theme={theme} />;
      case 'workoutFreq':
        return <WorkoutFrequencyChart data={cardTrendData.workoutDay} theme={theme} />;
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
      default: return undefined;
    }
  };

  const stats = getStats();
  const iconName = card.dataKey ? DATA_KEY_META[card.dataKey].icon : 'analytics-outline';

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadow }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Ionicons name={iconName as any} size={11} color={theme.textMuted} />
        <Text style={[styles.cardLabel, { color: theme.textMuted, flex: 1, marginLeft: 6 }]}>{card.label}</Text>
        {/* Per-card period pills */}
        <View style={{ flexDirection: 'row', gap: 4, marginRight: 8 }}>
          {([7, 30, 90] as CardPeriod[]).map(p => (
            <TouchableOpacity key={p} onPress={() => onPeriodChange(card.id, p)}
              style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
                backgroundColor: card.period === p ? theme.accentBlueBg : 'transparent',
                borderWidth: 1, borderColor: card.period === p ? theme.accentBlueBorder : theme.borderInput }}>
              <Text style={{ fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: card.period === p ? theme.accentBlue : theme.textMuted }}>
                {p}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => onEditPress(card)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="settings-outline" size={13} color={theme.textMuted} />
        </TouchableOpacity>
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

// ── Collapsible section header ─────────────────────────────────────────────────

function CollapsibleSection({ label, children, defaultOpen = true, theme, first = false }: {
  label: string, children: React.ReactNode, defaultOpen?: boolean, theme: any, first?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={{ marginTop: first ? 4 : 20 }}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginBottom: 10 }}>
        <Text style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.accentBlueRaw }}>
          {label}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.accentBlueBorder }} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlueRaw} />
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ opacity: fadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ── Collapsible card (for calendar) ───────────────────────────────────────────

function CollapsibleCard({ label, defaultOpen = false, children, theme }: {
  label: string, defaultOpen?: boolean, children: React.ReactNode, theme: any
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingVertical: 12, marginVertical: -12 }} onPress={toggle}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ marginTop: 12, opacity: fadeAnim }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

// ── Sleep score (mirrors index.tsx) ──────────────────────────────────────────

const FEEL_BONUS: Record<number, number> = { 1: 0, 2: 10, 3: 20, 4: 30, 5: 40 };

function calcSleepScore(
  sleepHours: number | null,
  sleepStages: { core: number; deep: number; rem: number; totalMs: number } | null,
  sleepGoal: number,
  feelRating?: number | null,
  isManual?: boolean,
): { score: number | null; path: 1 | 2 | 3 } {
  if (!sleepHours || sleepHours <= 0) return { score: null, path: 3 };
  if (sleepStages && sleepStages.totalMs > 0) {
    const durationPts = Math.min(40, (sleepHours / sleepGoal) * 40);
    const totalMs = sleepStages.totalMs;
    const deepPts = Math.max(0, 30 - (Math.abs(sleepStages.deep / totalMs - 0.20) / 0.20) * 30);
    const remPts  = Math.max(0, 30 - (Math.abs(sleepStages.rem  / totalMs - 0.22) / 0.22) * 30);
    return { score: Math.round(durationPts + deepPts + remPts), path: 1 };
  }
  const path = isManual ? 3 : 2;
  if (!feelRating) return { score: null, path };
  const durationPts = Math.min(60, (sleepHours / sleepGoal) * 60);
  return { score: Math.round(Math.min(100, durationPts + (FEEL_BONUS[feelRating] ?? 0))), path };
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [trendPeriod, setTrendPeriod] = useState<'7' | '30' | '90'>('30');
  const [activePeriod, setActivePeriod] = useState<'7' | '30' | '90' | '180' | 'ytd'>('7');

  const [trendDataMap, setTrendDataMap] = useState<Record<string, typeof EMPTY_TREND_DATA>>({});

  const [calTarget, setCalTarget] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [sleepGoal, setSleepGoal] = useState(8);

  const [records, setRecords] = useState<{
    steps: number | null, stepsDate: string | null,
    activeCals: number | null, activeCalsDate: string | null,
    water: number | null, waterDate: string | null,
    sleepHours: number | null, sleepHoursDate: string | null,
  }>({ steps: null, stepsDate: null, activeCals: null, activeCalsDate: null, water: null, waterDate: null, sleepHours: null, sleepHoursDate: null });

  const [profileBmr, setProfileBmr] = useState(0);
  const hasLoadedProfile = useRef(false);
  const [styleMode, setStyleMode] = useState<'Discipline' | 'Balanced' | 'Mindful'>('Balanced');
  const [periodData, setPeriodData] = useState({
    avgCal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0,
    avgWater: 0, avgSteps: 0, avgActiveCals: 0, avgSleep: 0, avgNetCals: 0,
    avgSleepScore: null as number | null, calGoalDays: 0,
    workoutDays: 0, totalDays: 0, loggedDays: 0,
    startWeight: null as number | null, endWeight: null as number | null,
  });
  const [streaks, setStreaks] = useState({ gym: 0, calories: 0, water: 0, bible: 0 });
  const [excludedDays, setExcludedDays] = useState<{ date: string, diet: boolean, water: boolean, exercise: boolean }[]>([]);

  const [statsCards, setStatsCards] = useState<StatsCard[]>(DEFAULT_STATS_CARDS);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [editCards, setEditCards] = useState<StatsCard[]>([]);
  const editSheetAnim = useRef(new Animated.Value(0)).current;
  const editOverlayAnim = useRef(new Animated.Value(0)).current;

  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);
  const dayDetailAnim = useRef(new Animated.Value(0)).current;

  const [creatorVisible, setCreatorVisible] = useState(false);
  const [creatorStep, setCreatorStep] = useState<1 | 2 | 3>(1);
  const [creatorDataKey, setCreatorDataKey] = useState<DataKey | null>(null);
  const [creatorChartType, setCreatorChartType] = useState<ChartType | null>(null);
  const creatorSheetAnim = useRef(new Animated.Value(0)).current;
  const creatorOverlayAnim = useRef(new Animated.Value(0)).current;

  const { showToast } = useToast();

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const year = calendarYear;
  const month = calendarMonth;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const closeDayDetail = () => {
    Animated.timing(dayDetailAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setDayDetailDate(null));
  };

  const getDateKey = (offset: number) => {
    const d = new Date(); d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchTrendData = async (days: number, workoutState: any): Promise<typeof EMPTY_TREND_DATA> => {
    const wh: { date: string; value: number }[] = [];
    const ch: { date: string; cal: number }[] = [];
    const sh: { date: string; value: number }[] = [];
    const ah: { date: string; value: number }[] = [];
    const slh: { date: string; value: number }[] = [];
    const mh: { date: string; protein: number; carbs: number; fat: number }[] = [];
    const wdh: { date: string; hadWorkout: boolean }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dateKey = getDateKey(i);
      let hadWorkout = false;
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.weight) wh.push({ date: dateKey, value: data.weight });
          if (data.entries?.length > 0) {
            const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
            if (total > 0) {
              ch.push({ date: dateKey, cal: total });
              const p = data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
              const c = data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
              const f = data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
              if (p + c + f > 0) mh.push({ date: dateKey, protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) });
            }
          }
          if (data.steps) sh.push({ date: dateKey, value: data.steps });
          if (data.activeCalories) ah.push({ date: dateKey, value: data.activeCalories });
          const sleepH = data.sleepOverride || data.sleepHours;
          if (sleepH) slh.push({ date: dateKey, value: sleepH });
          hadWorkout = (workoutState.programs?.[dateKey]?.exercises?.length ?? 0) > 0;
        }
      } catch {}
      wdh.push({ date: dateKey, hadWorkout });
    }
    return { weight: wh, cal: ch, steps: sh, activeCal: ah, sleep: slh, macro: mh, workoutDay: wdh };
  };

  const loadAllCardData = async (cards: StatsCard[], globalPeriod: CardPeriod = 30) => {
    let workoutState: any = {};
    try {
      const ws = await AsyncStorage.getItem('pj_workout_state');
      if (ws) workoutState = JSON.parse(ws);
    } catch {}

    const uniquePeriods = [...new Set([
      globalPeriod,
      ...cards.filter(c => c.type === 'graph' && c.visible).map(c => c.period),
    ])];

    const results = await Promise.all(uniquePeriods.map(async p => [p, await fetchTrendData(p, workoutState)] as const));
    const newMap: Record<string, typeof EMPTY_TREND_DATA> = {};
    for (const [period, data] of results) newMap[period.toString()] = data;
    setTrendDataMap(newMap);
  };

  const loadRecords = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const dayKeys = allKeys.filter(k => /^pj_\d{4}-\d{2}-\d{2}$/.test(k));
      if (dayKeys.length === 0) return;
      const pairs = await AsyncStorage.multiGet(dayKeys);
      let maxSteps = 0, maxActiveCals = 0, maxWater = 0, maxSleepH = 0;
      let maxStepsDate = '', maxActiveCalsDate = '', maxWaterDate = '', maxSleepHDate = '';
      for (const [key, val] of pairs) {
        if (!val) continue;
        try {
          const data = JSON.parse(val);
          const dateKey = key.replace('pj_', '');
          if ((data.steps || 0) > maxSteps) { maxSteps = data.steps; maxStepsDate = dateKey; }
          if ((data.activeCalories || 0) > maxActiveCals) { maxActiveCals = data.activeCalories; maxActiveCalsDate = dateKey; }
          if ((data.water || 0) > maxWater) { maxWater = data.water; maxWaterDate = dateKey; }
          const sh = data.sleepOverride || data.sleepHours;
          if (sh && sh > maxSleepH) { maxSleepH = sh; maxSleepHDate = dateKey; }
        } catch {}
      }
      setRecords({
        steps: maxSteps || null, stepsDate: maxStepsDate || null,
        activeCals: maxActiveCals || null, activeCalsDate: maxActiveCalsDate || null,
        water: maxWater || null, waterDate: maxWaterDate || null,
        sleepHours: maxSleepH || null, sleepHoursDate: maxSleepHDate || null,
      });
    } catch {}
  };

  const loadPeriodData = async (period: '7' | '30' | '90' | '180' | 'ytd', calTgt: number, sleepGoalVal: number, bmr = 0) => {
    let dates: string[] = [];
    const nowD = new Date();
    if (period === 'ytd') {
      const start = new Date(nowD.getFullYear(), 0, 1);
      const diff = Math.floor((nowD.getTime() - start.getTime()) / 86400000);
      for (let i = diff; i >= 0; i--) dates.push(getDateKey(i));
    } else {
      const days = parseInt(period);
      for (let i = days - 1; i >= 0; i--) dates.push(getDateKey(i));
    }
    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalWater = 0, totalNetCal = 0;
    let totalSteps = 0, stepsDays = 0, totalActiveCals = 0, activeDays = 0, totalSleep = 0, sleepDays = 0;
    let totalSleepScore = 0, sleepScoreDays = 0, calGoalDays = 0;
    let dietDays = 0, waterDays = 0, workoutDays = 0;
    let startWeight: number | null = null, endWeight: number | null = null;
    for (const dateKey of dates) {
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          const excl = data.excluded || {};
          if (!excl.diet && data.entries?.length > 0) {
            const dayCal = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
            totalCal += dayCal;
            totalNetCal += dayCal - (data.activeCalories || 0) - bmr;
            totalProtein += data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
            totalCarbs += data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
            totalFat += data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
            if (calTgt > 0) {
              const pct = (dayCal / calTgt) * 100;
              if (pct >= 80 && pct <= 106) calGoalDays++;
            }
            dietDays++;
          }
          if (!excl.water && data.water) { totalWater += data.water; waterDays++; }
          if (data.weight) { if (startWeight === null) startWeight = data.weight; endWeight = data.weight; }
          if (!excl.exercise && (data.caloriesBurned || data.entries?.length > 0)) workoutDays++;
          if (data.steps) { totalSteps += data.steps; stepsDays++; }
          if (data.activeCalories) { totalActiveCals += data.activeCalories; activeDays++; }
          const sleepH = data.sleepOverride || data.sleepHours;
          if (sleepH) {
            totalSleep += sleepH; sleepDays++;
            const { score, path } = calcSleepScore(sleepH, data.sleepStages || null, sleepGoalVal, data.sleepFeelRating ?? null, !!data.sleepOverride);
            if (score !== null && (path === 1 || data.sleepFeelRating)) { totalSleepScore += score; sleepScoreDays++; }
          }
        }
      } catch {}
    }
    setPeriodData({
      avgCal: dietDays > 0 ? Math.round(totalCal / dietDays) : 0,
      avgProtein: dietDays > 0 ? Math.round(totalProtein / dietDays * 10) / 10 : 0,
      avgCarbs: dietDays > 0 ? Math.round(totalCarbs / dietDays * 10) / 10 : 0,
      avgFat: dietDays > 0 ? Math.round(totalFat / dietDays * 10) / 10 : 0,
      avgNetCals: dietDays > 0 ? Math.round(totalNetCal / dietDays) : 0,
      avgWater: waterDays > 0 ? Math.round(totalWater / waterDays) : 0,
      avgSteps: stepsDays > 0 ? Math.round(totalSteps / stepsDays) : 0,
      avgActiveCals: activeDays > 0 ? Math.round(totalActiveCals / activeDays) : 0,
      avgSleep: sleepDays > 0 ? Math.round(totalSleep / sleepDays * 10) / 10 : 0,
      avgSleepScore: sleepScoreDays > 0 ? Math.round(totalSleepScore / sleepScoreDays) : null,
      calGoalDays,
      workoutDays, totalDays: dates.length, loggedDays: dietDays, startWeight, endWeight,
    });
  };

  const loadStreaks = async (target: number) => {
    let gymStreak = 0, calStreak = 0, waterStreak = 0;
    let i = 0;
    while (true) {
      const dateKey = getDateKey(i);
      try {
        const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
        if (!saved) { if (i === 0) { i++; continue; } break; }
        const data = JSON.parse(saved);
        const calTotal = data.entries?.reduce((s: number, e: any) => s + e.cal, 0) || 0;
        const calPct = target > 0 ? (calTotal / target) * 100 : 0;
        const hasCals = calPct >= 80 && calPct <= 106;
        const hasWater = (data.water || 0) >= 128;
        const hasWorkout = data.caloriesBurned > 0 || data.entries?.length > 0;
        if (i === 0 || gymStreak > 0) { if (hasWorkout) gymStreak++; else if (i > 0) gymStreak = 0; }
        if (i === 0 || calStreak > 0) { if (hasCals) calStreak++; else if (i > 0) calStreak = 0; }
        if (i === 0 || waterStreak > 0) { if (hasWater) waterStreak++; else if (i > 0) waterStreak = 0; }
        if (!hasWorkout && !hasCals && !hasWater) break;
        i++; if (i > 365) break;
      } catch { break; }
    }
    setStreaks({ gym: gymStreak, calories: calStreak, water: waterStreak, bible: 0 });
  };

  useFocusEffect(
    useCallback(() => {
      const loadAll = async () => {
        const exDays: { date: string, diet: boolean, water: boolean, exercise: boolean }[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          try {
            const saved = await AsyncStorage.getItem(`pj_${dateKey}`);
            if (saved) {
              const data = JSON.parse(saved);
              if (data.excluded && Object.values(data.excluded).some(v => v === true)) {
                exDays.push({ date: dateKey, diet: !!data.excluded.diet, water: !!data.excluded.water, exercise: !!data.excluded.exercise });
              }
            }
          } catch {}
        }
        setExcludedDays(exDays);

        let target = 0, step = 10000, sleep = 8, bmr = 0;
        try {
          const p = await AsyncStorage.getItem('pj_profile');
          if (p) {
            const d = JSON.parse(p);
            if (d.stepGoal) step = parseInt(d.stepGoal);
            if (d.sleepGoal) sleep = parseFloat(d.sleepGoal);
            if (d.heightFt && d.heightIn !== undefined && d.sex && d.birthday) {
              let w = 0;
              for (let i = 0; i <= 30 && w === 0; i++) {
                try { const dd = await AsyncStorage.getItem(`pj_${getDateKey(i)}`); if (dd) { const x = JSON.parse(dd); if (x.weight) w = x.weight; } } catch {}
              }
              if (w > 0) {
                const wKg = w * 0.453592;
                const hCm = (parseFloat(d.heightFt) * 30.48) + (parseFloat(d.heightIn) * 2.54);
                const parts = d.birthday.split('-');
                const age = Math.floor((Date.now() - new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])).getTime()) / (365.25*24*3600*1000));
                bmr = d.sex === 'male' ? Math.round((10*wKg)+(6.25*hCm)-(5*age)+5) : Math.round((10*wKg)+(6.25*hCm)-(5*age)-161);
              }
            }
          }
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) { const d = JSON.parse(s); if (d.calTarget) target = parseInt(d.calTarget); if (d.styleMode) setStyleMode(d.styleMode); }
        } catch {}
        setCalTarget(target);
        setStepGoal(step);
        setSleepGoal(sleep);
        setProfileBmr(bmr);
        hasLoadedProfile.current = true;

        const cards = await loadStatsCards();
        setStatsCards(cards);

        await Promise.all([
          loadAllCardData(cards, 30),
          loadRecords(),
          loadPeriodData(activePeriod, target, sleep, bmr),
          loadStreaks(target),
        ]);
      };
      loadAll();
    }, [calendarMonth, calendarYear])
  );

  useEffect(() => {
    if (hasLoadedProfile.current) {
      loadPeriodData(activePeriod, calTarget, sleepGoal, profileBmr);
    }
  }, [activePeriod]);

  const handleGlobalPeriodSync = (p: '7' | '30' | '90') => {
    const days = parseInt(p) as CardPeriod;
    setTrendPeriod(p);
    const updated = statsCards.map(c => c.type === 'graph' ? { ...c, period: days } : c);
    setStatsCards(updated);
    saveStatsCards(updated);
    loadAllCardData(updated, days);
  };

  const handleCardPeriodChange = async (cardId: string, period: CardPeriod) => {
    const updated = statsCards.map(c => c.id === cardId ? { ...c, period } : c);
    setStatsCards(updated);
    saveStatsCards(updated);
    if (!trendDataMap[period.toString()]) {
      let workoutState: any = {};
      try { const ws = await AsyncStorage.getItem('pj_workout_state'); if (ws) workoutState = JSON.parse(ws); } catch {}
      const data = await fetchTrendData(period, workoutState);
      setTrendDataMap(prev => ({ ...prev, [period.toString()]: data }));
    }
  };

  const openEditSheet = () => {
    setEditCards([...statsCards]);
    editSheetAnim.setValue(0);
    editOverlayAnim.setValue(0);
    setEditSheetVisible(true);
  };

  const closeEditSheet = () => {
    Animated.parallel([
      Animated.timing(editSheetAnim, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(editOverlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setEditSheetVisible(false));
  };

  const handleToggleCard = (id: string) => {
    setEditCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
      setStatsCards(updated);
      saveStatsCards(updated);
      return updated;
    });
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert(
      'Remove Card',
      'Remove this graph card from your stats?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => {
            setEditCards(prev => {
              const updated = prev.filter(c => c.id !== id);
              setStatsCards(updated);
              saveStatsCards(updated);
              return updated;
            });
          },
        },
      ]
    );
  };

  const openCreatorModal = async () => {
    setCreatorStep(1);
    setCreatorDataKey(null);
    setCreatorChartType(null);
    creatorSheetAnim.setValue(0);
    creatorOverlayAnim.setValue(0);
    setCreatorVisible(true);
    if (!trendDataMap['7']) {
      let workoutState: any = {};
      try { const ws = await AsyncStorage.getItem('pj_workout_state'); if (ws) workoutState = JSON.parse(ws); } catch {}
      const data = await fetchTrendData(7, workoutState);
      setTrendDataMap(prev => ({ ...prev, '7': data }));
    }
  };

  const closeCreatorModal = () => {
    Animated.parallel([
      Animated.timing(creatorSheetAnim, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(creatorOverlayAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setCreatorVisible(false));
  };

  const handleCreatorSelectDataKey = (dk: DataKey) => {
    setCreatorDataKey(dk);
    if (dk === 'macros') {
      setCreatorChartType('stackedBar');
      setCreatorStep(3);
    } else {
      setCreatorChartType(null);
      setCreatorStep(2);
    }
  };

  const handleCreatorBack = () => {
    if (creatorStep === 3 && creatorDataKey === 'macros') {
      setCreatorDataKey(null);
      setCreatorChartType(null);
      setCreatorStep(1);
    } else if (creatorStep === 3) {
      setCreatorStep(2);
    } else if (creatorStep === 2) {
      setCreatorStep(1);
    }
  };

  const handleAddCard = () => {
    if (!creatorDataKey || !creatorChartType) return;
    const newCard: StatsCard = {
      id: generateCardId(creatorDataKey),
      type: 'graph',
      dataKey: creatorDataKey,
      chartType: creatorChartType,
      period: 7,
      label: DATA_KEY_META[creatorDataKey].label,
      visible: true,
      order: statsCards.length,
      placement: 'stats',
    };
    const updated = [...statsCards, newCard];
    setStatsCards(updated);
    saveStatsCards(updated);
    closeCreatorModal();
    setTimeout(() => showToast('Graph added', undefined, 'success'), 300);
  };

  // Derived from trendDataMap -- used for At a Glance weight change display
  const trendData = trendDataMap[trendPeriod] ?? EMPTY_TREND_DATA;

  const getDayStatus = (day: number): DayStatus => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateKey > today) return 'future';
    const calEntry = trendData.cal.find(c => c.date === dateKey);
    if (!calEntry || !calTarget) return 'none';
    const pct = (calEntry.cal / calTarget) * 100;
    if (pct >= 80 && pct <= 106) return 'green';
    if (pct >= 63 && pct <= 114) return 'yellow';
    return 'red';
  };

  const dayStatusColor = (status: DayStatus) => {
    if (status === 'green') return { bg: 'rgba(16,185,129,0.25)', text: theme.statusGood };
    if (status === 'yellow') return { bg: 'rgba(245,158,11,0.25)', text: theme.statusWarn };
    if (status === 'red') return { bg: 'rgba(239,68,68,0.2)', text: theme.statusBad };
    return { bg: 'transparent', text: theme.textDim };
  };

  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 };

  const RecordTile = ({ icon, label, value, unit, color, date, fmt }: {
    icon: string, label: string, value: number | null, unit: string,
    color: string, date: string | null, fmt: (v: number) => string,
  }) => (
    <View style={[{ flex: 1, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 14, padding: 14, alignItems: 'center' }, shadowStyle]}>
      <Ionicons name={icon as any} size={18} color={color} style={{ marginBottom: 4 }} />
      <Text style={{ fontSize: 26, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, opacity: 0.88 }}>
        {value !== null ? fmt(value) : '--'}
      </Text>
      <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2, textAlign: 'center' }}>{unit}</Text>
      <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>{label}</Text>
      {date && value !== null && (
        <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 4, textAlign: 'center' }}>
          {fmtRecordDate(date)}
        </Text>
      )}
    </View>
  );

  const weightChange = trendData.weight.length >= 2
    ? Math.round((trendData.weight[trendData.weight.length - 1].value - trendData.weight[0].value) * 10) / 10 : null;

  const sectionVisible = (id: string) => statsCards.find(c => c.id === id)?.visible ?? true;

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Stats</Text>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/journal')}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="journal" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openCreatorModal}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={16} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openEditSheet}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── AT A GLANCE ── */}
        {sectionVisible('sys_atAGlance') && <CollapsibleSection label="At a Glance" defaultOpen={true} theme={theme} first={true}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {(['7', '30', '90', '180', 'ytd'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => setActivePeriod(p)}
                  style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center',
                    backgroundColor: activePeriod === p ? theme.accentBlueBg : theme.bgInput,
                    borderWidth: 1, borderColor: activePeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: activePeriod === p ? theme.accentBlue : theme.textMuted }}>
                    {p === 'ytd' ? 'YTD' : p === '7' ? '7D' : p === '30' ? '30D' : p === '90' ? '3M' : '6M'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {periodData.loggedDays > 0 && (
              <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}>
                Based on {periodData.loggedDays} day{periodData.loggedDays !== 1 ? 's' : ''} with food logged
              </Text>
            )}
            <View style={{ position: 'relative' }}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 0.5, backgroundColor: theme.borderSubtle }} />
              {styleMode !== 'Mindful' && (
                <>
                  <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                    <View style={styles.glanceCellL}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>CALORIES / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgCal > 0 ? `${periodData.avgCal} kcal` : '--'}</Text>
                    </View>
                    <View style={styles.glanceCellR}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>NET CALS / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgNetCals !== 0 ? `${periodData.avgNetCals} kcal` : '--'}</Text>
                    </View>
                  </View>
                  <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                    <View style={styles.glanceCellL}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>ACTIVE CALS / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgActiveCals > 0 ? `${periodData.avgActiveCals} kcal` : '--'}</Text>
                    </View>
                    <View style={styles.glanceCellR}>
                      <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>CAL GOAL / DAY</Text>
                      <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.loggedDays > 0 ? `${periodData.calGoalDays} / ${periodData.loggedDays}` : '--'}</Text>
                    </View>
                  </View>
                </>
              )}
              <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                <View style={styles.glanceCellL}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>STEPS / DAY</Text>
                  <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSteps > 0 ? periodData.avgSteps.toLocaleString() : '--'}</Text>
                </View>
                <View style={styles.glanceCellR}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WORKOUT DAYS</Text>
                  <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{`${periodData.workoutDays} / ${periodData.totalDays}`}</Text>
                </View>
              </View>
              {styleMode === 'Mindful' && (
                <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                  <View style={styles.glanceCellL}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WORKOUT DAYS</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{`${periodData.workoutDays} / ${periodData.totalDays}`}</Text>
                  </View>
                  <View style={styles.glanceCellR}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>SLEEP / NIGHT</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSleep > 0 ? `${Math.floor(periodData.avgSleep)}h ${Math.round((periodData.avgSleep % 1) * 60)}m` : '--'}</Text>
                  </View>
                </View>
              )}
              {styleMode !== 'Mindful' && (
                <View style={[styles.glanceRow, { borderBottomColor: theme.borderSubtle }]}>
                  <View style={styles.glanceCellL}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>SLEEP / NIGHT</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSleep > 0 ? `${Math.floor(periodData.avgSleep)}h ${Math.round((periodData.avgSleep % 1) * 60)}m` : '--'}</Text>
                  </View>
                  <View style={styles.glanceCellR}>
                    <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>SLEEP SCORE</Text>
                    <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgSleepScore !== null ? periodData.avgSleepScore.toString() : '--'}</Text>
                  </View>
                </View>
              )}
              <View style={[styles.glanceRow, { borderBottomColor: 'transparent' }]}>
                <View style={styles.glanceCellL}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WATER / DAY</Text>
                  <Text style={[styles.glanceVal, { color: theme.textPrimary }]}>{periodData.avgWater > 0 ? `${periodData.avgWater} oz` : '--'}</Text>
                </View>
                <View style={styles.glanceCellR}>
                  <Text style={[styles.glanceLabel, { color: theme.textMuted }]}>WEIGHT CHANGE</Text>
                  <Text style={[styles.glanceVal, { color: weightChange !== null ? (weightChange < 0 ? theme.statusGood : weightChange > 0 ? theme.statusBad : theme.textPrimary) : theme.textPrimary }]}>
                    {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange} lbs` : '--'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </CollapsibleSection>}

        {/* ── TRENDS ── */}
        {sectionVisible('sys_trends') && <CollapsibleSection label="Trends" defaultOpen={true} theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['7', '30', '90'] as const).map(p => (
                <TouchableOpacity key={p} onPress={() => handleGlobalPeriodSync(p)}
                  style={{ paddingVertical: 7, paddingHorizontal: 18, borderRadius: 8,
                    backgroundColor: trendPeriod === p ? theme.accentBlueBg : theme.bgInput,
                    borderWidth: 1, borderColor: trendPeriod === p ? theme.accentBlueBorder : theme.borderInput }}>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: trendPeriod === p ? theme.accentBlue : theme.textMuted }}>
                    {p}D
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular' }}>syncs all</Text>
          </View>

          {statsCards
            .filter(c => c.type === 'graph' && c.visible)
            .sort((a, b) => a.order - b.order)
            .map(card => (
              <StatsGraphCard
                key={card.id}
                card={card}
                cardTrendData={trendDataMap[card.period.toString()] ?? EMPTY_TREND_DATA}
                theme={theme}
                calTarget={calTarget}
                stepGoal={stepGoal}
                sleepGoal={sleepGoal}
                onPeriodChange={handleCardPeriodChange}
                onEditPress={() => {}}
              />
            ))}
        </CollapsibleSection>}

        {/* ── RECORDS ── */}
        {sectionVisible('sys_records') && <CollapsibleSection label="Records" defaultOpen={false} theme={theme}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <RecordTile icon="footsteps" label="Best Steps" value={records.steps} unit="steps"
              color={theme.accentBlue} date={records.stepsDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
            <RecordTile icon="flame" label="Best Active" value={records.activeCals} unit="kcal burned"
              color={theme.statusWarn} date={records.activeCalsDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <RecordTile icon="water" label="Best Water" value={records.water} unit="oz"
              color={'#06b6d4'} date={records.waterDate}
              fmt={(v) => Math.round(v).toLocaleString()} />
            <RecordTile icon="moon" label="Best Sleep" value={records.sleepHours} unit="hrs"
              color={theme.sleepRem} date={records.sleepHoursDate}
              fmt={(v) => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`} />
          </View>
        </CollapsibleSection>}

        {/* ── STREAKS ── */}
        {sectionVisible('sys_streaks') && <CollapsibleSection label="Streaks" defaultOpen={false} theme={theme}>
          <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Workout', value: streaks.gym, color: theme.statusGood },
                { label: 'Calories', value: streaks.calories, color: theme.accentBlue },
                { label: 'Water', value: streaks.water, color: '#06b6d4' },
                { label: 'Bible', value: streaks.bible, color: theme.accentAmber },
              ].map(s => (
                <View key={s.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 36, fontFamily: 'BebasNeue_400Regular', color: s.color, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 0, opacity: 0.88 }}>
                    {s.value}
                  </Text>
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' }}>{s.label}</Text>
                  <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>days</Text>
                </View>
              ))}
            </View>
          </View>
        </CollapsibleSection>}

        {/* ── CALENDAR ── */}
        {sectionVisible('sys_calendar') && <CollapsibleSection label="Calendar" defaultOpen={false} theme={theme}>
          <CollapsibleCard label="Monthly View" defaultOpen={true} theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <TouchableOpacity onPress={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); } else setCalendarMonth(m => m - 1); }} style={{ padding: 8 }}>
                <Ionicons name="chevron-back" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
              <Text style={[styles.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>{MONTH_NAMES[month]} {year}</Text>
              <TouchableOpacity onPress={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); } else setCalendarMonth(m => m + 1); }} style={{ padding: 8 }}>
                <Ionicons name="chevron-forward" size={18} color={theme.accentBlue} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'On Target', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', color: theme.statusGood },
                { label: 'Close', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', color: theme.statusWarn },
                { label: 'Off', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', color: theme.statusBad },
              ].map(l => (
                <View key={l.label} style={{ backgroundColor: l.bg, borderWidth: 1, borderColor: l.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: l.color, fontSize: 10, fontFamily: 'DMSans_600SemiBold' }}>{l.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calGrid}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={[styles.calDayHeader, { color: theme.textMuted }]}>{d}</Text>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                const colors = dayStatusColor(status);
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const exDay = excludedDays.find(e => e.date === dateKey);
                return (
                  <TouchableOpacity key={day}
                    style={[styles.calDay, { backgroundColor: colors.bg }, isToday && [styles.calDayToday, { borderColor: theme.accentBlueBorder }]]}
                    onPress={() => { if (dateKey <= today) setDayDetailDate(dateKey); }}>
                    <Text style={[styles.calDayText, { color: colors.text }]}>{day}</Text>
                    {exDay && (
                      <View style={{ position: 'absolute', bottom: 2, left: 0, right: 0, flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                        {exDay.diet && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,158,11,0.6)' }} />}
                        {exDay.water && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(59,130,246,0.6)' }} />}
                        {exDay.exercise && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(239,68,68,0.6)' }} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { color: 'rgba(245,158,11,0.6)', label: 'Diet excluded' },
                { color: 'rgba(59,130,246,0.6)', label: 'Water excluded' },
                { color: 'rgba(239,68,68,0.6)', label: 'Exercise excluded' },
              ].map(l => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l.color }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </CollapsibleCard>
        </CollapsibleSection>}

      </ScrollView>

      {/* ── EDIT STATS SHEET ── */}
      <Modal transparent animationType="none" visible={editSheetVisible} onRequestClose={closeEditSheet} statusBarTranslucent hardwareAccelerated
        onShow={() => {
          Animated.parallel([
            Animated.timing(editSheetAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(editOverlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Dimmed backdrop */}
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeEditSheet}>
            <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: editOverlayAnim }} />
          </TouchableOpacity>

          {/* Slide-up sheet */}
          <Animated.View style={{
            transform: [{ translateY: editSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }],
            backgroundColor: theme.bgSheet,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            borderWidth: 0.5, borderBottomWidth: 0, borderColor: theme.borderSheet,
            maxHeight: Dimensions.get('window').height * 0.82,
          }}>
            {/* Handle */}
            <TouchableOpacity onPress={closeEditSheet} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 40 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            {/* Title */}
            <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 3, color: theme.accentBlueRaw, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
              EDIT STATS
            </Text>

            <GestureHandlerRootView style={{ flexShrink: 1 }}>
              <DraggableFlatList
                data={editCards.filter(c => c.type === 'graph')}
                keyExtractor={item => item.id}
                onDragEnd={({ data }) => {
                  const sysCards = editCards.filter(c => c.type === 'system');
                  const updatedGraphCards = data.map((c, i) => ({ ...c, order: i }));
                  const updated = [...sysCards, ...updatedGraphCards];
                  setEditCards(updated);
                  setStatsCards(updated);
                  saveStatsCards(updated);
                }}
                ListHeaderComponent={() => (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
                    <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Graph Cards</Text>
                    <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginTop: 2 }}>Long-press to reorder</Text>
                  </View>
                )}
                ListFooterComponent={() => (
                  <>
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle, marginTop: 8 }}>
                      <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Sections</Text>
                    </View>
                    {editCards.filter(c => c.type === 'system').map(item => (
                      <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }}>
                        <Ionicons name="reorder-three-outline" size={22} color={theme.borderSubtle} />
                        <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: item.visible ? theme.textPrimary : theme.textDim }}>{item.label}</Text>
                        <View style={{ backgroundColor: 'rgba(102,102,128,0.12)', borderWidth: 1, borderColor: 'rgba(102,102,128,0.2)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.textMuted, letterSpacing: 1 }}>SECTION</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleToggleCard(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Ionicons name={item.visible ? 'eye' : 'eye-off-outline'} size={18} color={item.visible ? theme.accentBlue : theme.textDim} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={{ height: insets.bottom + 20 }} />
                  </>
                )}
                renderItem={({ item, drag, isActive }) => (
                  <ScaleDecorator>
                    <TouchableOpacity
                      onLongPress={drag}
                      disabled={isActive}
                      activeOpacity={0.85}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingHorizontal: 20, paddingVertical: 13,
                        backgroundColor: isActive ? theme.bgCard : 'transparent',
                        borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle,
                      }}>
                      <Ionicons name="reorder-three-outline" size={22} color={theme.textDim} />
                      <Text style={{ flex: 1, fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: item.visible ? theme.textPrimary : theme.textDim }}>
                        {item.label}
                      </Text>
                      <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 1 }}>{item.period}D</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteCard(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={17} color={theme.statusBad} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleToggleCard(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={item.visible ? 'eye' : 'eye-off-outline'} size={18} color={item.visible ? theme.accentBlue : theme.textDim} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </ScaleDecorator>
                )}
              />
            </GestureHandlerRootView>
          </Animated.View>
        </View>
      </Modal>

      {/* ── CREATOR MODAL ── */}
      <Modal transparent animationType="none" visible={creatorVisible} onRequestClose={closeCreatorModal} statusBarTranslucent hardwareAccelerated
        onShow={() => {
          Animated.parallel([
            Animated.timing(creatorSheetAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(creatorOverlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }}>
        <ToastRenderer />
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeCreatorModal}>
            <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: creatorOverlayAnim }} />
          </TouchableOpacity>

          <Animated.View style={{
            transform: [{ translateY: creatorSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }],
            backgroundColor: theme.bgSheet,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            borderWidth: 0.5, borderBottomWidth: 0, borderColor: theme.borderSheet,
            maxHeight: Dimensions.get('window').height * 0.85,
          }}>
            {/* Handle */}
            <TouchableOpacity onPress={closeCreatorModal} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 20 }}>
                {creatorStep > 1 && (
                  <TouchableOpacity onPress={handleCreatorBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 12 }}>
                    <Ionicons name="chevron-back" size={20} color={theme.accentBlueRaw} />
                  </TouchableOpacity>
                )}
                <Text style={{ fontFamily: 'BebasNeue_400Regular', fontSize: 22, letterSpacing: 3, color: theme.accentBlueRaw, flex: 1 }}>
                  {creatorStep === 1 ? 'CHOOSE DATA TYPE' : creatorStep === 2 ? 'CHOOSE CHART TYPE' : 'PREVIEW'}
                </Text>
              </View>

              {/* Step 1: Data type grid */}
              {creatorStep === 1 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {(Object.keys(DATA_KEY_META) as DataKey[]).map(dk => {
                    const meta = DATA_KEY_META[dk];
                    const sel = creatorDataKey === dk;
                    return (
                      <TouchableOpacity key={dk} onPress={() => handleCreatorSelectDataKey(dk)}
                        style={{ width: '47%', backgroundColor: sel ? theme.accentBlueBg : theme.bgCard,
                          borderWidth: 1, borderColor: sel ? theme.accentBlueRaw : theme.borderCard,
                          borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 }}>
                        <Ionicons name={meta.icon as any} size={22} color={sel ? theme.accentBlue : theme.textMuted} />
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_700Bold', color: sel ? theme.accentBlue : theme.textPrimary, textAlign: 'center' }}>
                          {meta.label}
                        </Text>
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center', lineHeight: 13 }}>
                          {meta.description}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Step 2: Chart type picker */}
              {creatorStep === 2 && creatorDataKey && (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {availableChartTypes(creatorDataKey).map(ct => {
                    const sel = creatorChartType === ct;
                    return (
                      <TouchableOpacity key={ct} onPress={() => { setCreatorChartType(ct); setCreatorStep(3); }}
                        style={{ flex: 1, backgroundColor: sel ? theme.accentBlueBg : theme.bgCard,
                          borderWidth: 1.5, borderColor: sel ? theme.accentBlueRaw : theme.borderCard,
                          borderRadius: 14, padding: 24, alignItems: 'center', gap: 10 }}>
                        <Ionicons name={ct === 'line' ? 'analytics-outline' : 'bar-chart-outline'} size={32}
                          color={sel ? theme.accentBlue : theme.textMuted} />
                        <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: sel ? theme.accentBlue : theme.textPrimary }}>
                          {ct === 'line' ? 'Line' : 'Bar'}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, textAlign: 'center' }}>
                          {ct === 'line' ? 'Trend line with area fill' : 'Daily bar chart'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Step 3: Preview */}
              {creatorStep === 3 && creatorDataKey && creatorChartType && (
                <>
                  <StatsGraphCard
                    card={{ id: 'creator_preview', type: 'graph', dataKey: creatorDataKey, chartType: creatorChartType, period: 7, label: DATA_KEY_META[creatorDataKey].label, visible: true, order: 0, placement: 'stats' }}
                    cardTrendData={trendDataMap['7'] ?? EMPTY_TREND_DATA}
                    theme={theme}
                    calTarget={calTarget}
                    stepGoal={stepGoal}
                    sleepGoal={sleepGoal}
                    onPeriodChange={() => {}}
                    onEditPress={() => {}}
                  />
                  <TouchableOpacity onPress={handleAddCard}
                    style={{ backgroundColor: theme.accentBlueRaw, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff', letterSpacing: 1.5 }}>ADD TO STATS</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Step indicator -- fixed at sheet bottom */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 7, paddingTop: 10, paddingBottom: insets.bottom + 16 }}>
              {[1, 2, 3].map(s => (
                <View key={s} style={{ width: s === creatorStep ? 16 : 6, height: 6, borderRadius: 3,
                  backgroundColor: s <= creatorStep ? theme.accentBlueRaw : theme.borderSubtle }} />
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {dayDetailDate !== null && (
        <Modal transparent animationType="none" visible={dayDetailDate !== null} onRequestClose={closeDayDetail} statusBarTranslucent hardwareAccelerated
          onShow={() => {
            dayDetailAnim.setValue(0);
            Animated.timing(dayDetailAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
          }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: dayDetailAnim, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={closeDayDetail} />
            <Animated.View style={{ width: '92%', height: '75%', borderRadius: 20, backgroundColor: theme.bgSheet, borderWidth: 0.5, borderColor: theme.borderSheet, overflow: 'hidden', opacity: dayDetailAnim }}>
              <TouchableOpacity onPress={closeDayDetail} style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 40 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle, marginTop: 12, marginBottom: 12 }} />
              </TouchableOpacity>
              <DayDetailContent date={dayDetailDate} onClose={closeDayDetail} />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 16, paddingBottom: 100 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 4 },
  headerLabel:  { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:  { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card:         { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  cardLabel:    { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 0, fontFamily: 'DMSans_700Bold' },
  calGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  calDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 9, letterSpacing: 1, paddingVertical: 4, fontFamily: 'DMSans_700Bold' },
  calDay:       { width: '14.28%', height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  calDayToday:  { borderWidth: 1 },
  calDayText:   { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  historyRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  historyDate:  { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  historyVal:   { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  glanceRow:    { flexDirection: 'row', borderBottomWidth: 0.5 },
  glanceCellL:  { width: '50%', paddingVertical: 10, paddingRight: 12 },
  glanceCellR:  { width: '50%', paddingVertical: 10, paddingLeft: 12 },
  glanceLabel:  { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 },
  glanceVal:    { fontSize: 15, fontFamily: 'DMSans_700Bold' },
});
