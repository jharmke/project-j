import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useRef } from 'react';
import { Animated, Modal as RNModal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { Type } from '../typography';

// In-house replacement for ActionSheetIOS on the profile photo entry point -- the native sheet has
// no controllable animation (it just teleports in), which reads rough against the rest of the app's
// motion. Centered floating card per the modal standard: spring scale + opacity in onShow, handle pill.

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

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; destructive?: boolean }[] = [
    { label: 'Take Photo', icon: 'camera-outline', onPress: onTakePhoto },
    { label: 'Choose from Library', icon: 'image-outline', onPress: onChooseLibrary },
  ];
  if (hasPhoto) rows.push({ label: 'Remove Photo', icon: 'trash-outline', onPress: onRemove, destructive: true });

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
            width: '82%',
            backgroundColor: theme.bgSheet,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            borderTopWidth: 1.5,
            borderTopColor: theme.accentBlueRaw + '55',
            paddingTop: 10,
            paddingBottom: 8,
            paddingHorizontal: 8,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard, marginBottom: 12 }} />
          <Text style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 10 }}>
            Profile Photo
          </Text>

          {rows.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); row.onPress(); }}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12,
                borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: theme.borderCard,
              }}
            >
              <Ionicons name={row.icon} size={17} color={row.destructive ? theme.accentRed : theme.accentBlue} />
              <Text style={{ fontSize: 15, fontFamily: Type.uiMedium, color: row.destructive ? theme.accentRed : theme.textPrimary }}>{row.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={close} activeOpacity={0.7} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 4, borderTopWidth: 0.5, borderTopColor: theme.borderCard }}>
            <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.textMuted }}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </RNModal>
  );
}
