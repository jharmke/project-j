import { useEffect, useRef, useState } from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

// Halo's chat overlay. A transparent Modal that fades in over the current faith screen
// (the screen stays mounted behind it, so the user never loses their place). Never a
// separate page, never a slide up bottom sheet. Drag the handle down or tap the dim strip
// to close. Theme aware; Halo's gold is her own identity.
//
// STEP 2 (this file): the full chat shell. Sending appends a local placeholder reply so
// the UX can be locked. STEP 3 replaces the placeholder with the real faithCompanion call.

const GOLD = '#e8a020';      // Halo identity
const CROSS_DARK = '#2e1c03';

const GREETINGS = [
  "Hey, I'm Halo. What's on your heart today?",
  "Hi there. What's on your mind, faith, life, something you're carrying?",
  "Glad you're here. What would you like to talk through?",
  "Hey. Anything you're wrestling with or want to dig into?",
  "I'm here. What's going on with you today?",
];

type Msg = { role: 'user' | 'halo'; text: string };

// A small Latin cross, used in Halo's gold badge so it matches the FAB.
function MiniCross({ size, color }: { size: number; color: string }) {
  const bar = Math.max(2, Math.round(size * 0.18));
  const vH = Math.round(size * 0.74);
  const hW = Math.round(size * 0.52);
  return (
    <Svg width={size} height={size}>
      <Rect x={(size - bar) / 2} y={Math.round(size * 0.13)} width={bar} height={vH} rx={1} fill={color} />
      <Rect x={(size - hW) / 2}  y={Math.round(size * 0.34)} width={hW}  height={bar} rx={1} fill={color} />
    </Svg>
  );
}

export default function CompanionChat({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Msg[]>(() => [
    { role: 'halo', text: GREETINGS[Math.floor(Math.random() * GREETINGS.length)] },
  ]);
  const [input, setInput] = useState('');
  const [kbUp, setKbUp] = useState(false);

  const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    }
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, () => setKbUp(true));
    const h = Keyboard.addListener(hideEvt, () => setKbUp(false));
    return () => { s.remove(); h.remove(); };
  }, []);

  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => onClose());
  };

  const canSend = input.trim().length > 0;

  const send = () => {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    // STEP 3 will replace this with the real faithCompanion call.
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'halo',
        text: "I'm not connected yet, this is the chat shell. The next step wires me up so we can actually talk.",
      }]);
    }, 500);
  };

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const panelScale      = anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {/* Dim backdrop, tap to close. */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Panel. */}
        <Animated.View
          style={[
            styles.panel,
            {
              marginTop: insets.top + 96,
              backgroundColor: theme.bgSheet,
              borderColor: theme.borderSheet,
              opacity: anim,
              transform: [{ scale: panelScale }],
            },
          ]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top + 96}
          >
            {/* Handle: tap to close (drag-to-dismiss pinned for a gesture-handler pass). */}
            <Pressable onPress={close} hitSlop={10} style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: theme.textDim }]} />
            </Pressable>
            <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
              <View style={styles.brandRow}>
                <View style={[styles.brandDot, { backgroundColor: GOLD }]}>
                  <MiniCross size={16} color={CROSS_DARK} />
                </View>
                <View>
                  <Text style={[styles.brand, { color: theme.textPrimary }]}>Halo</Text>
                  <Text style={[styles.brandSub, { color: theme.textDim }]}>Faith companion</Text>
                </View>
              </View>
              <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>

            {/* Messages. */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    m.role === 'user'
                      ? { alignSelf: 'flex-end', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }
                      : { alignSelf: 'flex-start', backgroundColor: 'rgba(232,160,32,0.12)', borderColor: 'rgba(232,160,32,0.32)', borderLeftColor: GOLD, borderLeftWidth: 2.5 },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: theme.textPrimary }]}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Input bar (seamless with the panel, no divider band). */}
            <View style={styles.inputBar}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                placeholder="Ask Halo..."
                placeholderTextColor={theme.textPlaceholder}
                value={input}
                onChangeText={setInput}
                multiline
                onBlur={() => inputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
              />
              <Pressable
                onPress={send}
                disabled={!canSend}
                style={[styles.sendBtn, { backgroundColor: canSend ? GOLD : theme.bgInput, borderColor: canSend ? GOLD : theme.borderInput }]}
              >
                <Ionicons name="arrow-up" size={20} color={canSend ? CROSS_DARK : theme.textDim} />
              </Pressable>
            </View>

            <Text style={[styles.disclaimer, { color: theme.textDim, paddingBottom: kbUp ? 10 : insets.bottom + 8 }]}>
              Halo is AI and can make mistakes. Not a substitute for prayer, a pastor, or professional help.
            </Text>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 2 },
  handle:     { width: 40, height: 5, borderRadius: 3, opacity: 0.5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  brandRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandDot:  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  brand:     { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1.5 },
  brandSub:  { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: -2 },
  closeBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    maxWidth: '86%',
    borderWidth: 0.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  bubbleText: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  input:      { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 20, paddingTop: 8, lineHeight: 14 },
});
