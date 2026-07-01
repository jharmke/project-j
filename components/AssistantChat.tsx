import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Keyboard, Linking, Modal, Platform, Pressable,
  ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';
import { CRISIS_RESPONSE, screenForCrisis } from '../utils/faithCrisis';
import { ToastRenderer, useToast } from './Toast';
import { useTheme } from '../theme';

// The GENERAL Companion assistant's chat overlay (NOT Halo). Same panel UX as Halo's chat so the
// two feel like siblings, but re-skinned to the app THEME ACCENT and pointed at the deployed
// `appCompanion` Cloud Function (which enforces the daily cap + crisis backstop). No Scripture
// verification here: the assistant answers wellness + app-knowledge questions, not faith, so its
// replies are plain text. The crisis response is reused as-is (it is faith-neutral care + resources).

const CRISIS_RED = '#cc3333';

type StyleMode = 'discipline' | 'balanced' | 'mindful';
type FaithTier = 'rooted' | 'exploring' | 'notrightnow';

const GREETINGS = [
  "Hey, I'm your Project J assistant. What can I help you with?",
  "Hi. Question about the app, your numbers, or where to start? Ask away.",
  "What's on your mind, food, training, sleep, or finding your way around the app?",
  "I'm here. Ask me how to do anything, or how you're tracking.",
  "Ready when you are. What would you like to figure out?",
];
const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

// Local cache of today's usage so the counter can show the moment the chat opens (the client
// cannot read the server's ai_usage_companion counter, which is locked down by the rules). The
// date is the server's UTC day, so a stale cache self-expires at the daily reset.
const QUOTA_KEY = 'pj_companion_quota';
const utcDay = () => new Date().toISOString().slice(0, 10);

type Role = 'user' | 'assistant' | 'system' | 'crisis';
type Msg = { role: Role; text: string; feedback?: 'up' | 'down' };

// Build the per-user CONTEXT block (profile + goals) sent to the function, plus the mode/tier the
// function needs. Read-only; never writes. Missing fields are simply omitted.
async function loadUserContext(): Promise<{ styleMode: StyleMode; faithTier: FaithTier; userContext: string }> {
  let styleMode: StyleMode = 'balanced';
  let faithTier: FaithTier = 'exploring';
  const lines: string[] = [];
  try {
    const rawSettings = await AsyncStorage.getItem('pj_settings');
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      if (s.styleMode === 'discipline' || s.styleMode === 'mindful' || s.styleMode === 'balanced') styleMode = s.styleMode;
      if (s.faithJourney === 'rooted' || s.faithJourney === 'notrightnow' || s.faithJourney === 'exploring') faithTier = s.faithJourney;
    }
  } catch {}
  try {
    const rawProfile = await AsyncStorage.getItem('pj_profile');
    if (rawProfile) {
      const p = JSON.parse(rawProfile);
      if (p.name) lines.push(`Name: ${p.name}`);
      if (p.calTarget) lines.push(`Calorie target: ${p.calTarget}`);
      if (p.macroProteinG || p.macroCarbsG || p.macroFatG) {
        const parts = [];
        if (p.macroProteinG) parts.push(`protein ${p.macroProteinG}g`);
        if (p.macroCarbsG) parts.push(`carbs ${p.macroCarbsG}g`);
        if (p.macroFatG) parts.push(`fat ${p.macroFatG}g`);
        if (parts.length) lines.push(`Macro goals: ${parts.join(', ')}`);
      } else if (p.macroProteinPct || p.macroCarbsPct || p.macroFatPct) {
        lines.push(`Macro split: protein ${p.macroProteinPct}% / carbs ${p.macroCarbsPct}% / fat ${p.macroFatPct}%`);
      }
      if (p.waterGoal) lines.push(`Water goal: ${p.waterGoal} oz`);
      if (p.stepGoal) lines.push(`Step goal: ${p.stepGoal}`);
      if (p.sleepGoal) lines.push(`Sleep goal: ${p.sleepGoal} hr`);
      if (p.weightGoal) lines.push(`Weight goal pace: ${p.weightGoal}`);
      if (p.goalWeight) lines.push(`Goal weight: ${p.goalWeight} lbs`);
    }
  } catch {}
  lines.unshift(`Coaching mode: ${styleMode}`, `Faith journey: ${faithTier}`);
  return { styleMode, faithTier, userContext: lines.join('\n') };
}

// The hardcoded crisis response (care + real resources, no scripture). Same as Halo's.
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

// Three pulsing dots shown while the assistant is composing a reply.
function TypingDots({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={[styles.bubble, styles.assistantBubble, { borderLeftColor: color }]}>
      <Animated.View style={{ flexDirection: 'row', gap: 5, opacity: a, paddingVertical: 2 }}>
        {[0, 1, 2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />)}
      </Animated.View>
    </View>
  );
}

