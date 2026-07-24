import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useRef } from 'react';
import { Animated, Modal as RNModal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';
import GradientIcon from './GradientIcon';
import ModalHeader from './ModalHeader';

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

  const rows: { label: string; icon: 'camera' | 'image' | 'trash'; onPress: () => void; destructive?: boolean }[] = [
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
            {rows.map(row => (
              <TouchableOpacity
                key={row.label}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); row.onPress(); }}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14,
                  borderRadius: 10, borderWidth: 1,
                  backgroundColor: row.destructive ? theme.accentRedBg : theme.accentBlueBg,
                  borderColor: row.destructive ? theme.accentRedBorder : theme.accentBlueBorder,
                }}
              >
                <GradientIcon name={row.icon} size={17} color={row.destructive ? theme.accentRed : theme.accentBlueRaw} />
                <Text style={{ fontSize: 15, fontFamily: Type.uiSemibold, color: row.destructive ? theme.accentRed : theme.accentBlue }}>{row.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}
