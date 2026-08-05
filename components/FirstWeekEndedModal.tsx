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

// ⚠️ THE OTTO LINE WAS WRONG AND OVERSOLD FREE. It read "Otto answers anything, but stops building workouts
// and meals". "Answers anything" stopped being true the day item B's data gate shipped -- on free he is no
// longer sent the user's snapshot, PRs, workout history, food log, sleep or body measurements, so he cannot
// answer about their own numbers at all, and he caps at two exercises a reply. Justin: "he gets dumber, he
// stops using numbers and stuff, he doesnt just not build workouts and meals."
// ⚠️ "WORKS FROM YOUR NUMBERS" IS DELIBERATE, over "can't see your data" (Justin's call): it mirrors the
// Supporter page's "works from everything you've logged", so the two read as the same sentence from opposite
// sides, and it sounds like a capability switched off rather than something lobotomised.
// ⚠️ THE LAST BULLET IS THE ONLY ONE THAT MENTIONS THE EIGHT CREATION CAPS, and it names NO numbers and
// lists nothing, deliberately. Eight numbers is a wall of text at the moment somebody is least receptive,
// and any single number is a LIE for the person sitting over it -- a taste user holding 30 custom foods
// keeps all 30. Naming three or four was tried and rejected repeatedly: there are six content caps, so a
// short list is wrong by omission every time. The reassurance is already two lines above.
const FREE_TIER = [
  'Otto answers general questions, but no longer works from your numbers or builds for you',
  // ⚠️ SPLIT 2026-08-05 (PLAN.md 3.1). Otto dropped to 5/day; Halo deliberately stays at 10, so free users
  // get MORE of the faith companion than the fitness one. One line covering both was only ever right while
  // the two numbers matched, and they are not going to match again.
  '5 messages a day with him, 10 with Halo',
  '5 AI Meal Estimates a month',
  'Your reports go back to the free view',
  'Room to keep building, within free limits',
];

export default function FirstWeekEndedModal({
  theme,
  overCapNote,
  kind = 'firstWeek',
  onDismiss,
}: {
  theme: any;
  // Only passed for the minority actually over a layout cap. Everyone else must not be warned about a loss
  // they are not taking -- the default meal-slot count IS the free cap, so most users never see this.
  overCapNote?: string | null;
  // ⚠️ 'cancelled' is a real subscription ending, not the free week. Same card, same calendar icon, same
  // bullets -- what changes is the TITLE and whether it sells. A taste user never paid anything, so naming
  // the plan is fair. Somebody who paid for months and just chose to leave gets gratitude and is asked for
  // nothing; Support the Mission has a permanent home on the Profile tab, so the way back is two taps.
  kind?: 'firstWeek' | 'cancelled';
  onDismiss: () => void;
}) {
  const cancelled = kind === 'cancelled';
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

            {/* ⚠️ SAME CALENDAR ICON FOR BOTH. A subscription ending happened on a date exactly like a week
                running out. A checkmark was proposed and rejected: it reads as "transaction complete", which
                is a receipt and colder than this screen should be. NEVER the gold Supporter sprout -- that is
                the mark of BEING one, and this is the screen where they stop. */}
            {/* ⚠️ ONE LINE, SHRINK TO FIT -- NOT DECORATION, IT PREVENTS A REAL BUG. GradientTitle MOULDS the
                text (light at the top of the block, base in the middle, dark at the bottom). On one line that
                reads as shine; on TWO lines the first gets the light half and the second gets the dark half,
                so a wrapped title comes out visibly two-tone. This modal never needed it while the only title
                was "Your First Week Is Up", which always fits -- "Your Supporter Plan Has Ended" wraps, and
                Justin caught the dark second line immediately. Same fix CapWallModal already carries.
                Cost, accepted: the longer title renders slightly smaller. You never see both at once. */}
            <GradientTitle
              title={cancelled ? 'Your Supporter Plan Has Ended' : 'Your First Week Is Up'}
              color={theme.accentBlueRaw}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
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

            {/* ⚠️ HAIRLINE, because this sentence is the only PERSONAL line on the card -- it is about this
                user's own layout, not the free plan everyone gets. Sitting directly under the bullets with
                identical spacing it read as a fifth bullet, which is exactly the one line that should not
                blend in. */}
            {!!overCapNote && (
              <>
                <View style={{ height: 0.5, backgroundColor: theme.borderCard, marginTop: 14 }} />
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 17, marginTop: 12 }}>
                  {overCapNote}
                </Text>
              </>
            )}

            {/* ⚠️ THE CANCELLED VERSION DOES NOT SELL. They paid for months and then chose to leave; asking
                for money on the same screen is tone-deaf. "Got It" becomes the only button and is promoted to
                the primary. The free-week version keeps the pitch, because that user never paid anything. */}
            {cancelled ? (
              <PrimaryCTA label="Got It" onPress={gotIt} wrapperStyle={{ marginTop: 20 }} faceStyle={{ paddingVertical: 14, borderRadius: 10 }} />
            ) : (
              <>
                <PrimaryCTA label="Become a Supporter" onPress={becomeSupporter} wrapperStyle={{ marginTop: 20 }} faceStyle={{ paddingVertical: 14, borderRadius: 10 }} />

                <TouchableOpacity onPress={gotIt} activeOpacity={0.7} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Got It</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
}
