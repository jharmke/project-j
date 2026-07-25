import { useEffect, useRef } from 'react';
import { Animated, Easing, Keyboard, Platform, ViewStyle, StyleProp } from 'react-native';

/**
 * Drop-in replacement for KeyboardAvoidingView in a CENTERED pop-up modal.
 *
 * Does exactly what `behavior="padding"` does: pads the bottom of the box the card is centred in, so
 * the card recentres in the space that's left. The only difference is timing. KeyboardAvoidingView
 * applies that padding in one step, so the keyboard glides up over its quarter second while the card
 * simply arrives. Here the same padding is animated over the duration iOS reports for the keyboard's
 * OWN animation, so the two move together.
 *
 * Deliberately conservative about everything else:
 * - No wrapper view. An earlier attempt added one to measure the card, which broke every percentage
 *   height inside it (a card with maxHeight: '80%' suddenly had no real parent height to measure
 *   against and collapsed, cutting off its own Save button).
 * - No transform. Moving a card visually rather than laying it out left taps landing where the card
 *   used to be, so checkboxes stopped responding and the stray tap dismissed the keyboard instead.
 * - Padding also handles TALL cards correctly, which sliding never can: shrinking the box shrinks the
 *   card's own max height and hands the overflow to its scroll view, instead of leaving the bottom of
 *   a tall card stranded behind the keyboard.
 *
 * Padding is a layout property, so this runs on the JS thread rather than the native one. Per the
 * project's animation standard, judge its smoothness on a release build, not in dev.
 *
 * For centred cards only. Full screens and floating save bars are top-aligned and scrollable, where
 * the stock behaviour is fine and should be left alone.
 */
export default function KeyboardAwareCenter({
  children,
  style,
  pointerEvents,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'auto' | 'box-only';
}) {
  const padding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // iOS fires the "will" events BEFORE the keyboard moves and reports the real duration, which is
    // what lets the card travel alongside it. Android only offers the "did" events, so it lands a
    // beat later there by nature of the platform.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      Animated.timing(padding, {
        toValue: e?.endCoordinates?.height ?? 0,
        duration: e?.duration || 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: any) => {
      Animated.timing(padding, {
        toValue: 0,
        duration: e?.duration || 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [padding]);

  return (
    <Animated.View style={[style, { paddingBottom: padding }]} pointerEvents={pointerEvents}>
      {children}
    </Animated.View>
  );
}
