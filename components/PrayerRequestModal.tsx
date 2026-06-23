import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../theme';
import { ToastRenderer, useToast } from './Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  variant?: 'faith';
}

export default function PrayerRequestModal({ visible, onClose, variant }: Props) {
  const { theme } = useTheme();
  const faith = variant === 'faith';
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
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
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => { setMessage(''); setSending(false); onClose(); });
  };

  const handleSend = async () => {
    if (!message.trim() || sending || !auth.currentUser) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'prayer_requests'), {
        message: message.trim(),
        userName: auth.currentUser.displayName ?? '',
        userEmail: auth.currentUser.email ?? '',
        timestamp: serverTimestamp(),
      });
      showToast('Prayer request sent', 'success');
      close();
    } catch {
      showToast('Could not send -- please try again', 'error');
      setSending(false);
    }
  };

  const canSend = message.trim().length > 0 && !sending;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close} onShow={animateIn}>
      <ToastRenderer />
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg }}
        activeOpacity={1}
        onPress={close}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        pointerEvents="box-none"
      >
        <Animated.View
          style={{
            width: '88%',
            backgroundColor: theme.bgSheet,
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            borderTopWidth: 1.5,
            borderTopColor: faith ? theme.accentAmber : theme.accentBlueRaw,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 20,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); }} style={{ alignSelf: 'center', paddingTop: 4, paddingBottom: 10, paddingHorizontal: 24, marginBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="heart" size={15} color={faith ? theme.accentAmber : theme.accentBlue} />
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: faith ? theme.accentAmber : theme.accentBlue }}>
              Send a Prayer Request
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginBottom: 16, lineHeight: 20 }}>
            Share what's on your heart. Every request is read and prayed over.
          </Text>

          <TextInput
            ref={inputRef}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your prayer request here..."
            placeholderTextColor={theme.textDim}
            multiline
            style={{
              backgroundColor: theme.bgInput,
              borderWidth: 1,
              borderColor: theme.borderInput,
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              fontFamily: 'DMSans_400Regular',
              color: theme.textPrimary,
              minHeight: 100,
              textAlignVertical: 'top',
              marginBottom: 16,
            }}
            onBlur={() => inputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 12, backgroundColor: theme.bgInput }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSend}
              style={{
                flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderWidth: 1, borderRadius: 8, paddingVertical: 12,
                backgroundColor: canSend ? (faith ? 'rgba(212,134,10,0.10)' : theme.accentBlueBg) : theme.bgInput,
                borderColor: canSend ? (faith ? 'rgba(212,134,10,0.30)' : theme.accentBlueBorder) : theme.borderInput,
                opacity: canSend ? 1 : 0.4,
              }}
            >
              {sending
                ? <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: faith ? theme.accentAmber : theme.accentBlue }}>Sending...</Text>
                : <>
                    <Ionicons name="send" size={14} color={faith ? theme.accentAmber : theme.accentBlue} />
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: faith ? theme.accentAmber : theme.accentBlue }}>Send</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
