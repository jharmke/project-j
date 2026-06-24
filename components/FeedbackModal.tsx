import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { triggerHaptic } from '@/utils/haptics';
import { useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';

// Send Feedback. Opened from Settings > About. Collects a type + a description and hands off to
// the user's mail app via a mailto link, addressed to the dev inbox. No backend (per spec). A
// mailto cannot attach files, so a note points users to email screenshots directly for now.
// Centered floating card per the modal standard: spring scale + opacity in onShow, handle pill,
// overlay tap-to-dismiss, ToastRenderer inside the Modal. No double dashes in user-facing strings.

const FEEDBACK_EMAIL = 'dev.harmke@gmail.com';
const TYPES = ['Bug', 'Suggestion', 'Other'] as const;
type FeedbackType = typeof TYPES[number];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const [type, setType] = useState<FeedbackType>('Bug');
  const [description, setDescription] = useState('');

  const canSend = description.trim().length > 0;

  const open = () => {
    setType('Bug');
    setDescription('');
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const closeWithHaptic = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    close();
  };

  const handleSend = async () => {
    if (!canSend) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const version = Constants.expoConfig?.version ?? '1.0';
    const subject = `[Project J] ${type}`;
    const body = `${description.trim()}\n\n----------\nType: ${type}\nApp version: ${version}\nDevice: ${Platform.OS} ${Platform.Version}`;
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        showToast('No mail app found', `Email ${FEEDBACK_EMAIL} directly`, 'error');
        return;
      }
      await Linking.openURL(url);
      close();
    } catch {
      showToast('Could not open mail', `Email ${FEEDBACK_EMAIL} directly`, 'error');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <ToastRenderer />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]} pointerEvents="none" />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

          <Animated.View
            style={{
              width: '88%', maxHeight: '82%',
              backgroundColor: theme.bgSheet,
              borderRadius: 20, borderWidth: 0.5, borderColor: theme.borderCard,
              borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw + '55',
              shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 24,
              overflow: 'hidden',
              transform: [{ scale: scaleAnim }], opacity: opacityAnim,
            }}
          >
            {/* Handle */}
            <TouchableOpacity onPress={closeWithHaptic} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }} hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
            </TouchableOpacity>

            {/* Header */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 6, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbox-ellipses" size={16} color={theme.accentBlue} />
                <Text style={{ fontSize: 18, color: theme.accentBlue, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 }}>SEND FEEDBACK</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_400Regular', lineHeight: 19, marginBottom: 16 }}>
                Found a bug or have an idea? Send it our way. It opens your mail app with the details filled in.
              </Text>

              {/* Type pills */}
              <Text style={[styles.label, { color: theme.textMuted }]}>TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {TYPES.map(t => {
                  const active = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setType(t); }}
                      activeOpacity={0.85}
                      style={{
                        flex: 1, paddingVertical: 11, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: active ? theme.accentBlueBg : theme.bgCard,
                        borderWidth: active ? 1.5 : 1,
                        borderColor: active ? theme.accentBlueBorder : theme.borderCard,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: active ? theme.accentBlue : theme.textSecondary }}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description */}
              <Text style={[styles.label, { color: theme.textMuted }]}>DESCRIPTION</Text>
              <TextInput
                ref={inputRef}
                value={description}
                onChangeText={setDescription}
                onBlur={() => inputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
                placeholder={type === 'Bug' ? 'What happened, and what did you expect?' : 'Tell us what is on your mind'}
                placeholderTextColor={theme.textDim}
                multiline
                style={{
                  backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10,
                  color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_400Regular',
                  paddingHorizontal: 12, paddingVertical: 12, minHeight: 120, textAlignVertical: 'top',
                }}
              />

              {/* Screenshot note */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, marginBottom: 18 }}>
                <Ionicons name="image-outline" size={13} color={theme.textMuted} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', lineHeight: 17 }}>
                  Have a screenshot? Email it straight to {FEEDBACK_EMAIL}.
                </Text>
              </View>

              {/* Send button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.85}
                style={{
                  borderRadius: 10, padding: 15, alignItems: 'center',
                  backgroundColor: canSend ? theme.accentBlue : theme.bgCard,
                  borderWidth: canSend ? 0 : 1, borderColor: theme.borderCard,
                  opacity: canSend ? 1 : 0.6,
                }}
              >
                <Text style={{ color: canSend ? theme.bgPrimary : theme.textMuted, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 }}>SEND</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 8 },
});
