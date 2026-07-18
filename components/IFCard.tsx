import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PressableButton from './PressableButton';
import ButtonShine from './ButtonShine';
import TooltipIcon from './TooltipIcon';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { Type, numLine } from '../typography';
import GradientNumber from './GradientNumber';
import GradientTitle from './GradientTitle';

export const IF_METHODS: Record<string, { fast: number; eat: number }> = {
  '12:12': { fast: 12, eat: 12 },
  '14:10': { fast: 14, eat: 10 },
  '16:8':  { fast: 16, eat: 8  },
  '18:6':  { fast: 18, eat: 6  },
  '20:4':  { fast: 20, eat: 4  },
  'Custom':{ fast: 16, eat: 8  },
};

export const formatTime = (ms: number) => {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export const formatHrMin = (ms: number) => {
  const h = Math.floor(Math.abs(ms) / 3600000);
  const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
  return `${h}:${String(m).padStart(2,'0')} hrs`;
};

function PulseSegment({ value, style, shouldPulse, color }: { value: string; style: any; shouldPulse: boolean; color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  const prev = useRef(value);
  useEffect(() => {
    const changed = prev.current !== value;
    prev.current = value;
    if (shouldPulse && changed) {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.18, duration: 80, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1.0, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [value]);
  // Scale transform lives on this wrapper, NOT inside GradientNumber's own style -- GradientNumber
  // forwards style only to its inner masked Text, so a transform/flex/etc. meant for how it sits in
  // its parent has to be on a wrapping element (same lesson as the hold-timer flex:1 bug).
  return (
    <Animated.View style={{ transform: [{ scale: anim }] }}>
      <GradientNumber value={value} color={color} style={style} />
    </Animated.View>
  );
}

export function IFCard({ theme, ifStart, ifEnd, ifMethod, ifCustomHours, isOpen, remaining, windowEnd, ifResultLabel, ifResultColor, ifTargetMs, ifActualMs, showTimePicker, showEndTimePicker, pickerTime, setIfMethod, setIfCustomHours, setIfStart, setIfEnd, setShowTimePicker, setShowEndTimePicker, setPrickerTime, onStartFast, onLastMeal, onResetFast, onCancelFast, onResetComplete, onConfirmStart, onConfirmEnd, tutorialOverrideState, readOnly = false }: any) {
  const ifPulse = useRef(new Animated.Value(1)).current;
  const ifContentAnim = useRef(new Animated.Value(0)).current;
  const ifContentReady = useRef(false);

  const demoRef = useRef({
    start:     Date.now() - 6 * 60 * 60 * 1000,
    windowEnd: Date.now() + 2.75 * 60 * 60 * 1000,
    end:       Date.now() - 30 * 60 * 1000,
  });

  const dIsIdle    = tutorialOverrideState === 'idle';
  const dIsActive  = tutorialOverrideState === 'active';
  const dIsEating  = tutorialOverrideState === 'eating';
  const effIfStart    = dIsIdle ? null : (dIsActive || dIsEating ? demoRef.current.start : ifStart);
  const effIfEnd      = dIsIdle ? null : (dIsEating ? demoRef.current.end : dIsActive ? null : ifEnd);
  const effIsOpen     = dIsActive ? true : isOpen;
  const effWindowEnd  = dIsActive ? demoRef.current.windowEnd : windowEnd;
  const effRemaining  = dIsActive ? 2.75 * 60 * 60 * 1000 : remaining;
  const effIfTargetMs = dIsEating ? 16 * 60 * 60 * 1000 : ifTargetMs;
  const effIfActualMs = dIsEating ? 8 * 60 * 60 * 1000 : ifActualMs;
  const effResultLabel = dIsEating ? 'COMPLETE' : ifResultLabel;
  const effResultColor = dIsEating ? theme.accentGreen : ifResultColor;

  useEffect(() => {
    if (dIsActive || dIsEating) {
      ifContentAnim.setValue(1);
    }
  }, [tutorialOverrideState]);

  useEffect(() => {
    if (!effIfStart) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(ifPulse, { toValue: 1.025, duration: 1400, useNativeDriver: true }),
          Animated.timing(ifPulse, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
          Animated.delay(800),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [effIfStart]);

  useEffect(() => {
    if (effIfStart && !ifContentReady.current) {
      ifContentReady.current = true;
      ifContentAnim.setValue(0);
      Animated.timing(ifContentAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    if (!effIfStart) {
      ifContentReady.current = false;
      ifContentAnim.setValue(0);
    }
  }, [effIfStart]);

  useEffect(() => {
    if (effIfEnd) {
      ifContentAnim.setValue(0);
      Animated.timing(ifContentAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [effIfEnd]);

  const contentOpacity  = ifContentAnim;
  const contentTranslate = ifContentAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const ifCardRef   = useTutorialTarget('if_card_main');
  const ifActiveRef = useTutorialTarget('if_card_active');
  const ifEatingRef = useTutorialTarget('if_card_eating');

  const IFPill = ({ label, color }: { label: string; color: string }) => (
    <View style={{ alignSelf: 'flex-start', backgroundColor: color + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, fontFamily: Type.uiBold, letterSpacing: 2, color }}>{label}</Text>
    </View>
  );

  const IFLinkBtn = ({ label, color, onPress, hapticLevel = 'light' }: { label: string; color: string; onPress: () => void; hapticLevel?: 'light' | 'heavy' }) => (
    <TouchableOpacity
      onPress={() => { triggerHaptic(hapticLevel === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={{ backgroundColor: color + '18', borderWidth: 1, borderColor: color + '40', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ fontSize: 11, fontFamily: Type.uiSemibold, color, letterSpacing: 0.5 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    // Shadow on the WRAPPER, clipping on the card. A view on iOS can either clip its children to its
    // rounded corners or cast a shadow, never both -- and this card must clip, because the watermark
    // glyph deliberately hangs off its bottom-right corner.
    <View style={[s.cardShadow, { shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity }]}>
    <View ref={ifCardRef} collapsable={false} style={[s.card, { backgroundColor: theme.bgCardGlass, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, overflow: 'hidden' }]}>
      <Ionicons name="timer" size={130} color={theme.accentBlueRaw} style={{ position: 'absolute', right: -24, bottom: -28, opacity: 0.10 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="timer-outline" size={11} color={theme.textMuted} />
          <Text style={[s.cardLabel, { marginBottom: 0, color: theme.textMuted }]}>Intermittent Fast · {ifMethod}</Text>
          <TooltipIcon tooltipKey="if_countdown" />
        </View>
        {effIfStart && (
          <IFPill
            label={effIfEnd ? effResultLabel : effIsOpen ? 'OPEN' : 'CLOSED'}
            color={effIfEnd ? effResultColor : effIsOpen ? theme.accentGreen : theme.accentRed}
          />
        )}
      </View>

      {!readOnly && (
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
          {Object.keys(IF_METHODS).map(m => (
            <TouchableOpacity key={m} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setIfMethod(m); }}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: ifMethod === m ? theme.bgSelected : theme.bgInput, borderWidth: 1, borderColor: ifMethod === m ? theme.accentBlueBorder : theme.borderInput }}>
              {ifMethod === m && <ButtonShine radius={6} />}
              <Text style={{ fontSize: 11, fontFamily: Type.uiSemibold, color: ifMethod === m ? theme.accentBlue : theme.textMuted }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!readOnly && ifMethod === 'Custom' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>Eating window:</Text>
          <TextInput
            style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 6, fontSize: 14, fontFamily: Type.uiSemibold, width: 50, textAlign: 'center' }}
            value={ifCustomHours} onChangeText={setIfCustomHours} keyboardType="number-pad" maxLength={2} />
          <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>hrs</Text>
        </View>
      )}

      {!readOnly && !effIfStart && (
        <Animated.View style={{ transform: [{ scale: ifPulse }] }}>
          {/* Was every bug at once: a GREEN tint (green is success/goal-hit -- this is an action you take,
              not an outcome), Type.num (the condensed TABULAR number face) on a SENTENCE with no number in
              it, ALL CAPS at letterSpacing 2, and no shine. Now the house tinted recipe: accent, Interface,
              sentence case, glossed. */}
          <PressableButton
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center' }}
            onPress={onStartFast}
            flex={0}
          >
            <ButtonShine radius={8} />
            <Text style={{ fontFamily: Type.uiSemibold, fontSize: 13, color: theme.accentBlue }}>Tap when you eat your first meal</Text>
          </PressableButton>
        </Animated.View>
      )}

      {effIfStart && !effIfEnd && (
        <View ref={ifActiveRef} collapsable={false}>
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.ifLabel, { marginBottom: 4, color: theme.textMuted }]}>{effIsOpen ? 'Window closes in' : 'Window closed'}</Text>
              {effRemaining ? (() => {
                const [hh, mm, ss] = formatTime(effRemaining).split(':');
                const shouldPulse = effRemaining <= 30 * 60 * 1000;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <PulseSegment value={hh} style={s.ifCountdown} color={theme.accentBlueRaw} shouldPulse={shouldPulse} />
                    <GradientNumber value=":" color={theme.accentBlueRaw} style={s.ifCountdown} />
                    <PulseSegment value={mm} style={s.ifCountdown} color={theme.accentBlueRaw} shouldPulse={shouldPulse} />
                    <GradientNumber value=":" color={theme.accentBlueRaw} style={s.ifCountdown} />
                    <PulseSegment value={ss} style={s.ifCountdown} color={theme.accentBlueRaw} shouldPulse={shouldPulse} />
                  </View>
                );
              })() : (
                <GradientNumber value="CLOSED" color={theme.accentBlueRaw} style={s.ifCountdown} />
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 2 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.ifLabel, { color: theme.textMuted, marginBottom: 2 }]}>Started</Text>
                <GradientNumber
                  value={new Date(effIfStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  color={theme.accentBlueRaw}
                  style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1 }}
                />
              </View>
              {effWindowEnd && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[s.ifLabel, { color: theme.textMuted, marginBottom: 2 }]}>Closes</Text>
                  <GradientNumber
                    value={new Date(effWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    color={theme.accentBlueRaw}
                    style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1 }}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: theme.borderCardTop, marginBottom: 12 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <IFLinkBtn label="Edit Start" color={theme.textSecondary} onPress={() => setShowTimePicker(true)} />
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); onLastMeal(); }}
              style={{ backgroundColor: theme.accentRed, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: Type.uiBold, letterSpacing: 2 }}>LAST MEAL</Text>
            </TouchableOpacity>
            <IFLinkBtn label="Cancel fast" color={theme.textSecondary} onPress={onCancelFast} />
          </View>

          {showTimePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowTimePicker(false); }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.uiMedium }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowTimePicker(false); if (pickerTime) onConfirmStart(pickerTime); }}>
                  <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: Type.uiSemibold }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker mode="time" value={pickerTime || (effIfStart ? new Date(effIfStart) : new Date())} display="spinner" textColor={theme.textPrimary} onChange={(_, d) => { if (d) setPrickerTime(d); }} />
            </View>
          )}
        </Animated.View>
        </View>
      )}

      {effIfStart && effIfEnd && (
        <View ref={ifEatingRef} collapsable={false}>
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }}>
          <View style={{ borderTopWidth: 1, borderTopColor: theme.borderCardTop, paddingTop: 12, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
              <View>
                <Text style={[s.ifLabel, { color: theme.textMuted, marginBottom: 2 }]}>Target</Text>
                <GradientNumber value={formatHrMin(effIfTargetMs)} color={theme.accentBlueRaw} style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1 }} />
              </View>
              <View>
                <Text style={[s.ifLabel, { color: theme.textMuted, marginBottom: 2 }]}>Actual</Text>
                <GradientNumber value={effIfActualMs ? formatHrMin(effIfActualMs) : '--'} color={theme.accentBlueRaw} style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1 }} />
              </View>
              {/* flex:1 + adjustsFontSizeToFit: Target/Actual are short and fixed-width ("4:00 hrs"), but
                  Window ("6:55 PM -> 6:55 PM") is long and its length varies with locale/12-24hr format.
                  Rather than guess a font size that happens to fit, this takes whatever space is left in
                  the row and shrinks the text down to whatever fits it -- guaranteed no overflow, one row,
                  same as Target/Actual, no wrap (so no banding). GradientTitle (not GradientNumber) because
                  it's the one that supports numberOfLines/adjustsFontSizeToFit. */}
              <View style={{ flex: 1 }}>
                <Text style={[s.ifLabel, { color: theme.textMuted, marginBottom: 2 }]}>Window</Text>
                <GradientTitle
                  title={`${new Date(effIfStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → ${new Date(effIfEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  color={theme.textSecondary}
                  style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                />
              </View>
            </View>

            {!readOnly && (
              <>
                <View style={{ borderTopWidth: 1, borderTopColor: theme.borderCardTop, marginBottom: 12 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <IFLinkBtn label="Edit start" color={theme.textSecondary} onPress={() => setShowTimePicker(true)} />
                  <IFLinkBtn label="Edit end" color={theme.textSecondary} onPress={() => setShowEndTimePicker(true)} />
                  <IFLinkBtn label="Reset" color={theme.accentRed} onPress={onResetComplete} hapticLevel="heavy" />
                </View>
              </>
            )}
          </View>

          {showTimePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowTimePicker(false); }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.uiMedium }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowTimePicker(false); if (pickerTime) onConfirmStart(pickerTime); }}>
                  <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: Type.uiSemibold }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker mode="time" value={pickerTime || (effIfStart ? new Date(effIfStart) : new Date())} display="spinner" textColor={theme.textPrimary} onChange={(_, d) => { if (d) setPrickerTime(d); }} />
            </View>
          )}
          {showEndTimePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowEndTimePicker(false); }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.uiMedium }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowEndTimePicker(false); if (pickerTime) onConfirmEnd(pickerTime); }}>
                  <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: Type.uiSemibold }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker mode="time" value={pickerTime || (effIfEnd ? new Date(effIfEnd) : new Date())} display="spinner" textColor={theme.textPrimary} onChange={(_, d) => { if (d) setPrickerTime(d); }} />
            </View>
          )}
        </Animated.View>
        </View>
      )}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  // The shadow lives here (a view that clips cannot also cast one); the card itself keeps the clipping.
  cardShadow: {
    marginBottom: 12, borderRadius: 14,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  card: {
    borderWidth: 0.5, borderRadius: 14, padding: 16,
    borderTopWidth: 1.5,
  },
  cardLabel: { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 10 },
  ifLabel:    { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontFamily: Type.uiMedium },
  ifCountdown:{ fontSize: 48, lineHeight: numLine(48), fontFamily: Type.num, letterSpacing: 2 },
});
