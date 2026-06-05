import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { type Prayer } from '../utils/prayers';
import { useTheme } from '../theme';

/**
 * Prayer action pop-up. Tapping a prayer on the full screen opens this small centered fade card.
 * Answering is a DELIBERATE, chosen moment here (a real button), not a quick checkbox tick: for
 * an active prayer the warm primary action is "God answered this"; for an answered one it is
 * "Move back to active." Delete lives here too (the parent shows the confirm). Visible whenever a
 * prayer is passed in; a held copy keeps the content from blanking during the close fade.
 */

const GOLD_RGB = '212,134,10';

interface Props {
  prayer: Prayer | null;
  onClose: () => void;
  onAnswer: (p: Prayer) => void;
  onUnanswer: (p: Prayer) => void;
  onEdit: (p: Prayer) => void;
  onDelete: (p: Prayer) => void;
}

export default function PrayerActionModal({ prayer, onClose, onAnswer, onUnanswer, onEdit, onDelete }: Props) {
  const { theme } = useTheme();
  const [display, setDisplay] = useState<Prayer | null>(prayer);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (prayer) setDisplay(prayer); }, [prayer]);

  const animateIn = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 250 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const answered = display?.status === 'answered';

  return (
    <Modal transparent animationType="none" visible={!!prayer} onRequestClose={close} onShow={animateIn}>
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
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            borderTopWidth: 1.5,
            borderTopColor: `rgba(${GOLD_RGB},0.7)`,
            padding: 20,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textPrimary, lineHeight: 24, marginBottom: 18 }}>
            "{display?.text}"
          </Text>

          {answered ? (
            <TouchableOpacity
              onPress={() => display && onUnanswer(display)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 13, marginBottom: 10, backgroundColor: theme.bgInput, borderColor: theme.borderInput }}
            >
              <Ionicons name="arrow-undo" size={16} color={theme.textSecondary} />
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>Move back to active</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => display && onAnswer(display)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 14, marginBottom: 10, backgroundColor: `rgba(${GOLD_RGB},0.16)`, borderColor: `rgba(${GOLD_RGB},0.4)` }}
            >
              <Ionicons name="sparkles" size={16} color={theme.accentAmber} />
              <Text style={{ fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: theme.accentAmber }}>God answered this</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => display && onEdit(display)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, paddingVertical: 12, backgroundColor: theme.bgInput }}
            >
              <Ionicons name="create-outline" size={15} color={theme.textSecondary} />
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => display && onDelete(display)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: theme.accentRedBorder, borderRadius: 10, paddingVertical: 12, backgroundColor: theme.accentRedBg }}
            >
              <Ionicons name="trash-outline" size={14} color={theme.accentRed} />
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.accentRed }}>Delete</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={close}
            style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
