import { useEffect, useRef, useState } from 'react';
import {
  Animated, Keyboard, Linking, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';
import { CRISIS_RESPONSE, screenForCrisis } from '../utils/faithCrisis';
import { useTheme } from '../theme';

// Halo's chat overlay. A transparent Modal that fades in over the current faith screen
// (the screen stays mounted behind it, so the user never loses their place). Never a
// separate page, never a slide up bottom sheet. Theme aware; Halo's gold is her own
// identity. Calls the deployed faithCompanion Cloud Function; the server enforces the
// daily cap and the crisis backstop, so the client just renders what comes back.

const GOLD = '#e8a020';      // Halo identity
const CROSS_DARK = '#2e1c03';
const CRISIS_RED = '#cc3333';

const GREETINGS = [
  "Hey, I'm Halo. What's on your heart today?",
  "Hi there. What's on your mind, faith, life, something you're carrying?",
  "Glad you're here. What would you like to talk through?",
  "Hey. Anything you're wrestling with or want to dig into?",
  "I'm here. What's going on with you today?",
];

const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

type Role = 'user' | 'halo' | 'system' | 'crisis';
type Msg = { role: Role; text: string };

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

// The hardcoded crisis response (care + real resources, no scripture). Rendered when the
// server flags a crisis. Resources are tappable (call / text).
function CrisisCard({ textPrimary, textSecondary, textDim, bgCard, bgInput, borderCard }: {
  textPrimary: string; textSecondary: string; textDim: string; bgCard: string; bgInput: string; borderCard: string;
}) {
  const open = (r: typeof CRISIS_RESPONSE.resources[number]) => {
    const body = r.body ? encodeURIComponent(r.body) : '';
    const url = r.action === 'tel'
      ? `tel:${r.value}`
      : Platform.OS === 'ios'
        ? `sms:${r.value}${body ? `&body=${body}` : ''}`
        : `sms:${r.value}${body ? `?body=${body}` : ''}`;
    Linking.openURL(url).catch(() => {});
  };
  return (
    <View style={[styles.crisisCard, { backgroundColor: bgCard, borderColor: 'rgba(204,51,51,0.4)' }]}>
      <Text style={[styles.crisisMsg, { color: textPrimary }]}>{CRISIS_RESPONSE.message}</Text>
      {CRISIS_RESPONSE.resources.map((r, i) => (
        <Pressable key={i} onPress={() => open(r)} style={[styles.crisisBtn, { backgroundColor: bgInput, borderColor: borderCard }]}>
          <Ionicons name={r.action === 'tel' ? 'call' : 'chatbubble-ellipses'} size={18} color={CRISIS_RED} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.crisisBtnLabel, { color: textPrimary }]}>{r.label}</Text>
            <Text style={[styles.crisisBtnDetail, { color: textSecondary }]}>{r.detail}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={[styles.crisisSmall, { color: textDim }]}>{CRISIS_RESPONSE.outsideUS}</Text>
      <Text style={[styles.crisisClosing, { color: textSecondary }]}>{CRISIS_RESPONSE.closing}</Text>
    </View>
  );
}

// Three pulsing dots shown while Halo is composing a reply.
function TypingDots() {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={[styles.bubble, styles.haloBubble]}>
      <Animated.View style={{ flexDirection: 'row', gap: 5, opacity: a, paddingVertical: 2 }}>
        {[0, 1, 2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD }} />)}
      </Animated.View>
    </View>
  );
}

