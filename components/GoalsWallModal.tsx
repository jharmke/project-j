// components/GoalsWallModal.tsx
//
// The wall a FREE user meets when they try to AUTHOR a custom macro split or custom nutrition targets.
// Design + every word of copy is in SPEC_monetization.md -> "CUSTOM MACRO + NUTRITION GOALS" and
// "THE TWO GOALS WALLS". Do not reword anything here without changing the spec too.
//
// ⚠️ WHY THIS IS NOT CapWallModal. The spec is explicit that these two are NOT the same shape as the eight
// caps: there is no number, so no at-cap/over-cap split, no count in the title and no delete-to-make-room
// offer. Trying to express "you have 20 of 20" copy for something you either can or cannot do produced
// nonsense. The card, spring, lock and button pair are deliberately identical -- only the copy model differs.
//
// ⚠️ BOTH LEAD WITH WHAT STAYS FREE, unlike the cap walls. At a cap the user has LOST access to something
// they had, so that copy reassures first. Here they have lost nothing, they are just at a door, and the fair
// thing is to make clear the free path is genuinely usable rather than a crippled trial.
//
// ⚠️ SHORT TITLES ARE DELIBERATE. The longer version ("Macro Splits Are Part Of The Supporter Plan") made the
// last line a restatement of the title -- three lines carrying two ideas. Short, each line does its own job:
// the title names what you tapped, the second says what stays free, the third says what it takes. A title
// that explains itself also sounds like it is bracing for an argument.
//
// ⚠️ NO REFERENCE TO THE FREE CALORIE GOAL. An earlier draft mentioned it and Justin cut it: somebody tapping
// into a macro field wants a macro split, and telling them calories are free answers a question they did not
// ask and reads like the app defending itself.
//
// ⚠️ NEITHER MENTIONS GRANDFATHERING, because a grandfathered user never sees this. They keep their Custom
// card and their own values; they only arrive here if they try to CHANGE them.
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/AppText';
import { Ionicons } from '@/components/AppIcons';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import PrimaryCTA from './PrimaryCTA';
import GradientTitle from './GradientTitle';
import { GOLD_BASE } from './SupporterFoil';
import { Type } from '../typography';

export type GoalsWallKind = 'macros' | 'nutrition';

const COPY: Record<GoalsWallKind, { title: string; body1: string; body2: string }> = {
  macros: {
    title: 'Custom Macro Splits',
    body1: 'The four presets stay yours for free.',
    body2: 'Building your own protein, carb and fat split comes with the Supporter plan.',
  },
  nutrition: {
    title: 'Custom Nutrition Targets',
    body1: 'All five presets stay yours for free.',
    body2: 'Setting your own targets for fiber, sodium, vitamins and the rest comes with the Supporter plan.',
  },
};

export default function GoalsWallModal({
  kind,
  theme,
  onDismiss,
}: {
  kind: GoalsWallKind;
  theme: any;
  onDismiss: () => void;
}) {
  const overlay = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  const animateIn = () => {
    overlay.value = 0;
    cardScale.value = 0.92;
    overlay.value = withTiming(1, { duration: 180 });
    cardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const close = (then?: () => void) => {
    overlay.value = withTiming(0, { duration: 140 });
    cardScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)();
        if (then) runOnJS(then)();
      }
    });
  };

  const notNow = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); };
  const support = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    close(() => router.push('/support' as any));
  };

  const copy = COPY[kind];

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent hardwareAccelerated onShow={animateIn}>
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, overlayStyle]} pointerEvents="none" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }} pointerEvents="box-none">
        <Reanimated.View pointerEvents="auto" style={[{ width: '100%', maxWidth: 380 }, cardStyle]}>
          <View style={{
            backgroundColor: theme.bgSheet,
            borderRadius: 18,
            borderWidth: 0.5,
            borderTopWidth: 1.5,
            borderColor: theme.borderCard,
            borderTopColor: GOLD_BASE,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            {/* Flat gold lock in a gold RING, matching CapWallModal exactly -- never foil, and never a gold
                fill, which reads as mustard on a white card. */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: GOLD_BASE, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={22} color={GOLD_BASE} />
              </View>
            </View>

            {/* One line, shrink to fit -- GradientTitle moulds the text, so a wrapped title comes out
                visibly two-tone. Same reason as CapWallModal. */}
            <GradientTitle
              title={copy.title}
              color={theme.textSecondary}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{ fontSize: 21, letterSpacing: 0.3, fontFamily: Type.display, textAlign: 'center', marginBottom: 10 }}
            />

            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
              {copy.body1}
            </Text>

            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20, marginTop: 12 }}>
              {copy.body2}
            </Text>

            <PrimaryCTA label="Support the Mission" onPress={support} wrapperStyle={{ marginTop: 20 }} faceStyle={{ paddingVertical: 14, borderRadius: 10 }} />

            <TouchableOpacity onPress={notNow} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
