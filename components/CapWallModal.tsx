// components/CapWallModal.tsx
//
// The wall a FREE user meets when they reach one of the eight non-AI caps. Design + every word of copy is
// in SPEC_monetization.md -> "WHAT THE USER SEES AT A CAP" and "THE COPY". Do not reword anything here
// without changing the spec too; each line was argued for and several rejected drafts are recorded there.
//
// ⚠️ EVERY TAP OPENS THIS, not just the first (decided 2026-08-01). There is no toast version and no
// seen-once state. Nagging is UNPROMPTED; this is only ever reached by tapping a button that is visibly dim
// with a padlock on it, so a second tap is somebody saying "I still want this".
//
// ⚠️ TWO VERSIONS, ONE CHECK: are you AT the cap or OVER it. Over can only happen to an ex-Supporter, so
// that single condition covers both the wording AND whether the delete offer appears. "Delete one to make
// room" is TRUE at the cap and a LIE over it -- somebody at 57 of 20 deletes one, lands on 56, is still
// blocked, and loops deleting their own food wondering why nothing changed.
//
// Visually a sibling of FirstWeekEndedModal: same centred card, same spring, same button pair. They are the
// same species of message and should read as one.
import { Text } from '@/components/AppText';
import { Ionicons } from '@/components/AppIcons';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import PrimaryCTA from './PrimaryCTA';
import GradientTitle from './GradientTitle';
import { GOLD_BASE } from './SupporterFoil';
import { Type } from '../typography';
import type { CapKey } from '../utils/caps';

type Copy = { title: string; body1: string; body2: string };

/**
 * ⚠️ APPROVED COPY. `{cap}` is the user's limit and `{count}` is what they actually have -- both are
 * substituted live, so the over-cap title reads their real number back to them. That is deliberate: the
 * first thought of somebody who just lost a membership is "what did I lose", and their own number in the
 * headline answers it before they finish reading.
 * ⚠️ The copy is never a bare counter. "You have used 20 of 20" is a lie for a lapsed Supporter sitting on
 * 57 grandfathered foods.
 */