export default function CompanionChat({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Msg[]>(() => [{ role: 'halo', text: pickGreeting() }]);
  const [input, setInput] = useState('');
  const [kb, setKb] = useState(0); // keyboard height when shown
  const [sending, setSending] = useState(false);
  const [tier, setTier] = useState<'rooted' | 'exploring'>('exploring');

  const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Faith tier drives Halo's posture (Rooted speaks as a fellow believer, Exploring is gentler).
  useEffect(() => {
    AsyncStorage.getItem('pj_settings')
      .then(raw => {
        const t = raw ? JSON.parse(raw).faithJourney : null;
        setTier(t === 'rooted' ? 'rooted' : 'exploring');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    }
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, e => setKb(e.endCoordinates?.height ?? 0));
    const h = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => onClose());
  };

  const newChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    setInput('');
    setSending(false);
    setMessages([{ role: 'halo', text: pickGreeting() }]);
  };

  const canSend = input.trim().length > 0 && !sending;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // History the model sees: prior real turns only (skip system notices and crisis cards).
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'halo')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');

    // Client-side crisis short-circuit (layer 1): never route a crisis to the AI; show
    // the vetted hardcoded response instantly, offline-safe.
    if (screenForCrisis(text).isCrisis) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      return;
    }

    setSending(true);

    try {
      const callable = httpsCallable(getFunctions(app), 'faithCompanion');
      const res = await callable({ message: text, tier, history });
      const data = (res.data ?? {}) as { ok?: boolean; reply?: string; crisis?: boolean; reason?: string; message?: string };
      setSending(false);

      if (data.crisis) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      } else if (data.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'halo', text: data.reply! }]);
      } else if (data.message) {
        setMessages(prev => [...prev, { role: 'system', text: data.message! }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', text: 'Something went wrong. Please try again.' }]);
      }
    } catch (e) {
      setSending(false);
      const code = String((e as { code?: string })?.code ?? '');
      const msg = code.includes('unauthenticated')
        ? 'Please sign in to talk with Halo.'
        : 'Halo is resting. Please try again in a little bit.';
      setMessages(prev => [...prev, { role: 'system', text: msg }]);
    }
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
          <View style={{ flex: 1, paddingBottom: kb }}>
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
              <View style={styles.headerActions}>
                <Pressable onPress={newChat} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="create-outline" size={20} color={theme.textMuted} />
                </Pressable>
                <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Messages. */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((m, i) => {
                if (m.role === 'system') {
                  return <Text key={i} style={[styles.systemMsg, { color: theme.textMuted }]}>{m.text}</Text>;
                }
                if (m.role === 'crisis') {
                  return (
                    <CrisisCard
                      key={i}
                      textPrimary={theme.textPrimary}
                      textSecondary={theme.textSecondary}
                      textDim={theme.textDim}
                      bgCard={theme.bgCard}
                      bgInput={theme.bgInput}
                      borderCard={theme.borderCard}
                    />
                  );
                }
                return (
                  <View
                    key={i}
                    style={[
                      styles.bubble,
                      m.role === 'user'
                        ? { alignSelf: 'flex-end', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }
                        : styles.haloBubble,
                    ]}
                  >
                    <Text style={[styles.bubbleText, { color: theme.textPrimary }]}>{m.text}</Text>
                  </View>
                );
              })}
              {sending && <TypingDots />}
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

            <Text style={[styles.disclaimer, { color: theme.textDim, paddingBottom: kb > 0 ? 10 : insets.bottom + 8 }]}>
              Halo is AI and can make mistakes. Not a substitute for prayer, a pastor, or professional help.
            </Text>
          </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
  haloBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,160,32,0.12)',
    borderColor: 'rgba(232,160,32,0.32)',
    borderLeftColor: GOLD,
    borderLeftWidth: 2.5,
  },
  bubbleText: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  systemMsg:  { fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'center', alignSelf: 'center', maxWidth: '90%', marginVertical: 10, lineHeight: 17 },
  crisisCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  crisisMsg:      { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  crisisBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  crisisBtnLabel: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  crisisBtnDetail:{ fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 1 },
  crisisSmall:    { fontSize: 11, fontFamily: 'DMSans_400Regular', lineHeight: 16 },
  crisisClosing:  { fontSize: 13, fontFamily: 'DMSans_600SemiBold', textAlign: 'center', marginTop: 2 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  input:      { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 20, paddingTop: 8, lineHeight: 14 },
});
