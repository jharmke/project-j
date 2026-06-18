import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import { CardWash } from '../components/GradientCard';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import {
  DiagnosticCard,
  DiagnosticReport,
  deleteReport,
  loadSavedReports,
  saveReport,
} from '../utils/diagnosticReport';
import {
  SmartTipsStore,
  StoredTip,
  CoachTipCache,
  TIPS_GATED,
  computeAndStoreSmartTips,
  isCrossSignalRule,
  loadCoachTipCache,
  loadCoachTipCacheEvr,
  loadSmartTips,
} from '../utils/smartTipsEngine';
import { refreshCoachTipEvr, resolveTipBody, resolveTipTitle, voiceDiagnosticCards } from '../utils/coachAI';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dk: string): string {
  const [, m, d] = dk.split('-');
  return `${MONTH_ABBR[parseInt(m) - 1]} ${parseInt(d)}`;
}

function fmtDateFull(dk: string): string {
  const [y, m, d] = dk.split('-');
  return `${MONTH_ABBR[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// generatedAt is stored as a UTC ISO timestamp; slicing its date portion shows the UTC
// day, which rolls over before midnight local (e.g. an 8pm-on-the-17th report read "Jun
// 18"). Derive the LOCAL calendar date from the timestamp instead.
function localDateKey(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso.slice(0, 10); // fallback for any legacy non-ISO value
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// ── Chip label ─────────────────────────────────────────────────────────────────

function ChipLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.accentBlueRaw }}>{label}</Text>
    </View>
  );
}

// ── Stat module: structured proof as big numbers + an animated bar, replacing the
// plain-text proof line. value-vs-target shape (the common case). The bar fills to
// value/target; track + fill are derived from the card's tone accent so it is theme-safe.
// Axis ticks + centered labels for a plain bar that sits at top:4 height:8 inside a
// height:34 positioned container (matches the range track). ticks anchored 0..1.
function AxisTicks({ theme, ticks }: { theme: any; ticks: { pct: number; label: string | number }[] }) {
  const t = theme;
  return (
    <>
      {ticks.map((tk, i) => (
        <View key={`mk${i}`} style={{ position: 'absolute', top: 13, left: `${tk.pct * 100}%`, width: 1, height: 4, backgroundColor: t.textMuted + '55' }} />
      ))}
      {ticks.map((tk, i) => (
        <View key={`lb${i}`} style={{ position: 'absolute', top: 19, left: `${tk.pct * 100}%`, width: 30, marginLeft: -15, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', color: t.textMuted }}>{tk.label}</Text>
        </View>
      ))}
    </>
  );
}

// One stat module, four bar shapes (metric.kind):
//  target  -> value vs goal, higher-better, "short"/"over" pill (suppressed on positives)
//  score   -> single 0-100 number, NO delta, second number becomes a caption
//  range   -> value vs a [min,max] band, pill only when outside the band
//  compare -> two stacked bars A (accent) vs B (secondary), no goal/pill
// Do NOT collapse these into one bar: a score or compare rendered as value/target would
// produce a broken >100% fill (e.g. sleep 88 over 14 nights = 600%).
function StatBar({ metric, accent, theme, positive }: { metric: NonNullable<DiagnosticCard['metric']>; accent: string; theme: any; positive: boolean }) {
  const t = theme;
  const unit = metric.unit ?? '';
  const kind = metric.kind ?? 'target';
  const fmt = (n: number) => (Number.isInteger(n) ? n : Math.round(n * 10) / 10);

  // Fills per shape (0-1). compare gets a second fill.
  let fill = 0, fillB = 0;
  if (kind === 'compare') {
    const max = Math.max(metric.value, metric.target, 0.0001);
    fill = metric.value / max;
    fillB = metric.target / max;
  } else if (kind === 'score') {
    fill = Math.max(0, Math.min(1, metric.value / (metric.target || 100)));
  } else if (kind === 'range') {
    const max = metric.rangeMax ?? metric.target;
    fill = max > 0 ? Math.max(0, Math.min(1, metric.value / max)) : 0;
  } else {
    fill = metric.target > 0 ? Math.max(0, Math.min(1, metric.value / metric.target)) : 0;
  }

  const anim = useRef(new Animated.Value(0)).current;
  const animB = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current; // 0->1 mount driver for dumbbell + range track
  useEffect(() => {
    Animated.timing(anim, { toValue: fill, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (kind === 'compare') Animated.timing(animB, { toValue: fillB, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.timing(reveal, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fill, fillB]);

  const numStyle = { fontSize: 32, fontFamily: 'BebasNeue_400Regular' as const, letterSpacing: 0.5, lineHeight: 34 };
  // Unit (G, LB...) -- BebasNeue like the number (stays capitalized), just smaller so it
  // reads as a unit, not part of the value.
  const unitStyle = { fontSize: 13, fontFamily: 'BebasNeue_400Regular' as const };
  const labelStyle = { fontSize: 9, letterSpacing: 2, fontFamily: 'DMSans_700Bold' as const, color: t.textMuted, textTransform: 'uppercase' as const, marginTop: 2 };
  const barTrack = { height: 8, borderRadius: 4, backgroundColor: accent + '22', overflow: 'hidden' as const };
  const widthOf = (a: Animated.Value) => a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // ── Pill (target + range only) ──
  let pill: string | null = null;
  if (!positive) {
    if (kind === 'target') {
      const d = Math.round(metric.target - metric.value);
      if (d > 0) pill = `${d}${unit} short`; else if (d < 0) pill = `${Math.abs(d)}${unit} over`;
    } else if (kind === 'range') {
      const lo = metric.rangeMin ?? 0, hi = metric.rangeMax ?? metric.target;
      if (metric.value < lo) pill = `${Math.round(lo - metric.value)}${unit} short`;
      else if (metric.value > hi) pill = `${Math.round(metric.value - hi)}${unit} over`;
    }
  }

  // ── goalbar: fill bar to ACTUAL with a tick at PREDICTED. When the fill overshoots the
  // tick you beat the prediction; short of it you lagged. Color-coded to the two numbers:
  // actual = accent fill, predicted = grey tick. value = predicted, target = actual. ──
  if (kind === 'goalbar') {
    const scaleMax = Math.max(metric.value, metric.target, 0.0001) * 1.18;
    const fillActual = Math.max(0, Math.min(1, metric.target / scaleMax));
    const goalPct = Math.max(0, Math.min(1, metric.value / scaleMax));
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <View>
            <Text style={[numStyle, { color: t.textSecondary }]}>{fmt(metric.value)}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={labelStyle}>{metric.primaryLabel}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[numStyle, { color: accent }]}>{fmt(metric.target)}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={[labelStyle, { textAlign: 'right' }]}>{metric.secondaryLabel}</Text>
          </View>
        </View>
        <View style={{ height: 28, paddingTop: 2 }}>
          <View style={{ position: 'absolute', top: 2, left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: t.textMuted + '22' }} />
          <Animated.View style={{ position: 'absolute', top: 2, left: 0, height: 8, borderRadius: 4, backgroundColor: accent, width: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${fillActual * 100}%`] }) }} />
          {/* PREDICTED tick (grey, matches the predicted number) */}
          <View style={{ position: 'absolute', top: -1, left: `${goalPct * 100}%`, marginLeft: -1.5, width: 3, height: 14, borderRadius: 1.5, backgroundColor: t.textSecondary }} />
          {/* axis ends */}
          <Text style={{ position: 'absolute', top: 15, left: 0, fontSize: 9, fontFamily: 'DMSans_700Bold', color: t.textMuted }}>0</Text>
          <Text style={{ position: 'absolute', top: 15, left: `${goalPct * 100}%`, marginLeft: -24, fontSize: 8, letterSpacing: 1, fontFamily: 'DMSans_700Bold', color: t.textMuted }}>PREDICTED</Text>
        </View>
      </View>
    );
  }

  // ── dots: a frequency row -- `target` dots, first `value` filled. The proof is "X of Y"
  // (how often the pattern hit), not a magnitude, so one outlier can't skew it. ──
  if (kind === 'dots') {
    const total = Math.max(0, Math.round(metric.target));
    const filled = Math.max(0, Math.min(total, Math.round(metric.value)));
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: i < filled ? accent : 'transparent', borderWidth: i < filled ? 0 : 1.5, borderColor: accent + '55' }} />
          ))}
        </View>
        <Text style={labelStyle}>{metric.primaryLabel}</Text>
        {!!metric.caption && (
          <Text style={{ marginTop: 4, fontSize: 12, fontFamily: 'DMSans_700Bold', color: accent }}>{metric.caption}</Text>
        )}
      </View>
    );
  }

  // ── compare: two numbers, two stacked bars (A accent, B secondary) ──
  if (kind === 'compare') {
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
          <View style={{ marginRight: 28 }}>
            <Text style={[numStyle, { color: accent }]}>{fmt(metric.value)}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={labelStyle}>{metric.primaryLabel}</Text>
          </View>
          <View>
            <Text style={[numStyle, { color: t.textSecondary }]}>{fmt(metric.target)}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={labelStyle}>{metric.secondaryLabel}</Text>
          </View>
        </View>
        <View style={[barTrack, { marginBottom: 6 }]}>
          <Animated.View style={{ height: '100%', borderRadius: 4, backgroundColor: accent, width: widthOf(anim) }} />
        </View>
        <View style={barTrack}>
          <Animated.View style={{ height: '100%', borderRadius: 4, backgroundColor: t.textSecondary, width: widthOf(animB) }} />
        </View>
      </View>
    );
  }

  // ── score: single big number + caption, one bar (value / 100) ──
  if (kind === 'score') {
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
          <View>
            <Text style={[numStyle, { color: accent }]}>{fmt(metric.value)}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={labelStyle}>{metric.primaryLabel}</Text>
          </View>
          {!!metric.caption && (
            <Text style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, letterSpacing: 1.5, fontFamily: 'DMSans_700Bold', color: t.textMuted, textTransform: 'uppercase' }}>{metric.caption}</Text>
          )}
        </View>
        <View style={{ height: 34, paddingTop: 4 }}>
          <View style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: accent + '22' }} />
          <Animated.View style={{ position: 'absolute', top: 4, left: 0, height: 8, borderRadius: 4, backgroundColor: accent, width: widthOf(anim) }} />
          <AxisTicks theme={t} ticks={[{ pct: 0, label: 0 }, { pct: 1, label: 100 }]} />
        </View>
      </View>
    );
  }

  // ── range track: a rail with the healthy [min,max] zone highlighted + a marker pin at
  // the value. Reads "where you sit relative to the band," not a fake value/max fill. ──
  if (kind === 'range') {
    const lo = metric.rangeMin ?? 0;
    const hi = metric.rangeMax ?? metric.target;
    const scaleMax = Math.max(hi * 1.25, metric.value * 1.1, 0.0001);
    const bandLeft = lo / scaleMax;
    const bandWidth = (hi - lo) / scaleMax;
    const markerPct = Math.max(0, Math.min(1, metric.value / scaleMax));
    const tickText = { fontSize: 9, fontFamily: 'DMSans_700Bold' as const, color: t.textMuted };
    const tickLabel = (pct: number, txt: string | number) => (
      <View style={{ position: 'absolute', top: 19, left: `${pct * 100}%`, width: 30, marginLeft: -15, alignItems: 'center' }}>
        <Text style={tickText}>{txt}</Text>
      </View>
    );
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
          <View style={{ marginRight: 28 }}>
            <Text style={[numStyle, { color: accent }]}>{fmt(metric.value)}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={labelStyle}>{metric.primaryLabel}</Text>
          </View>
          <View>
            <Text style={[numStyle, { color: t.textSecondary }]}>{lo}-{hi}<Text style={unitStyle}>{unit}</Text></Text>
            <Text style={labelStyle}>TARGET RANGE</Text>
          </View>
          {pill && (
            <View style={{ marginLeft: 'auto', alignSelf: 'center', backgroundColor: accent + '1f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: accent }}>{pill}</Text>
            </View>
          )}
        </View>
        <View style={{ height: 34, justifyContent: 'flex-start', paddingTop: 4 }}>
          <View style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: t.textMuted + '22' }} />
          <View style={{ position: 'absolute', top: 4, height: 8, borderRadius: 4, left: `${bandLeft * 100}%`, width: `${bandWidth * 100}%`, backgroundColor: accent + '38' }} />
          <Animated.View style={{ position: 'absolute', top: 0, marginLeft: -2, left: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${markerPct * 100}%`] }), width: 4, height: 16, borderRadius: 2, backgroundColor: accent }} />
          {/* axis ticks: 0 origin + band edges + max, so the band is anchored, not floating */}
          <View style={{ position: 'absolute', top: 13, left: 0, width: 1, height: 4, backgroundColor: t.textMuted + '55' }} />
          <View style={{ position: 'absolute', top: 13, left: `${bandLeft * 100}%`, width: 1, height: 4, backgroundColor: t.textMuted + '55' }} />
          <View style={{ position: 'absolute', top: 13, left: `${(bandLeft + bandWidth) * 100}%`, width: 1, height: 4, backgroundColor: t.textMuted + '55' }} />
          <View style={{ position: 'absolute', top: 13, right: 0, width: 1, height: 4, backgroundColor: t.textMuted + '55' }} />
          {/* all four labels centered on their ticks (ends bleed into the card padding) */}
          {tickLabel(0, 0)}
          {tickLabel(bandLeft, lo)}
          {tickLabel(bandLeft + bandWidth, hi)}
          {tickLabel(1, Math.round(scaleMax))}
        </View>
      </View>
    );
  }

  // ── target: value vs goal, optional pill, one bar ──
  const secondaryCap = metric.secondaryLabel;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
        <View style={{ marginRight: 28 }}>
          <Text style={[numStyle, { color: accent }]}>{fmt(metric.value)}<Text style={unitStyle}>{unit}</Text></Text>
          <Text style={labelStyle}>{metric.primaryLabel}</Text>
        </View>
        <View>
          <Text style={[numStyle, { color: t.textSecondary }]}>{fmt(metric.target)}<Text style={unitStyle}>{unit}</Text></Text>
          <Text style={labelStyle}>{secondaryCap}</Text>
        </View>
        {pill && (
          <View style={{ marginLeft: 'auto', alignSelf: 'center', backgroundColor: accent + '1f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', color: accent }}>{pill}</Text>
          </View>
        )}
      </View>
      <View style={{ height: 34, paddingTop: 4 }}>
        <View style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 8, borderRadius: 4, backgroundColor: accent + '22' }} />
        <Animated.View style={{ position: 'absolute', top: 4, left: 0, height: 8, borderRadius: 4, backgroundColor: accent, width: widthOf(anim) }} />
        <AxisTicks theme={t} ticks={[{ pct: 0, label: 0 }, { pct: 1, label: fmt(metric.target) }]} />
      </View>
    </View>
  );
}

// Per-topic corner watermark. Keyed off card.id (positives share their topic's icon).
// Clipped into the bottom-right via an inner overflow:hidden layer (NOT the card itself --
// that would kill the shadow); bleeds past the corner so it reads as a tucked watermark.
function CardWatermark({ id, color }: { id: string; color: string }) {
  let icon: ReactNode = null;
  const style = { position: 'absolute' as const, right: -18, bottom: -20, opacity: 0.07 };
  if (id === 'protein' || id === 'protein_good') icon = <MaterialCommunityIcons name="food-drumstick" size={128} color={color} style={style} />;
  else if (id === 'fiber' || id === 'fiber_good') icon = <Ionicons name="leaf" size={120} color={color} style={style} />;
  else if (id === 'sleep_good') icon = <Ionicons name="moon" size={118} color={color} style={style} />;
  else if (id === 'deficit') icon = <MaterialCommunityIcons name="scale-bathroom" size={120} color={color} style={style} />;
  else if (id === 'consistency_good' || id === 'consistency_gaps') icon = <Ionicons name="calendar" size={116} color={color} style={style} />;
  else if (id === 'burn_accuracy') icon = <Ionicons name="flame" size={120} color={color} style={style} />;
  else if (id.startsWith('rec_')) icon = <Ionicons name="pulse" size={124} color={color} style={style} />;
  else icon = <Ionicons name="analytics" size={120} color={color} style={style} />;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, overflow: 'hidden' }} pointerEvents="none">
      {icon}
    </View>
  );
}

// ── Diagnostic card feed (track 2 surface) ───────────────────────────────────────
// Renders one ranked DiagnosticCard: claim (headline) + proof (the number, prominent)
// + insight (AI context line, when voiced) + lever (the action, NEVER labeled "lever").
// Replaces the old fixed scorecard finding cards. Mindful hides the status chip; full
// Mindful lever-suppression is a later sub-step (voicer already softens copy in Mindful).
function DiagnosticFeedCard({ card, theme, shadowStyle, isMindful }: { card: DiagnosticCard; theme: any; shadowStyle: any; isMindful: boolean }) {
  const t = theme;
  // MINDFUL: a corrective card is an OBSERVATION, not a verdict. Its amber/red accent flips to the
  // neutral accent blue (same principle as the Recovery divergent bars in Mindful), and the wash
  // follows it, so the card reads calm instead of alarming. Positive cards keep green in every
  // mode (encouragement is never a judgment). The voicer already softens the copy in Mindful; the
  // visual matches it here.
  const softenLever = isMindful && !card.positive;
  const accent = card.positive
    ? t.statusGood
    : (isMindful ? t.accentBlueRaw : (card.tone === 'factor' ? t.statusBad : t.statusWarn));
  const chip = card.positive ? 'WORKING' : (card.tone === 'factor' ? 'KEY FACTOR' : 'WORTH ATTENTION');
  // Full treatment on EVERY card (rolled out from the protein reference 2026-06-16): tone-toned
  // gradient wash + per-topic corner watermark. CardWash provides the colored top edge, so the
  // 1.5px top border is flattened to 0.5 to avoid the uneven iOS corner the recipe warns about.
  return (
    <View style={[styles.card, {
      backgroundColor: t.bgCard,
      borderColor: t.borderCard,
      borderTopColor: t.borderCardTop,
      borderTopWidth: 0.5,
      ...shadowStyle, marginBottom: 12,
    }]}>
      <CardWash color={accent} scored radius={14} />
      <CardWatermark id={card.id} color={accent} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.cardLabel, { color: t.textMuted }]}>{(card.window || '').toUpperCase()}</Text>
        {!isMindful && (
          <View style={{ backgroundColor: accent + '22', borderColor: accent + '55', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 9, letterSpacing: 1.5, fontFamily: 'DMSans_700Bold', color: accent }}>{chip}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: t.textSecondary, lineHeight: 21, marginBottom: 12 }}>{card.claim}</Text>
      {card.metric ? (
        <StatBar metric={card.metric} accent={accent} theme={t} positive={card.positive} />
      ) : (
        <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: accent, marginBottom: card.insight ? 8 : 10 }}>{card.proof}</Text>
      )}
      {card.insight ? (
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 20, marginBottom: 10 }}>{card.insight}</Text>
      ) : null}
      {softenLever ? (
        // Mindful corrective: no arrow, no bold directive color -- a quiet italic note to notice,
        // not an instruction to follow.
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: t.textSecondary, lineHeight: 20 }}>{card.lever}</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
          <Text style={{ fontSize: 14, color: accent, marginTop: 1, fontFamily: 'DMSans_700Bold' }}>→</Text>
          <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: accent, lineHeight: 20 }}>{card.lever}</Text>
        </View>
      )}
    </View>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
// Shown in the card-feed slot while the AI voicing call is in flight on first view, so
// the feed reveals fully-voiced in one shot instead of swapping short text for voiced
// (the "pop-in" jank). Pulses via a shared Animated value driven by the parent.
function SkeletonFeedCard({ theme, shadowStyle, pulse }: { theme: any; shadowStyle: any; pulse: Animated.Value }) {
  const t = theme;
  const bar = (w: any, h: number, mb: number) => (
    <Animated.View style={{ width: w, height: h, borderRadius: 5, marginBottom: mb, backgroundColor: t.textMuted, opacity: pulse }} />
  );
  return (
    <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', ...shadowStyle }]}>
      {bar('72%', 14, 14)}
      {bar('42%', 18, 14)}
      {bar('100%', 10, 7)}
      {bar('88%', 10, 0)}
    </View>
  );
}

// ── Smart Tip cards ────────────────────────────────────────────────────────────

function InsightTipCard({ tip, isBlurred, theme, shadowStyle }: { tip: StoredTip; isBlurred: boolean; theme: any; shadowStyle: any }) {
  const chipLabel = tip.positive ? 'CORRELATION: POSITIVE' : 'CORRELATION: INSIGHT';
  if (isBlurred) {
    return (
      <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <ChipLabel label="INSIGHT" theme={theme} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
            <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.accentBlueRaw }}>PRO</Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 20, marginBottom: 10 }}>
          {tip.title}
        </Text>
        <View style={{ gap: 6 }}>
          <View style={{ height: 10, backgroundColor: theme.textMuted + '30', borderRadius: 4, width: '100%' }} />
          <View style={{ height: 10, backgroundColor: theme.textMuted + '30', borderRadius: 4, width: '82%' }} />
          <View style={{ height: 10, backgroundColor: theme.textMuted + '20', borderRadius: 4, width: '65%' }} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, ...shadowStyle }]}>
      <View style={{ marginBottom: 10 }}>
        <ChipLabel label={chipLabel} theme={theme} />
      </View>
      <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 21, marginBottom: 8 }}>
        {tip.title}
      </Text>
      <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 20 }}>
        {tip.body}
      </Text>
    </View>
  );
}

function SmartTipCard({ tip, theme, shadowStyle }: { tip: StoredTip; theme: any; shadowStyle: any }) {
  const borderColor = tip.positive ? theme.statusGood : tip.tier === 'urgent' ? theme.statusBad : theme.statusWarn;
  const chipLabel = tip.positive ? 'POSITIVE' : tip.tier.toUpperCase();
  const chipColor = tip.positive ? theme.statusGood : tip.tier === 'urgent' ? theme.statusBad : theme.statusWarn;
  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: borderColor, ...shadowStyle }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ backgroundColor: chipColor + '22', borderWidth: 1, borderColor: chipColor + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: chipColor }}>{chipLabel}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary, lineHeight: 20, marginBottom: 6 }}>
        {tip.title}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 18 }}>
        {tip.body}
      </Text>
    </View>
  );
}

// ── Tutorial demo report ───────────────────────────────────────────────────────

const TUTORIAL_DEMO_REPORT: DiagnosticReport = {
  id: 'tutorial_demo',
  generatedAt: new Date().toISOString(),
  windowDays: 30,
  dateRangeStart: '2026-04-28',
  dateRangeEnd: '2026-05-27',
  goalDirection: 'lose',
  summary: 'You logged 22 of 30 days. Your calorie deficit looks solid on paper, but sleep quality and weekend patterns are likely holding back your results.',
  insufficientData: false,
  minLoggedDays: 22,
  consistency: { type: 'consistency', status: 'attention', loggedDays: 22, totalDays: 30, suspectDays: 2, excludedDays: 0, rate: 0.73 },
  deficit: { type: 'deficit', status: 'good', goalDirection: 'lose', avgDailyDeficit: -340, expectedChangeLbs: 2.9, actualChangeLbs: -1.6, gapLbs: 1.3, loggedDays: 22, hasWeightData: true },
  burnAccuracy: { type: 'burnAccuracy', status: 'attention', burnAccuracyPct: 100, avgActiveCalPerDay: 480, isFlagged: true },
  macros: { type: 'macros', status: 'attention', macroStatus: 'attention', fiberStatus: 'good', avgProtein: 112, proteinGoalMin: 140, proteinGoalMax: 160, avgFiber: 28, hasData: true, bodyWeightLbs: 185, lowFiberNote: false },
  sleep: { type: 'sleep', status: 'attention', avgSleepScore: 61, avgSleepHours: 6.4, totalSleepDays: 18, poorSleepCalDelta: 180, hasEnoughData: true },
  correlations: {
    type: 'correlations',
    correlations: [
      { id: 'sleep_intake', headline: 'After nights under 6 hours, you logged 180 more calories', detail: 'Sleep deprivation raises ghrelin (hunger) and lowers leptin (fullness). This pattern appeared consistently across your window.' },
      { id: 'weekend_pattern', headline: 'Weekend calories averaged 350 more than weekdays', detail: 'Weekends showed a consistent surplus pattern. Most of the gap between expected and actual weight change comes from these days.' },
    ],
  },
  suggestions: [
    { rank: 1, headline: 'Protect your sleep', detail: 'Getting under 6 hours consistently is adding about 180 extra calories per day through appetite shifts. Prioritizing sleep could close most of your result gap.' },
    { rank: 2, headline: 'Set a weekend calorie buffer', detail: 'Your weekday logging is strong. On weekends, plan for a 200-300 cal higher limit rather than trying to match weekday strictness.' },
    { rank: 3, headline: 'Adjust your burn estimate', detail: 'Your burn accuracy is at 100%. Most wearables overestimate by 15-25%. Try 85% in Settings > Health for more accurate math.' },
  ],
  cards: [
    { id: 'weekend_weekday', claim: 'Weekends are erasing your weekday deficit.', proof: 'Weekdays 1,820 cal · weekends 2,310 cal', lever: 'Give weekends the same loose plan you give weekdays and the deficit holds.', window: 'Weekends, last 30 days', strength: 86, tone: 'factor', positive: false },
    { id: 'protein_streak', claim: 'Your protein has been consistently strong.', proof: 'Last 7 days: 148 g/day vs 140 g goal', lever: 'Keep going. This is the habit that compounds.', window: 'Last 7 days', strength: 78, tone: 'positive', positive: true },
    { id: 'sleep_nextday_cals', claim: 'Short sleep is pushing your intake up the next day.', proof: 'After poor sleep: +180 cal the next day', lever: 'Protect a consistent bedtime. It moves your intake more than willpower does.', window: 'Last 30 days', strength: 72, tone: 'attention', positive: false },
    { id: 'deficit', claim: 'Your results are lagging what your logging predicts.', proof: 'Predicted: lost 2.9 lbs · Actual: lost 1.6 lbs', lever: 'The gap usually hides in unlogged days or an overstated calorie burn. Tighten one.', window: 'Over 30 days', strength: 68, tone: 'attention', positive: false },
  ],
};

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DiagnosticReportViewScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const { id, tutorial } = useLocalSearchParams<{ id?: string; tutorial?: string }>();
  const isTutorialMode = tutorial === '1';

  const { registerScrollView, unregisterScrollView } = useTutorial();
  const findingsSectionRef  = useTutorialTarget('evr_findings_section');
  const firstCardRef        = useTutorialTarget('evr_card_0');
  const coachInsightRef     = useTutorialTarget('evr_coach_insight');
  const correlationsRef     = useTutorialTarget('evr_correlations');
  const suggestionsRef      = useTutorialTarget('evr_suggestions');
  const scrollRef = useRef<any>(null);

  const [report, setReport]       = useState<DiagnosticReport | null>(isTutorialMode ? TUTORIAL_DEMO_REPORT : null);
  const [styleMode, setStyleMode] = useState<'Discipline' | 'Balanced' | 'Mindful'>('Balanced');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [notFound, setNotFound]   = useState(false);
  const [smartTips, setSmartTips] = useState<SmartTipsStore | null>(null);
  const [coachCache, setCoachCache] = useState<CoachTipCache | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  // Voiced diagnostic card feed: show deterministic cards instantly, upgrade to AI-voiced
  // (claim/lever rewritten + insight added) when the batched call returns. Proof is never
  // sent for editing, so numbers stay exact. Falls back to deterministic on any failure.
  const [voicedCards, setVoicedCards] = useState<DiagnosticCard[] | null>(
    isTutorialMode ? (TUTORIAL_DEMO_REPORT.cards ?? null) : null
  );
  // True while the first-view AI voicing call is in flight -- the feed shows skeletons
  // instead of the short deterministic cards, then reveals voiced in one shot (no swap).
  const [cardsVoicing, setCardsVoicing] = useState(false);
  const cardPulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(cardPulse, { toValue: 0.6, duration: 650, useNativeDriver: true }),
      Animated.timing(cardPulse, { toValue: 0.22, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const isMindful = styleMode === 'Mindful';
  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };

  useEffect(() => {
    registerScrollView('effort_vs_results_view', scrollRef);
    return () => unregisterScrollView('effort_vs_results_view');
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isTutorialMode) return;
      const load = async () => {
        let mode: 'Discipline' | 'Balanced' | 'Mindful' = 'Balanced';
        try {
          const s = await AsyncStorage.getItem('pj_settings');
          if (s) { const d = JSON.parse(s); if (d.styleMode) { setStyleMode(d.styleMode); mode = d.styleMode; } }
        } catch {}
        if (!id) { setNotFound(true); return; }
        const reports = await loadSavedReports();
        const found = reports.find(r => r.id === decodeURIComponent(id));
        if (!found) { setNotFound(true); return; }
        setReport(found);
        // Card feed: show whatever the report has instantly. Voice ONCE per report, then
        // persist the voiced cards back onto the saved report so reopening never re-calls
        // the AI (this was the 5-8s-every-open cost). A report counts as voiced once any
        // card carries an `insight` line.
        const baseCards = found.cards ?? [];
        setVoicedCards(baseCards);
        const alreadyVoiced = baseCards.some(c => !!c.insight);
        if (baseCards.length > 0 && !alreadyVoiced) {
          // First view: show skeletons while voicing, then reveal voiced in one shot. On any
          // failure/timeout, finally() clears the flag so the deterministic baseCards reveal.
          setCardsVoicing(true);
          voiceDiagnosticCards(baseCards, mode)
            .then(voiced => {
              setVoicedCards(voiced);
              // Only persist if voicing actually produced insight (real AI pass, not the
              // unchanged fallback) so a timeout does not lock in un-voiced cards.
              if (voiced.some(c => !!c.insight)) {
                saveReport({ ...found, cards: voiced }).catch(() => {});
              }
            })
            .catch(() => {})
            .finally(() => setCardsVoicing(false));
        } else {
          setCardsVoicing(false);
        }
        // Load stored Smart Tips for instant display, then refresh in background
        const stored = await loadSmartTips();
        if (stored) setSmartTips(stored);
        computeAndStoreSmartTips().then(fresh => setSmartTips(fresh)).catch(() => {});
        // Load EvR coach tip: show cached instantly, then refresh in background.
        // Home ruleId is passed so EvR never repeats the same scenario as the home card.
        // The headline engine only ever analyzes a 7/14-day window (runAllRules on w7/w5/w14),
        // so label it 14, NOT the report's stamped windowDays (90 = the old MAX_WINDOW leftover
        // from the deleted selector). Feeding 90 made the AI scold "14 of 90 days logged, still an
        // early read" for a finding that only looked at 14 days. The cards already use real
        // per-pattern windows; this keeps the headline honest to what it actually computes.
        const windowDays = 14 as const;
        const [cachedEvr, homeCache] = await Promise.all([
          loadCoachTipCacheEvr(windowDays),
          loadCoachTipCache(),
        ]);
        // Only flash a cached headline instantly when it is already TODAY's final read (same-day
        // compute). The same-day gate in computeCoachPacketEvr guarantees the refresh returns it
        // unchanged, so there's no swap. A stale prior-day cache WOULD get replaced by the refresh
        // (the ranking re-rolls for today, e.g. weight -> sleep), so in that case show the loading
        // spinner and reveal the fresh tip in one shot -- same no-swap treatment as the card feed.
        const pad = (n: number) => String(n).padStart(2, '0');
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const cachedIsTodaysFinal = !!cachedEvr && cachedEvr.packet.computedDate === todayKey;
        if (cachedIsTodaysFinal) { setCoachCache(cachedEvr); setCoachLoading(false); }
        else { setCoachCache(null); setCoachLoading(true); }
        const homeRuleId = homeCache?.packet.ruleId ?? null;
        refreshCoachTipEvr(windowDays, homeRuleId)
          .then(cache => { setCoachCache(cache); setCoachLoading(false); })
          .catch(() => setCoachLoading(false));
      };
      load();
    }, [id, isTutorialMode])
  );

  const handleDelete = () => {
    if (!report || isTutorialMode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Report',
      'Remove this saved report? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteReport(report.id);
            showToast('Report deleted', undefined, 'success');
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ToastRenderer />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={t.accentBlueRaw} />
          <Text style={[styles.backText, { color: t.accentBlueRaw }]}>Reports</Text>
        </TouchableOpacity>
        {report && !isTutorialMode && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color={t.statusBad} />
          </TouchableOpacity>
        )}
      </View>

      {/* Not found state */}
      {notFound && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color={t.textMuted} style={{ marginBottom: 14 }} />
          <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', color: t.textPrimary, letterSpacing: 1, marginBottom: 8 }}>Report Not Found</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            This report may have been deleted.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: t.accentBlueRaw }}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {report && (
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

          {/* Title + window info */}
          <View style={{ paddingHorizontal: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>{'EFFORT VS\nRESULTS'}</Text>
            <TooltipIcon tooltipKey="effort_vs_results" size={18} />
          </View>

          {/* "As of" stamp -- no single window now; each card states its own timeframe */}
          <View style={{ alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: t.accentBlueRaw }}>
                GENERATED {fmtDateFull(localDateKey(report.generatedAt))}
              </Text>
            </View>
          </View>

          {/* Summary card cut 2026-06-16 (redundant with the diagnosis headline + ranked feed).
              Only the needs-more-data notice survives, shown standalone when the window is
              under-logged so the data gate still communicates. */}
          {report.insufficientData && (
            <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.statusWarn, ...shadowStyle }]}>
              <View style={{ backgroundColor: t.statusWarn + '18', borderRadius: 8, padding: 12, borderLeftWidth: 3, borderLeftColor: t.statusWarn }}>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: t.statusWarn, marginBottom: 2 }}>Needs more data</Text>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 18 }}>
                  Log food for at least 7 days in this window to unlock the full analysis.
                </Text>
              </View>
            </View>
          )}

          {/* Coach Insight (Level 1 headline diagnosis) now LEADS the report; the ranked card
              feed follows it. Moved above the feed + reblued 2026-06-16. */}
          {!report.insufficientData && (
            <>
              {/* AI Coach Insight card */}
              {isTutorialMode ? (
                <View ref={coachInsightRef} collapsable={false} style={{ marginBottom: 12 }}>
                  <View style={[shadowStyle, {
                    backgroundColor: t.accentBlueRaw + '12', borderRadius: 12, borderWidth: 1,
                    borderColor: t.accentBlueRaw + '50', padding: 14, alignItems: 'center',
                  }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                      <Ionicons name="sparkles" size={12} color={t.accentBlueRaw} />
                      <Text style={{ fontSize: 9, letterSpacing: 3, color: t.accentBlueRaw, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
                    </View>
                    <View style={{ width: '100%', height: 0.5, backgroundColor: t.accentBlueRaw + '40', marginBottom: 10 }} />
                    <Text style={{ fontSize: 14, color: t.textSecondary, fontFamily: 'DMSans_600SemiBold', lineHeight: 22, fontStyle: 'italic', textAlign: 'center' }}>
                      Your weekend pattern is the main lever. Close that gap and your deficit holds most weeks.
                    </Text>
                  </View>
                </View>
              ) : TIPS_GATED ? (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.sectionLabel, { color: t.textMuted }]}>COACH INSIGHT</Text>
                  <View style={[shadowStyle, {
                    backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5,
                    borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
                    borderLeftWidth: 3, borderLeftColor: t.accentBlueRaw, padding: 16, paddingLeft: 15,
                  }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="sparkles" size={13} color={t.accentBlueRaw} />
                        <Text style={{ fontSize: 9, letterSpacing: 3, color: t.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="lock-closed" size={12} color={t.textMuted} />
                        <View style={{ backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: t.accentBlueRaw }}>PRO</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <View style={{ height: 10, backgroundColor: t.textMuted + '30', borderRadius: 4, width: '100%' }} />
                      <View style={{ height: 10, backgroundColor: t.textMuted + '30', borderRadius: 4, width: '82%' }} />
                      <View style={{ height: 10, backgroundColor: t.textMuted + '20', borderRadius: 4, width: '65%' }} />
                    </View>
                  </View>
                </View>
              ) : (coachLoading || !!coachCache) && (() => {
                if (coachLoading && !coachCache) {
                  return (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.sectionLabel, { color: t.textMuted }]}>COACH INSIGHT</Text>
                      <View style={[shadowStyle, {
                        backgroundColor: t.bgCard, borderRadius: 14, borderWidth: 0.5,
                        borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)',
                        borderLeftWidth: 3, borderLeftColor: t.accentBlueRaw, padding: 16, paddingLeft: 15,
                      }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ActivityIndicator size="small" color={t.accentBlueRaw} />
                          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textMuted, fontStyle: 'italic' }}>Analyzing your data...</Text>
                        </View>
                      </View>
                    </View>
                  );
                }
                if (!coachCache) return null;
                const body = resolveTipBody(coachCache);
                if (!body) return null;
                // Blue Coach Insight box -- mirrors the day/weekly/monthly summary treatment
                // exactly: translucent blue fill, centered header + divider, centered italic body.
                return (
                  <View style={{ marginBottom: 12 }}>
                    <View style={[shadowStyle, {
                      backgroundColor: t.accentBlueRaw + '12', borderRadius: 12, borderWidth: 1,
                      borderColor: t.accentBlueRaw + '50', padding: 14, alignItems: 'center',
                    }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                        <Ionicons name="sparkles" size={12} color={t.accentBlueRaw} />
                        <Text style={{ fontSize: 9, letterSpacing: 3, color: t.accentBlueRaw, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>Coach Insight</Text>
                      </View>
                      <View style={{ width: '100%', height: 0.5, backgroundColor: t.accentBlueRaw + '40', marginBottom: 10 }} />
                      <Text style={{ fontSize: 14, color: t.textSecondary, fontFamily: 'DMSans_600SemiBold', lineHeight: 22, fontStyle: 'italic', textAlign: 'center' }}>
                        {body}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Diagnostic card feed (claim + proof + lever) -- ranked, below the headline */}
              <View ref={findingsSectionRef} collapsable={false}>
                {cardsVoicing ? (
                  <>
                    <Text style={[styles.sectionLabel, { color: t.textMuted, marginBottom: 10 }]}>SHARPENING YOUR READ…</Text>
                    {Array.from({ length: Math.min(3, Math.max(2, (voicedCards ?? report.cards ?? []).length || 3)) }).map((_, i) => (
                      <SkeletonFeedCard key={`sk${i}`} theme={t} shadowStyle={shadowStyle} pulse={cardPulse} />
                    ))}
                  </>
                ) : (voicedCards ?? report.cards ?? []).length > 0 ? (
                  (voicedCards ?? report.cards ?? []).map((c, i) => (
                    isTutorialMode && i === 0
                      ? <View key={`${c.id}-${i}`} ref={firstCardRef} collapsable={false}><DiagnosticFeedCard card={c} theme={t} shadowStyle={shadowStyle} isMindful={isMindful} /></View>
                      : <DiagnosticFeedCard key={`${c.id}-${i}`} card={c} theme={t} shadowStyle={shadowStyle} isMindful={isMindful} />
                  ))
                ) : (
                  <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', ...shadowStyle }]}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 20 }}>
                      Nothing stands out in this window. Keep logging and patterns will surface here as they develop.
                    </Text>
                  </View>
                )}
              </View>

              {/* Smart Tips: cross-signal insight cards (gated) */}
              {(() => {
                const insightTips = (smartTips?.activeTips ?? [])
                  .filter(tip => isCrossSignalRule(tip.ruleId))
                  .slice(0, 5);
                if (!insightTips.length) return null;
                return (
                  <View ref={correlationsRef} collapsable={false}>
                    <Text style={[styles.sectionLabel, { color: t.textMuted }]}>PATTERNS IN YOUR DATA</Text>
                    {insightTips.map((tip, idx) => {
                      const isBlurred = TIPS_GATED && idx > 0;
                      return <InsightTipCard key={tip.id} tip={tip} isBlurred={isBlurred} theme={t} shadowStyle={shadowStyle} />;
                    })}
                  </View>
                );
              })()}

              {/* Disclaimer */}
              <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: t.textMuted, textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 }}>
                Based on your logged data only. For informational purposes only. Not medical advice.
              </Text>
            </>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  heroTitle: {
    fontSize: 48,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 3,
    lineHeight: 52,
  },
  card: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderTopWidth: 1.5,
    padding: 16,
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
});
