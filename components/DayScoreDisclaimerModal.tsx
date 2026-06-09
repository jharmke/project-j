// components/DayScoreDisclaimerModal.tsx
// One-time first-use gate shown before the very first Day Summary pop-up. Health
// scores require a first-use disclaimer (Build Standards: Disclaimer Standard).
// Acknowledging sets pj_dayscore_disclaimer_seen and reveals the summary. Same
// centered-card pattern as the summary modal (accent top border, scale-in).

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';

export default function DayScoreDisclaimerModal({ theme, onAcknowledge }: { theme: any; onAcknowledge: () => void }) {
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
            borderTopColor: theme.accentBlueRaw,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pulse" size={26} color={theme.accentBlue} />
              </View>
            </View>

            <Text style={{ fontSize: 22, letterSpacing: 1, fontFamily: 'BebasNeue_400Regular', color: theme.textPrimary, textAlign: 'center', marginBottom: 10 }}>YOUR DAY SCORE</Text>

            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
              Each morning you'll see a score out of 100 for the day before, built from the nutrition, activity, and recovery data you logged. It's a snapshot to help you spot patterns and reflect.
            </Text>

            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginTop: 12 }}>
              For informational purposes only. It is not medical advice, and it is not a measure of your health or your worth.
            </Text>

            <TouchableOpacity onPress={accept} style={{ marginTop: 20, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlue }}>
              <Text style={{ color: '#ffffff', fontSize: 14, letterSpacing: 1, fontFamily: 'DMSans_600SemiBold' }}>I UNDERSTAND</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
