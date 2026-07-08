// components/CalorieFloorModal.tsx
// Low-target safeguard modal (SPEC_calorie_floor.md). Fires when a chosen pace lands the
// recommended target in the MODAL zone. Option B "warn + consent": we never block -- the
// user can always continue. Copy branches on which fix is REAL for them (the 4 cases), and
// only ever offers a button that actually helps. ED-aware: never references body size.
// Same centered-card pattern as DayScoreDisclaimerModal (mandatory choice, no tap-to-dismiss).

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';

export type FloorModalCase = 1 | 2 | 3 | 4;

interface Props {
  theme: any;
  modalCase: FloorModalCase;
  target: number;                 // the recommended target that tripped the modal
  onSlowerPace: () => void;       // cases 1 & 2
  onAdjustActivity: () => void;   // cases 1 & 3
  onSetMaintenance: () => void;   // case 4
  onContinue: () => void;         // all cases (acknowledge + keep target)
}

// Copy per case (LOCKED, ED-aware). Target is interpolated. See SPEC_calorie_floor.md.
function copyFor(modalCase: FloorModalCase, target: number): { title: string; body: string } {
  switch (modalCase) {
    case 1: return {
      title: "Let's give you more to work with",
      body: `At this pace your target lands at ${target} calories. That's low enough it gets genuinely hard to hit your protein, vitamins, and minerals, and your body has less to recover with. Two easy fixes: ease the pace, or add a little daily movement so you earn more food. Either one feeds you better while you still lose.`,
    };
    case 2: return {
      title: 'Ease off the throttle',
      body: `You're already active, so it comes down to the pace. At ${target} calories it's tough for your body to get the nutrients it needs and bounce back from your training. Easing the pace gives you more food, better recovery, and more muscle protection, and you'll still lose.`,
    };
    case 3: return {
      title: 'Move more, eat more',
      body: `You're already going gently, so the pace is fine. Your target is ${target} because you're not very active day to day, which keeps your daily burn low, and eating this little makes it harder to get the nutrients you need and recover. A bit of regular activity raises how much you can eat, and it's good for you on its own.`,
    };
    case 4: return {
      title: "There's not much room to cut here",
      body: `You've set a gentle pace and you're already active, so you're doing the right things. Going lower than this would make it harder to get proper nutrients and recover, and it wouldn't really speed things up anyway. The healthiest move is patience: keep protein high and let the weight come off slowly, or eat at maintenance for a while. Both work. Forcing it lower doesn't.`,
    };
  }
}

export default function CalorieFloorModal({ theme, modalCase, target, onSlowerPace, onAdjustActivity, onSetMaintenance, onContinue }: Props) {
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

  const { title, body } = copyFor(modalCase, target);
  const amber = theme.statusWarn;

  // Primary "fix" button(s) per case (accent-filled). "I understand, continue" is the muted
  // secondary below, so the safe choice reads as primary.
  const PrimaryBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      style={{ marginTop: 10, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
      <Text style={{ color: theme.accentBlue, fontSize: 13, letterSpacing: 0.5, fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent hardwareAccelerated onShow={animateIn}>
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, overlayStyle]} pointerEvents="none" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }} pointerEvents="box-none">
        <Reanimated.View pointerEvents="auto" style={[{ width: '100%', maxWidth: 400 }, cardStyle]}>
          <View style={{
            backgroundColor: theme.bgSheet,
            borderRadius: 18,
            borderWidth: 0.5,
            borderTopWidth: 1.5,
            borderColor: theme.borderCard,
            borderTopColor: amber,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: amber + '22', borderWidth: 1, borderColor: amber + '55', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="nutrition" size={26} color={amber} />
              </View>
            </View>

            <Text style={{ fontSize: 20, letterSpacing: 0.5, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, textAlign: 'center', marginBottom: 10 }}>{title}</Text>

            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
              {body}
            </Text>

            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', lineHeight: 16, marginTop: 12 }}>
              For informational purposes only. Not medical advice.
            </Text>

            {/* Fix buttons per case */}
            {(modalCase === 1 || modalCase === 2) && <PrimaryBtn label="Choose a slower pace" onPress={onSlowerPace} />}
            {(modalCase === 1 || modalCase === 3) && <PrimaryBtn label="Adjust activity level" onPress={onAdjustActivity} />}
            {modalCase === 4 && <PrimaryBtn label="Set to maintenance" onPress={onSetMaintenance} />}

            {/* Continue anyway (muted secondary) */}
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onContinue(); }}
              style={{ marginTop: 8, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: theme.bgInset, borderWidth: 0.5, borderColor: theme.borderCard }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, letterSpacing: 0.5, fontFamily: 'DMSans_600SemiBold' }}>I understand, continue</Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
