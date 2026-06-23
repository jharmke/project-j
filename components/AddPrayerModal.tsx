import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { addPrayer, updatePrayer, type Prayer } from '../utils/prayers';
import { cancelPrayerNotification } from '../services/notifications';
import { useTheme } from '../theme';
import { ToastRenderer, useToast } from './Toast';

/**
 * Add/edit-prayer pop-up. Shared by the faith-tab card's quick-capture and the prayer screen.
 * editPrayer => EDIT mode (pre-filled, updates in place); otherwise add. Owns the write + toast,
 * hands the fresh list back via onAdded.
 *
 * KEYBOARD (UNSOLVED on the faith TAB, works from a STACK screen): from the prayer-screen FAB this
 * modal cancels/submits fine with the keyboard up. From the faith-TAB card it does NOT: with the
 * keyboard up the first tap is spent dismissing the keyboard and never reaches the button (keyboard-
 * DOWN taps fire fine, which is the tell). We tried everything the Halo chat uses (no ScrollView, no
 * statusBarTranslucent, no autoFocus, a GestureHandlerRootView wrap) and none cured the tab case, so
 * the root cause is still unknown. The faith card no longer opens this modal (its quick-add was
 * removed); the ONLY entry point now is the prayer-screen FAB, where it works. Before any future
 * faith-TAB modal opens here, this must be solved.
 * What DOES matter for the working FAB path, keep it: NO ScrollView (a ScrollView inside a Modal
 * eats the tap as its own onTouchStart), and the keyboard is raised by a short delayed focus, not
 * autoFocus. The backdrop dim is full-screen so it also covers behind the keyboard, no white gap.
 * The card is anchored near the TOP (justifyContent flex-start + paddingTop), high enough to clear
 * the keyboard, so when the keyboard rises the card does NOT shift up (no jump / glitch).
 */

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded?: (list: Prayer[]) => void;
  editPrayer?: Prayer | null;
}

const GOLD = '212,134,10';

export default function AddPrayerModal({ visible, onClose, onAdded, editPrayer }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isEdit = !!editPrayer;

  // Seed the input each time the modal opens: the existing text in edit mode, empty in add mode.
  useEffect(() => {
    if (visible) setText(editPrayer ? editPrayer.text : '');
  }, [visible]);

  const animateIn = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 250 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    // Raise the keyboard AFTER the modal settles, not via autoFocus (see KEYBOARD note up top).
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => { setText(''); setSaving(false); onClose(); });
  };

  const handleSave = async () => {
    if (!text.trim() || saving) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const updated = isEdit ? await updatePrayer(editPrayer!.id, text) : await addPrayer(text);
      if (!isEdit) cancelPrayerNotification();
      showToast(isEdit ? 'Prayer updated' : 'Prayer added', undefined, 'success');
      onAdded?.(updated);
      close();
    } catch {
      showToast('Could not save, please try again', undefined, 'error');
      setSaving(false);
    }
  };

  const canSave = text.trim().length > 0 && !saving;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close} onShow={animateIn}>
      <ToastRenderer />
      {/* Backdrop: solid, full-screen, dim also covers behind the keyboard. Tap to close. */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg }}
        activeOpacity={1}
        onPress={close}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: insets.top + 80 }}
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
            borderTopColor: `rgba(${GOLD},0.7)`,
            padding: 20,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="hand-left" size={15} color={theme.accentAmber} />
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentAmber }}>
              {isEdit ? 'Edit a Prayer' : 'Add a Prayer'}
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginBottom: 16, lineHeight: 20 }}>
            {isEdit
              ? 'Reword what you wrote. Everything else stays the same.'
              : "Something you're carrying. Mark it answered whenever God shows up, or just let it rest here."}
          </Text>

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="What's on your heart?"
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
              minHeight: 72,
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
              onPress={handleSave}
              disabled={!canSave}
              style={{
                flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                borderWidth: 1, borderRadius: 8, paddingVertical: 12,
                backgroundColor: canSave ? `rgba(${GOLD},0.15)` : theme.bgInput,
                borderColor: canSave ? `rgba(${GOLD},0.35)` : theme.borderInput,
                opacity: canSave ? 1 : 0.4,
              }}
            >
              {saving
                ? <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.accentAmber }}>Saving...</Text>
                : <>
                    <Ionicons name={isEdit ? 'checkmark' : 'add'} size={16} color={theme.accentAmber} />
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.accentAmber }}>{isEdit ? 'Save' : 'Add'}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
