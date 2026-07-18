// components/TargetsDisclaimerModal.tsx
// First-use gate for the onboarding Your Style screen, which is where a user meets THREE things the
// Disclaimer Standard names by name at once: a daily calorie target, a BMR/TDEE calculation, and a weight
// loss projection. Shown on mount rather than when the number appears -- the target renders the instant a
// weight is typed, so gating on that would throw a modal over a live keyboard.
// Same centered-card pattern as DayScoreDisclaimerModal (accent top border, scale-in, no bottom sheet).
// theme is passed in: onboarding reads the STATIC base theme, it has no provider above it.

import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import PrimaryCTA from './PrimaryCTA';
import GradientTitle from './GradientTitle';
import { Type } from '../typography';

// accent is passed in because Your Style recolours live with the chosen coaching mode -- a hardcoded blue
// modal on an orange Discipline page would be the only thing on screen not following the choice.
export default function TargetsDisclaimerModal({ theme, accent, onAcknowledge }: { theme: any; accent: string; onAcknowledge: () => void }) {
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

  const accept = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    overlay.value = withTiming(0, { duration: 140 });
    cardScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(onAcknowledge)();
    });
  };

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
            borderTopColor: accent,
            padding: 24,
            shadowColor: theme.cardShadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${accent}18`, borderWidth: 1, borderColor: `${accent}35`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calculator" size={26} color={accent} />
              </View>
            </View>

            <GradientTitle title="About Your Targets" color={accent} style={{ fontSize: 22, letterSpacing: 0.3, fontFamily: Type.display, textAlign: 'center', marginBottom: 10 }} />

            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
              The calorie target and projection on this screen are estimates, worked out from the stats you enter using a standard formula. Real bodies vary, and yours will tell you more than any equation can. Treat these as a starting point to adjust from, never a rule to obey.
            </Text>

            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginTop: 12 }}>
              For informational purposes only. Not medical advice. Talk to a doctor before starting any nutrition or exercise plan.
            </Text>

            {/* fill is REQUIRED here. Without it PrimaryCTA paints the user's live accent, and onboarding
                runs on the static base theme -- so the button came out cyan on an all-blue flow. */}
            <PrimaryCTA label="I Understand" fill={accent} onPress={accept} wrapperStyle={{ marginTop: 20 }} faceStyle={{ paddingVertical: 14, borderRadius: 10 }} />
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
