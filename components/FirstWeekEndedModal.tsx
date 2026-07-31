// components/FirstWeekEndedModal.tsx
//
// Fires ONCE, on the first launch after the 7-day taste runs out. Design + copy: SPEC_monetization.md ->
// "THE STEP-DOWN COPY".
//
// ⚠️ THIS ONE SELLS. Its sibling (a real subscription ending) does NOT -- that person paid for months, so
// that message is gratitude and asks for nothing. A taste user never paid anything, so there is nothing to
// thank them for and naming the plan is fair.
//
// ⚠️ LEAD WITH THE REASSURANCE. Ending on "nothing was deleted" means they read four bullets of things going
// away before finding out their data is safe. Flipped, the list lands as information rather than loss.
//
// The numbers here deliberately mirror the onboarding free-week block word for word. Same numbers at both
// ends of the week is what makes this read as a promise KEPT rather than new bad news -- so if you change a
// number here, change it in app/onboarding/all-set.tsx and app/support.tsx too.

import React from 'react';
import { Text } from '@/components/AppText';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@/components/AppIcons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import PrimaryCTA from './PrimaryCTA';
import GradientTitle from './GradientTitle';
import { Type } from '../typography';

const FREE_TIER = [
  'Otto answers anything, but stops building workouts and meals',
  '10 messages a day with him and with Halo',
  '5 AI Meal Estimates a month',
  'Your reports go back to the free view',
];

export default function FirstWeekEndedModal({
  theme,
  overCapNote,
  onDismiss,
}: {
  theme: any;
  // Only passed for the minority actually over a layout cap. Everyone else must not be warned about a loss
  // they are not taking -- the default meal-slot count IS the free cap, so most users never see this.
  overCapNote?: string | null;
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

  const gotIt = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); };
  const becomeSupporter = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    close(() => router.push('/support' as any));
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
                <Ionicons name="calendar" size={25} color={theme.accentBlue} />
              </View>
            </View>

            <GradientTitle
              title="Your First Week Is Up"
              color={theme.accentBlueRaw}
              style={{ fontSize: 22, letterSpacing: 0.3, fontFamily: Type.display, textAlign: 'center', marginBottom: 10 }}
            />

            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
              Everything you logged and built stays exactly where it is. Nothing was deleted.
            </Text>

            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 }}>
              Here's the free plan
            </Text>

            {FREE_TIER.map((line) => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 7 }}>
                <Ionicons name="ellipse" size={6} color={theme.accentBlue} style={{ marginTop: 6, marginLeft: 3 }} />
                <Text style={{ flex: 1, fontSize: 12, color: theme.textSecondary, fontFamily: Type.ui, lineHeight: 17 }}>{line}</Text>
              </View>
            ))}

            {!!overCapNote && (
              <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 17, marginTop: 10 }}>
                {overCapNote}
              </Text>
            )}

            <PrimaryCTA label="Become a Supporter" onPress={becomeSupporter} wrapperStyle={{ marginTop: 20 }} faceStyle={{ paddingVertical: 14, borderRadius: 10 }} />

            <TouchableOpacity onPress={gotIt} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Got It</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
