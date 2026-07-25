import { InputAccessoryView, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { Type } from '../typography';

/**
 * A Done bar that sits above the keyboard, for the two keyboards that have no way to close themselves.
 *
 * Use it ONLY for:
 *   - multiline fields, where Return inserts a new line instead of dismissing, and
 *   - number pads (number-pad / numeric / decimal-pad), which have no Return key at all.
 *
 * A single-line text field already dismisses on Return, so a Done bar there is just chrome sitting
 * above every keyboard in the app. Do not blanket it.
 *
 * Visual recipe is lifted from the onboarding height/goal fields, which already had one of these:
 * translucent chrome fill over a blur so it reads as part of the keyboard, tight padding, and hit-slop
 * rather than a fat touch target so the bar stays thin while still clearing 44pt. An opaque fill with
 * generous padding turns this into a white slab sitting on top of the keyboard.
 *
 * iOS only: InputAccessoryView is not implemented on Android, where the system back gesture closes the
 * keyboard anyway. Renders nothing there.
 *
 * Usage: give the field `inputAccessoryViewID="someId"` and render <KeyboardDoneBar nativeID="someId" />
 * alongside it, inside the same Modal.
 */
export default function KeyboardDoneBar({ nativeID, color }: { nativeID: string; color?: string }) {
  const { theme } = useTheme();

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: theme.chromeFill,
          borderTopWidth: 0.5,
          borderTopColor: theme.borderCard,
          overflow: 'hidden',
        }}
      >
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); Keyboard.dismiss(); }}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
        >
          <Text style={{ fontSize: 16, fontFamily: Type.uiSemibold, color: color ?? theme.accentBlue }}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}
