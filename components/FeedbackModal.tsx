import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { triggerHaptic } from '@/utils/haptics';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRef, useState } from 'react';
import {
  Animated, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { auth, db, storage } from '../firebaseConfig';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import ButtonShine from './ButtonShine';
import PrimaryCTA from './PrimaryCTA';

// Send Feedback. Opened from Settings > Help. Collects a type + description + an optional photo,
// writes straight to Firestore (users/{uid}/app_feedback), never leaves the app -- same pattern as
// PrayerRequestModal. A Cloud Function (onAppFeedbackCreated) emails it to the dev inbox; the photo
// (if any) uploads to Storage first and the email gets a link, same upload pattern as foodPhotos.ts.
// Centered floating card per the modal standard: spring scale + opacity in onShow, handle pill,
// overlay tap-to-dismiss, ToastRenderer inside the Modal. No double dashes in user-facing strings.

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const canSend = description.trim().length > 0 && !sending;

  const open = () => {
    setType('Bug');
    setDescription('');
    setPhotoUri(null);
    setSending(false);
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

  const pickPhoto = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleSend = async () => {
    if (!canSend || !auth.currentUser) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        const r = ref(storage, `users/${auth.currentUser.uid}/feedback_photos/${Date.now()}.jpg`);
        const response = await fetch(photoUri);
        const blob = await response.blob();
        await uploadBytes(r, blob, { contentType: 'image/jpeg' });
        photoUrl = await getDownloadURL(r);
      }
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'app_feedback'), {
        type,
        description: description.trim(),
        photoUrl: photoUrl ?? null,
        userName: auth.currentUser.displayName ?? '',
        userEmail: auth.currentUser.email ?? '',
        appVersion: Constants.expoConfig?.version ?? '1.0',
        device: `${Platform.OS} ${Platform.Version}`,
        timestamp: serverTimestamp(),
      });
      showToast('Feedback sent', 'Thanks for helping us improve GoodForge', 'success');
      close();
    } catch {
      showToast('Could not send', 'Please try again', 'error');
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <ToastRenderer />
      {/* Backdrop: solid, full-screen, sits outside the KeyboardAvoidingView so it still covers behind the keyboard. */}
      <TouchableOpacity
        style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.overlayBg }]}
        activeOpacity={1}
        onPress={closeWithHaptic}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
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
            <ModalHeader title="Send Feedback" onClose={closeWithHaptic} />
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }} />

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, lineHeight: 19, marginBottom: 16 }}>
                Found a bug or have an idea? Send it our way, right from the app.
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
                      {active && <ButtonShine radius={10} />}
                      <Text style={{ fontSize: 13, fontFamily: Type.uiBold, color: active ? theme.accentBlue : theme.textSecondary }}>{t}</Text>
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
                  color: theme.textPrimary, fontSize: 14, fontFamily: Type.ui,
                  paddingHorizontal: 12, paddingVertical: 12, minHeight: 120, textAlignVertical: 'top',
                }}
              />

              {/* Photo attach */}
              <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>PHOTO (OPTIONAL)</Text>
              {photoUri ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <Image source={{ uri: photoUri }} style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1, borderColor: theme.borderCard }} />
                  <TouchableOpacity
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPhotoUri(null); }}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44, paddingHorizontal: 10 }}
                  >
                    <Ionicons name="close-circle" size={16} color={theme.accentRed} />
                    <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.accentRed }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickPhoto}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 44, borderRadius: 10, marginBottom: 18,
                    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
                  }}
                >
                  <Ionicons name="image-outline" size={16} color={theme.accentBlue} />
                  <Text style={{ fontSize: 13, fontFamily: Type.uiSemibold, color: theme.accentBlue }}>Attach a Photo</Text>
                </TouchableOpacity>
              )}

              {/* Send button */}
              <PrimaryCTA
                label="Send"
                busyLabel="Sending..."
                busy={sending}
                onPress={handleSend}
                disabled={!canSend}
              />
            </ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 8 },
});