export default function AssistantChat({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  // theme.accentBlue is already button-safe (theme bakes in the light-theme override), so filled
  // surfaces (send button, brand dot) read fine across themes.
  const accent = theme.accentBlue;

  const [messages, setMessages] = useState<Msg[]>(() => [{ role: 'assistant', text: pickGreeting() }]);
  const [input, setInput] = useState('');
  const [kb, setKb] = useState(0);
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<{ used: number; cap: number } | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const dragY = useSharedValue(0);

  // Load today's cached usage so the counter shows on open. Ignored if from an earlier UTC day.
  useEffect(() => {
    AsyncStorage.getItem(QUOTA_KEY)
      .then(raw => {
        if (!raw) return;
        const q = JSON.parse(raw);
        if (q && q.date === utcDay() && typeof q.used === 'number' && typeof q.cap === 'number') {
          setQuota({ used: q.used, cap: q.cap });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    }
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, e => {
      setKb(e.endCoordinates?.height ?? 0);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const h = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  const close = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => onClose());
  };

  const shareMessage = async (text: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try { await Share.share({ message: text }); } catch {}
  };

  // Thumbs-down saves the flagged exchange locally (append-only, read-then-merge). No external send.
  const saveReport = async (userMessage: string, reply: string) => {
    try {
      const raw = await AsyncStorage.getItem('pj_companion_reports');
      const all = raw ? JSON.parse(raw) : [];
      all.push({ ts: Date.now(), userMessage, reply });
      await AsyncStorage.setItem('pj_companion_reports', JSON.stringify(all));
    } catch {}
  };

  const setFeedback = (index: number, value: 'up' | 'down') => {
    const cur = messages[index];
    if (!cur) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const newVal = cur.feedback === value ? undefined : value;
    setMessages(prev => prev.map((m, k) => (k === index ? { ...m, feedback: newVal } : m)));
    if (!newVal) return;
    if (newVal === 'down') {
      let userMessage = '';
      for (let k = index - 1; k >= 0; k--) {
        if (messages[k].role === 'user') { userMessage = messages[k].text; break; }
      }
      saveReport(userMessage, cur.text);
    }
    showToast(newVal === 'up' ? 'Thanks for the feedback' : 'Thanks, this helps improve the assistant', undefined, 'success');
  };

  const resetChat = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Keyboard.dismiss();
    setInput('');
    setSending(false);
    setMessages([{ role: 'assistant', text: pickGreeting() }]);
  };

  const newChat = () => {
    const hasConversation = messages.length > 1 || input.trim().length > 0;
    if (!hasConversation) { resetChat(); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Start a new chat?',
      'This clears your current conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New Chat', style: 'destructive', onPress: resetChat },
      ],
    );
  };

  const persistQuota = (used: number, cap: number) => {
    setQuota({ used, cap });
    AsyncStorage.setItem(QUOTA_KEY, JSON.stringify({ date: utcDay(), used, cap })).catch(() => {});
  };

  const canSend = input.trim().length > 0 && !sending;

  const remaining = quota ? Math.max(0, quota.cap - quota.used) : null;
  const showQuota = !!quota && quota.used <= quota.cap;
  const quotaLow = remaining !== null && remaining <= 1;
  const quotaLabel =
    remaining === null ? ''
      : remaining === 0 ? "That's all for today. It resets tomorrow."
      : remaining === 1 ? '1 message left today. It resets tomorrow.'
      : `${remaining} of ${quota!.cap} messages left today.`;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    const history = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', text: m.text }));

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');

    // Client-side crisis short-circuit: never route a crisis to the AI; show the vetted hardcoded
    // response instantly, offline-safe.
    if (screenForCrisis(text).isCrisis) {
      triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
      setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      return;
    }

    setSending(true);

    try {
      const { styleMode, faithTier, userContext } = await loadUserContext();
      const callable = httpsCallable(getFunctions(app), 'appCompanion');
      const res = await callable({ message: text, history, styleMode, faithTier, userContext });
      const data = (res.data ?? {}) as { ok?: boolean; reply?: string; crisis?: boolean; message?: string; used?: number; cap?: number };

      if (typeof data.used === 'number' && typeof data.cap === 'number') {
        persistQuota(data.used, data.cap);
      }

      if (data.crisis) {
        setSending(false);
        triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
        setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      } else if (data.ok && data.reply) {
        setSending(false);
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply! }]);
      } else if (data.message) {
        setSending(false);
        setMessages(prev => [...prev, { role: 'system', text: data.message! }]);
      } else {
        setSending(false);
        setMessages(prev => [...prev, { role: 'system', text: 'Something went wrong. Please try again.' }]);
      }
    } catch (e) {
      setSending(false);
      const code = String((e as { code?: string })?.code ?? '');
      const msg = code.includes('unauthenticated')
        ? 'Please sign in to use the assistant.'
        : 'The assistant is resting. Please try again in a little bit.';
      setMessages(prev => [...prev, { role: 'system', text: msg }]);
    }
  };

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const panelScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  const closeFromDrag = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };
  const dragGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetY(-10)
    .onUpdate(e => { dragY.value = Math.max(0, e.translationY); })
    .onEnd(e => {
      if (e.translationY > 120 || e.velocityY > 800) {
        dragY.value = withTiming(900, { duration: 180 }, finished => { if (finished) runOnJS(closeFromDrag)(); });
      } else {
        dragY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.value }] }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Reanimated.View style={[{ flex: 1, marginTop: insets.top + 96 }, dragStyle]}>
          <Animated.View
            style={[
              styles.panel,
              { backgroundColor: theme.bgSheet, borderColor: theme.borderSheet, opacity: anim, transform: [{ scale: panelScale }] },
            ]}
          >
          <View style={{ flex: 1, paddingBottom: kb }}>
            <GestureDetector gesture={dragGesture}>
              <View>
                <Pressable onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); }} hitSlop={10} style={styles.handleWrap}>
                  <View style={[styles.handle, { backgroundColor: theme.textDim }]} />
                </Pressable>
                <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
                  <View style={styles.brandRow}>
                    <View style={[styles.brandDot, { backgroundColor: accent }]}>
                      <Ionicons name="sparkles" size={15} color="#ffffff" />
                    </View>
                    <View>
                      <Text style={[styles.brand, { color: theme.textPrimary }]}>Assistant</Text>
                      <Text style={[styles.brandSub, { color: theme.textDim }]}>Wellness and app guide</Text>
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    <Pressable onPress={newChat} hitSlop={12} style={styles.closeBtn}>
                      <Ionicons name="refresh" size={20} color={theme.textMuted} />
                    </Pressable>
                    <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
                      <Ionicons name="close" size={22} color={theme.textMuted} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </GestureDetector>

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
                const body = <Text style={[styles.bubbleText, { color: theme.textPrimary }]}>{m.text}</Text>;
                const isReply = m.role === 'assistant' && i > 0; // opening greeting gets no action row
                if (!isReply) {
                  return (
                    <View
                      key={i}
                      style={[
                        styles.bubble,
                        m.role === 'user'
                          ? { alignSelf: 'flex-end', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }
                          : [styles.assistantBubble, { borderLeftColor: accent }],
                      ]}
                    >
                      {body}
                    </View>
                  );
                }
                return (
                  <View key={i} style={styles.replyWrap}>
                    <View style={[styles.bubble, styles.assistantBubble, styles.replyBubble, { borderLeftColor: accent }]}>{body}</View>
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => shareMessage(m.text)} hitSlop={8} style={styles.actionBtn}>
                        <Ionicons name="share-outline" size={17} color={theme.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => setFeedback(i, 'up')} hitSlop={8} style={styles.actionBtn}>
                        <Ionicons name={m.feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'} size={17} color={m.feedback === 'up' ? theme.accentGreen : theme.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => setFeedback(i, 'down')} hitSlop={8} style={styles.actionBtn}>
                        <Ionicons name={m.feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'} size={17} color={m.feedback === 'down' ? theme.textSecondary : theme.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {sending && <TypingDots color={accent} />}
            </ScrollView>

            {showQuota && (
              <Text style={[styles.quota, { color: quotaLow ? accent : theme.textDim }]}>{quotaLabel}</Text>
            )}

            <View style={styles.inputBar}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                placeholder="Ask the assistant..."
                placeholderTextColor={theme.textPlaceholder}
                value={input}
                onChangeText={setInput}
                multiline
                onBlur={() => inputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
              />
              <Pressable
                onPress={send}
                disabled={!canSend}
                style={[styles.sendBtn, { backgroundColor: canSend ? accent : theme.bgInput, borderColor: canSend ? accent : theme.borderInput }]}
              >
                <Ionicons name="arrow-up" size={20} color={canSend ? '#ffffff' : theme.textDim} />
              </Pressable>
            </View>

            <Text style={[styles.disclaimer, { color: theme.textDim, paddingBottom: kb > 0 ? 10 : insets.bottom + 8 }]}>
              The assistant is AI and can make mistakes. Not a substitute for a doctor or professional.
            </Text>
          </View>
        </Animated.View>
        </Reanimated.View>

        <ToastRenderer />
      </GestureHandlerRootView>
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
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(120,120,140,0.10)',
    borderColor: 'rgba(120,120,140,0.22)',
    borderLeftWidth: 2.5,
  },
  bubbleText: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  replyWrap:   { alignSelf: 'flex-start', maxWidth: '86%', marginBottom: 10 },
  replyBubble: { maxWidth: '100%', marginBottom: 0 },
  actionRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2, paddingLeft: 2 },
  actionBtn:   { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
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
  quota:      { fontSize: 11, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.3, textAlign: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  input:      { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 20, paddingTop: 8, lineHeight: 14 },
});