const COPY: Record<CapKey, { at: Copy; over: Copy }> = {
  // ⚠️ SHAPE CHANGED 2026-08-01 AFTER SEEING IT ON DEVICE. The first draft led with reassurance
  // ("All 57 Of Your Foods Are Still Here") as the TITLE. That shape belongs to the step-down notice, which
  // arrives UNPROMPTED and where the first fear really is "what did I lose". This modal is different: the
  // user just TAPPED Create Food, so their question is "why did nothing happen", and the title has to answer
  // THAT. The reassurance still lands, one line lower. It also wrapped badly, orphaning "Here".
  // ⚠️ Title says "Custom Foods", body says "My Foods" -- deliberate (Justin, 2026-08-01). The title names
  // the CONCEPT ("My Foods Is Full" reads oddly mid-sentence); the body points at the actual tab.
  // ⚠️ THE OTHER SEVEN CAPS BELOW ARE STILL IN THE OLD SHAPE and need the same reordering when each is wired.
  foods: {
    at: {
      title: 'Custom Foods Is Full',
      body1: 'The free plan holds {cap} foods of your own, and every one is still yours to log, edit and keep.',
      body2: "Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.",
    },
    over: {
      title: 'Custom Foods Is Full',
      body1: 'All {count} of your foods are still here. Nothing has gone anywhere, and every one is yours to log, edit and keep.',
      body2: "Free accounts hold {cap}, so there's no room to add another right now. The Supporter plan opens My Foods back up.",
    },
  },
  savedMeals: {
    at: {
      title: 'Your Meal Catalog Is Full',
      body1: 'The free plan holds {cap} saved meals, and every one is still yours to log and keep.',
      body2: "Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.",
    },
    over: {
      title: 'Your Meal Catalog Is Full',
      body1: 'All {count} of your saved meals are still here. Nothing has gone anywhere, and every one is yours to log and keep.',
      body2: "Free accounts hold {cap}, so there's no room to save another right now. The Supporter plan lets you keep saving.",
    },
  },
  // ⚠️ RECIPES BREAK THE "<Thing> Is Full" TITLE PATTERN ON PURPOSE. Recipes have NO container name anywhere
  // in the app, so "Recipes Is Full" is broken English and "Your Recipes Are Full" says the recipes
  // themselves are full. This title answers the same question -- why the button did nothing. Inventing a
  // noun the app has never shown the user was the alternative and is worse.
  recipes: {
    at: {
      title: 'No Room For Another Recipe',
      body1: "The free plan holds {cap} recipes of your own, and every one you've built is still yours to log, edit and keep.",
      body2: "Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.",
    },
    over: {
      title: 'No Room For Another Recipe',
      body1: 'All {count} of your recipes are still here. Nothing has gone anywhere, and every one is yours to log, edit and keep.',
      body2: 'Free accounts hold {cap}. The Supporter plan lets you keep building.',
    },
  },
  routines: {
    at: {
      title: "You've Built {cap} Routines",
      body1: "The free plan holds {cap} routines of your own. Presets don't count toward that, and every routine under My Routines is still yours to load, edit and keep.",
      body2: "Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.",
    },
    over: {
      title: 'All {count} Of Your Routines Are Still Here',
      body1: 'Nothing you built has gone anywhere. Every routine under My Routines is yours to load, edit and keep.',
      body2: "Free accounts hold {cap}, so there's no room to build another right now. The Supporter plan opens My Routines back up.",
    },
  },
  programs: {
    at: {
      title: "You've Built {cap} Programs",
      body1: "The free plan holds {cap} programs of your own. Built-in programs don't count toward that, and every one you've built is still yours to load, edit and keep.",
      body2: "Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.",
    },
    over: {
      title: 'All {count} Of Your Programs Are Still Here',
      body1: 'Nothing you built has gone anywhere. Every program is yours to load, edit and keep.',
      body2: "Free accounts hold {cap} of your own, so there's no room to build another right now. The Supporter plan lets you keep building.",
    },
  },
  exercises: {
    at: {
      title: "You've Added {cap} Exercises",
      body1: "The free plan holds {cap} exercises of your own. Built-in exercises don't count toward that, and every one you've added is still yours to use, edit and keep.",
      body2: "Make room by deleting one you've stopped using, or the Supporter plan removes the limit entirely.",
    },
    over: {
      title: 'All {count} Of Your Exercises Are Still Here',
      body1: 'Nothing you added has gone anywhere. Every exercise is yours to use, edit and keep.',
      body2: "Free accounts hold {cap} of your own, so there's no room to add another right now. The Supporter plan opens your Exercise Library back up.",
    },
  },
  mealSlots: {
    // ⚠️ MEAL SLOTS ARE THE ONE CAP WHERE THE SUPPORTER PLAN IS NOT UNLIMITED. It promises 8, never "removes
    // the limit".
    at: {
      title: "That's All {cap} Meal Slots",
      body1: 'The free plan holds {cap}, which is the four your log starts with plus one of your own. Every slot is still yours to rename and use however you like.',
      body2: 'Make room by deleting one, or the Supporter plan takes you to 8.',
    },
    over: {
      title: 'Your Extra Meal Slots Are Waiting',
      body1: 'Nothing you set up has gone anywhere. Your extra slots are saved, and everything you logged to them is still on your log.',
      body2: 'Free accounts hold {cap}, so your log is back to the free layout for now. The Supporter plan brings your extra slots back.',
    },
  },
  statsGraphs: {
    // ⚠️ At a cap of ONE of your own, "delete one you've stopped using" reads strangely, so this says SWAP.
    at: {
      title: "You've Built Your Graph",
      body1: 'The free plan holds one graph of your own on top of the seven your Stats tab comes with. Every graph is still yours to use and keep.',
      body2: 'Swap yours for a different one any time, or the Supporter plan lets you build as many as you like.',
    },
    over: {
      title: 'Your Extra Graphs Are Waiting',
      body1: 'Nothing you built has gone anywhere. Your extra graphs are saved exactly as you set them up.',
      body2: 'Free accounts show one of your own, so your Stats tab is back to the free layout for now. The Supporter plan brings the rest back.',
    },
  },
};

const fill = (s: string, cap: number, count: number) =>
  s.replace(/\{cap\}/g, String(cap)).replace(/\{count\}/g, String(count));

export default function CapWallModal({
  capKey,
  cap,
  count,
  theme,
  onDismiss,
}: {
  capKey: CapKey;
  cap: number;
  count: number;
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

  const copy = count > cap ? COPY[capKey].over : COPY[capKey].at;

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
            {/* The same FLAT GOLD lock as the locked Reports and Comparison screens, never foil. Foil means
                "you have this"; a lock means "you could have this", and foil turns to mush at icon sizes. */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              {/* ⚠️ GOLD RING, NOT A GOLD FILL (Justin, 2026-08-02). The sibling step-down modal tints its
                  circle to match its icon, and ours had a gold lock sitting in a plain grey disc that all but
                  vanished on Light. A gold WASH was the first idea and is wrong: flat gold on a white card
                  reads as mustard, which the Supporter foil work already warns about. The ring ties the
                  circle to the lock without introducing a gold surface. */}
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.bgInset, borderWidth: 1, borderColor: GOLD_BASE, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={22} color={GOLD_BASE} />
              </View>
            </View>

            <GradientTitle
              title={fill(copy.title, cap, count)}
              color={theme.textSecondary}
              style={{ fontSize: 21, letterSpacing: 0.3, fontFamily: Type.display, textAlign: 'center', marginBottom: 10 }}
            />

            <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20 }}>
              {fill(copy.body1, cap, count)}
            </Text>

            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center', lineHeight: 20, marginTop: 12 }}>
              {fill(copy.body2, cap, count)}
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
