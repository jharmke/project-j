import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useRef } from 'react';
import { Animated, Modal as RNModal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import ButtonShine from './ButtonShine';
import GradientIcon from './GradientIcon';
import ModalHeader from './ModalHeader';

// Same lift/sink recipe as GradientIcon, applied to the row labels too -- kept local rather than a
// new shared component since GradientTitle is deliberately scoped to ScreenHeader/ModalHeader only.
const LIGHT = 0.24;
const DARK = 0.20;
function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))); }
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
const lift = (rgb: [number, number, number], amt: number) =>
  toHex(rgb[0] + (255 - rgb[0]) * amt, rgb[1] + (255 - rgb[1]) * amt, rgb[2] + (255 - rgb[2]) * amt);
const sink = (rgb: [number, number, number], amt: number) =>
  toHex(rgb[0] * (1 - amt), rgb[1] * (1 - amt), rgb[2] * (1 - amt));

function GradientLabel({ label, color, style }: { label: string; color: string; style: any }) {
  const rgb = parseHex(color);
  if (!rgb) return <Text style={[style, { color }]}>{label}</Text>;
  const stops: [string, string, string] = [lift(rgb, LIGHT), color, sink(rgb, DARK)];
  return (
    <MaskedView maskElement={<Text style={[style, { color: '#000000' }]}>{label}</Text>}>
      <LinearGradient colors={stops} locations={[0, 0.52, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <Text style={[style, { opacity: 0 }]}>{label}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

type Row = { label: string; icon: 'camera' | 'image' | 'trash'; onPress: () => void; destructive?: boolean };

// House "card press" standard (scale 0.97 in, 1.0 out, timing not spring) hand-rolled here instead
// of PressableButton -- that component forces flex:1 on itself, built specifically to sit as a flex
// child in a horizontal row of buttons. Dropped into this vertical list, flex:1 with no parent height
// collapsed all three rows on top of each other (shipped broken, caught on device). A plain full-width
// Pressable has no such assumption.
function OptionRow({ row, theme }: { row: Row; theme: ReturnType<typeof useTheme>['theme'] }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); row.onPress(); }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14,
          borderRadius: 10, borderWidth: 1,
          backgroundColor: row.destructive ? theme.accentRedBg : theme.accentBlueBg,
          borderColor: row.destructive ? theme.accentRedBorder : theme.accentBlueBorder,
        }}
      >
        <ButtonShine radius={10} />
        <GradientIcon name={row.icon} size={17} color={row.destructive ? theme.accentRed : theme.accentBlueRaw} />
        <GradientLabel
          label={row.label}
          color={row.destructive ? theme.accentRed : theme.accentBlueRaw}
          style={{ fontSize: 15, fontFamily: Type.uiSemibold }}
        />
      </Animated.View>
    </Pressable>
  );
}

// In-house replacement for ActionSheetIOS on the profile photo entry point -- the native sheet has
// no controllable animation (it just teleports in), which reads rough against the rest of the app's
// motion. Centered floating card per the modal standard, ModalHeader for the title/handle/close like
// every other modal (do not hand-roll a header again -- that's what shipped the first time and none
// of it matched: wrong font, wrong color, wrong placement, and a decorative handle pill that didn't
// actually close anything).

interface Props {
  visible: boolean;
  hasPhoto: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  onRemove: () => void;
}

export default function PhotoOptionsModal({ visible, hasPhoto, onClose, onTakePhoto, onChooseLibrary, onRemove }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 250 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const rows: Row[] = [
    { label: 'Take Photo', icon: 'camera', onPress: onTakePhoto },
    { label: 'Choose from Library', icon: 'image', onPress: onChooseLibrary },
  ];
  if (hasPhoto) rows.push({ label: 'Remove Photo', icon: 'trash', onPress: onRemove, destructive: true });

  return (
    <RNModal transparent animationType="none" visible={visible} onRequestClose={close} onShow={animateIn}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg }}
        activeOpacity={1}
        onPress={close}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View
          style={{
            width: '86%',
            backgroundColor: theme.bgSheet,
            borderRadius: 20,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            borderTopWidth: 1.5,
            borderTopColor: theme.accentBlueRaw + 'b3',
            paddingBottom: 16,
            overflow: 'hidden',
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <ModalHeader title="Profile Photo" onClose={close} />

          <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 10 }}>
            {rows.map(row => <OptionRow key={row.label} row={row} theme={theme} />)}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}
