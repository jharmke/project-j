import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { addPrayer, updatePrayer, type Prayer } from '../utils/prayers';
import { useTheme } from '../theme';
import { ToastRenderer, useToast } from './Toast';

/**
 * Add/edit-prayer pop-up. Shared by the faith-tab card's quick-capture and the prayer screen.
 * editPrayer => EDIT mode (pre-filled, updates in place); otherwise add. Owns the write + toast,
 * hands the fresh list back via onAdded.
 *
 * KEYBOARD (the hard-won bit): tapping a button while the keyboard is open needs TWO things, and
 * missing either one makes the first tap only dismiss the keyboard:
 *   1. A ScrollView with keyboardShouldPersistTaps="handled" so iOS lets the tap reach the button
 *      instead of absorbing it into "dismiss the keyboard."
 *   2. No layout shift: NO KeyboardAvoidingView and NO keyboard insets, because either one slides
 *      the card during the tap and cancels the press. The card is pinned at a fixed top instead,
 *      high enough that the keyboard never covers it.
 * The dim sits on the outer View (covers behind the keyboard, so no white gap).
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
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => { setText(''); setSaving(false); onClose(); });
  };

  const handleSave = async () => {
    console.log('[PRAYERMODAL] add onPress fired. canSave=', text.trim().length > 0 && !saving);
    if (!text.trim() || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const updated = isEdit ? await updatePrayer(editPrayer!.id, text) : await addPrayer(text);
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
    <Modal transparent animationType="none" visible={visible} onRequestClose={close} onShow={animateIn} statusBarTranslucent>
      <ToastRenderer />
      <View style={{ flex: 1, backgroundColor: theme.overlayBg }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 50, alignItems: 'center' }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          onTouchStart={() => console.log('[PRAYERMODAL] ScrollView onTouchStart')}
        >
          {/* Backdrop: tap anywhere outside the card to close. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPressIn={() => console.log('[PRAYERMODAL] backdrop onPressIn')}
            onPress={() => { console.log('[PRAYERMODAL] backdrop onPress'); close(); }}
          />

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
              autoFocus
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
                onPressIn={() => console.log('[PRAYERMODAL] cancel onPressIn')}
                onPress={() => { console.log('[PRAYERMODAL] cancel onPress'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); close(); }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 12, backgroundColor: theme.bgInput }}
              >
                <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPressIn={() => console.log('[PRAYERMODAL] add onPressIn')}
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
        </ScrollView>
      </View>
    </Modal>
  );
}
