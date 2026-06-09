import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Keyboard, Linking, Modal, Platform, Pressable,
  ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { router } from 'expo-router';
import { app } from '../firebaseConfig';
import { CRISIS_RESPONSE, screenForCrisis } from '../utils/faithCrisis';
import {
  extractReferences, validateStructure, verifyReferencesInText,
  type VerifyResult, type VerifyStatus, type VerseRef,
} from '../utils/faithVerse';
import { fetchChapter } from '../data/bible-web';
import { ToastRenderer, useToast } from './Toast';
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

// Opener for a MANAGED conversation. A devotional (seedContext carries the day's question) gets a
// pointed, warm opener that names the passage and poses the question; anything else gets a normal
// greeting. The opener sits in history, so Halo itself is anchored to the devotional from message one.
const openerFor = (ctx?: { ref: string; note?: string } | null): string =>
  ctx?.note
    ? `Let's reflect on ${ctx.ref} together.\n\n${ctx.note}\n\nShare whatever comes to mind, or ask me anything about the passage.`
    : pickGreeting();

// Local cache of today's message usage so the counter can show the moment Halo opens (the
// client cannot read the server's ai_usage counter, which is locked down by the rules).
// The date is the server's UTC day, so a stale cache self-expires at the daily reset.
const QUOTA_KEY = 'pj_halo_quota';
const utcDay = () => new Date().toISOString().slice(0, 10);

type Role = 'user' | 'halo' | 'system' | 'crisis';
// A Halo reply renders as segments so VERIFIED Scripture references become tappable links
// while fabricated ones are stripped (see buildSegments). Plain text stays plain text.
type Segment =
  | { type: 'text'; value: string }
  | { type: 'ref'; value: string; ref: VerseRef; realText: string | null };
type Msg = { role: Role; text: string; segments?: Segment[]; feedback?: 'up' | 'down'; sent?: string };

// Light cleanup for the gap a stripped (fabricated) reference can leave: empty parens, a
// space before punctuation, or a doubled space. A safe no-op on normal prose.
function cleanStripArtifacts(s: string): string {
  return s
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

// Turn a reply + its verification results into render segments. Verified and unavailable
// (structurally real) references become tappable links; invalid ones are stripped. Text
// left touching by a strip is merged and cleaned so the sentence still reads naturally.
function buildSegments(original: string, results: VerifyResult[]): { text: string; segments: Segment[] } {
  const sorted = [...results].sort((a, b) => a.ref.index - b.ref.index);
  const raw: Segment[] = [];
  let cursor = 0;
  for (const r of sorted) {
    const start = r.ref.index;
    const end = start + r.ref.raw.length;
    if (start < cursor) continue; // overlap guard
    if (start > cursor) raw.push({ type: 'text', value: original.slice(cursor, start) });
    if (r.status === 'verified' || r.status === 'unavailable') {
      raw.push({ type: 'ref', value: r.ref.raw, ref: r.ref, realText: r.realText });
    }
    // invalid_reference / invalid_verse: emit nothing (strip the fabricated citation).
    cursor = end;
  }
  if (cursor < original.length) raw.push({ type: 'text', value: original.slice(cursor) });

  // Merge adjacent text segments (a strip can leave two touching), then clean each.
  const merged: Segment[] = [];
  for (const s of raw) {
    const last = merged[merged.length - 1];
    if (s.type === 'text' && last && last.type === 'text') last.value += s.value;
    else merged.push({ ...s });
  }
  for (const s of merged) if (s.type === 'text') s.value = cleanStripArtifacts(s.value);

  const text = merged.map(s => s.value).join('');
  return { text, segments: merged.length ? merged : [{ type: 'text', value: text }] };
}

// Verify Halo's Scripture before it renders so nothing fabricated or misquoted is ever shown.
async function buildVerifiedReply(reply: string): Promise<{ text: string; segments: Segment[] }> {
  try {
    const results = await verifyReferencesInText(reply, fetchChapter);
    return buildSegments(reply, results);
  } catch {
    // Defensive offline fallback: still strip fabricated books/chapters (no network needed),
    // just without the verse-number/wording check or tappable links.
    try {
      const results: VerifyResult[] = extractReferences(reply).map(ref => {
        const { bookValid, chapterValid } = validateStructure(ref);
        const status: VerifyStatus = bookValid && chapterValid ? 'unavailable' : 'invalid_reference';
        return { ref, status, realText: null };
      });
      return buildSegments(reply, results);
    } catch {
      return { text: reply, segments: [{ type: 'text', value: reply }] };
    }
  }
}

// A small Latin cross, used in Halo's gold badge so it matches the FAB. Exported so other faith
// surfaces (e.g. the devotional "Reflect with Halo" entry) can carry the same identity.
export function MiniCross({ size, color }: { size: number; color: string }) {
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

export default function CompanionChat({
  visible, onClose, seedContext, threadKey, initialThread, onThreadChange,
}: {
  visible: boolean;
  onClose: () => void;
  seedContext?: { ref: string; note?: string } | null;
  // Devotional integration (all optional, so existing callers are unchanged): threadKey marks a
  // MANAGED conversation that re-seeds from initialThread on each open (instead of the in-memory
  // persistence the FAB uses); initialThread resumes a saved conversation; onThreadChange reports
  // the live turns so the parent can persist them (e.g. to a devotional day in pj_devotionals).
  threadKey?: string;
  initialThread?: { role: 'user' | 'halo'; text: string }[];
  onThreadChange?: (turns: { role: 'user' | 'halo'; text: string }[]) => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Msg[]>(() => [{ role: 'halo', text: pickGreeting() }]);
  const [input, setInput] = useState('');
  const [kb, setKb] = useState(0); // keyboard height when shown
  const [sending, setSending] = useState(false);
  const [tier, setTier] = useState<'rooted' | 'exploring'>('exploring');
  const [attachedContext, setAttachedContext] = useState<{ ref: string; note?: string } | null>(null); // verse/passage brought in as context
  const [quota, setQuota] = useState<{ used: number; cap: number } | null>(null); // today's message usage, from the server

  const anim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const dragY = useSharedValue(0); // drag-to-dismiss offset (Reanimated)
  const seededKeyRef = useRef<string | null>(null); // last managed threadKey seeded into messages

  // Faith tier drives Halo's posture (Rooted speaks as a fellow believer, Exploring is gentler).
  useEffect(() => {
    AsyncStorage.getItem('pj_settings')
      .then(raw => {
        const t = raw ? JSON.parse(raw).faithJourney : null;
        setTier(t === 'rooted' ? 'rooted' : 'exploring');
      })
      .catch(() => {});
  }, []);

  // Load today's cached usage so the counter shows on open (e.g. a free user at 4 of 5 sees
  // the heads-up immediately, even after an app restart). Ignored if the cache is from an
  // earlier UTC day (the server has reset the count by then).
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
      dragY.value = 0; // reset any prior drag offset so every open starts at rest
      // Managed conversations (a devotional) carry their context in Halo's opener, not a chip, so
      // the chip never reappears on reopen and nothing redundant gets re-injected. Unmanaged opens
      // (the Bible verse banner) still get the dismissible "Discussing {ref}" chip.
      setAttachedContext(threadKey != null ? null : (seedContext ?? null));
      // Managed conversations (a devotional day) re-seed from the saved thread on each open, so
      // reopening shows what was saved. Unmanaged callers (the FAB) keep their in-memory thread.
      if (threadKey != null && seededKeyRef.current !== threadKey) {
        seededKeyRef.current = threadKey;
        setMessages(
          initialThread && initialThread.length
            ? initialThread.map(t => ({ role: t.role, text: t.text } as Msg))
            : [{ role: 'halo', text: openerFor(seedContext) }],
        );
      }
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    } else {
      seededKeyRef.current = null; // re-seed (picking up newly saved turns) on the next open
    }
  }, [visible]);

  // Report the live conversation up so a managed parent can persist it (e.g. to a devotional day).
  // Only once there is a real user turn, so an unsent greeting never saves an empty thread. No-op
  // without onThreadChange, so unmanaged callers are unaffected.
  useEffect(() => {
    if (!onThreadChange) return;
    const turns = messages
      .filter(m => m.role === 'user' || m.role === 'halo')
      .map(m => ({ role: m.role as 'user' | 'halo', text: m.text }));
    if (turns.some(t => t.role === 'user')) onThreadChange(turns);
  }, [messages]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, e => {
      setKb(e.endCoordinates?.height ?? 0);
      // Re-scroll so the latest message clears the keyboard when it REOPENS. The content
      // size does not change here (only the bottom padding does), so onContentSizeChange
      // would not fire on its own; scroll after a beat so the new padding lays out first.
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

  // Open a VERIFIED verse in the Bible reader: fade the chat out (same as the X), then route
  // to the reader at that passage through its existing verseRef param path (navigateToRef).
  const openRef = (seg: Extract<Segment, { type: 'ref' }>) => {
    const { ref, realText } = seg;
    if (!ref.book) return;
    const refStr = `${ref.book} ${ref.chapter}:${ref.verseStart}${ref.verseEnd ? `-${ref.verseEnd}` : ''}`;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      onClose();
      const params: Record<string, string> = { verseRef: refStr };
      if (realText && !ref.verseEnd) params.verseText = realText; // single verse only
      router.push({ pathname: '/bible', params });
    });
  };

  // Share a reply via the native share sheet (which includes Copy on iOS), so copy + share
  // are one tap with no extra dependency. Shares the clean, verified text.
  const shareMessage = async (text: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: text });
    } catch {}
  };

  // Thumbs-down is the content-report hook: save the flagged exchange locally (append-only,
  // read-then-merge). No external send yet; wiring to a review sink is a deferred follow-up.
  const saveReport = async (userMessage: string, haloReply: string) => {
    try {
      const raw = await AsyncStorage.getItem('pj_halo_reports');
      const all = raw ? JSON.parse(raw) : [];
      all.push({ ts: Date.now(), tier, userMessage, haloReply });
      await AsyncStorage.setItem('pj_halo_reports', JSON.stringify(all));
    } catch {}
  };

  // Up/down toggles per reply. Setting either fires a thank-you toast; tapping the active one
  // again clears it silently. Down also captures the exchange for review.
  const setFeedback = (index: number, value: 'up' | 'down') => {
    const cur = messages[index];
    if (!cur) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const newVal = cur.feedback === value ? undefined : value;
    setMessages(prev => prev.map((m, k) => (k === index ? { ...m, feedback: newVal } : m)));
    if (!newVal) return; // toggled off
    if (newVal === 'down') {
      let userMessage = '';
      for (let k = index - 1; k >= 0; k--) {
        if (messages[k].role === 'user') { userMessage = messages[k].text; break; }
      }
      saveReport(userMessage, cur.text);
    }
    showToast(newVal === 'up' ? 'Thanks for the feedback' : 'Thanks, this helps improve Halo', undefined, 'success');
  };

  // The actual wipe: clears the thread back to a fresh greeting. Heavy haptic because it
  // is destructive (the in-memory conversation is gone).
  const resetChat = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Keyboard.dismiss();
    setInput('');
    setSending(false);
    setMessages([{ role: 'halo', text: pickGreeting() }]);
  };

  const newChat = () => {
    // Nothing to lose yet (only Halo's opening greeting, no typed text): just reset, no nag.
    const hasConversation = messages.length > 1 || input.trim().length > 0;
    if (!hasConversation) { resetChat(); return; }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Start a new chat?',
      'This clears your current conversation with Halo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'New Chat', style: 'destructive', onPress: resetChat },
      ],
    );
  };

  // Update the counter state and cache it for next open (read-then-set; the server is the
  // source of truth, this is just a display cache that self-expires by date).
  const persistQuota = (used: number, cap: number) => {
    setQuota({ used, cap });
    AsyncStorage.setItem(QUOTA_KEY, JSON.stringify({ date: utcDay(), used, cap })).catch(() => {});
  };

  const canSend = input.trim().length > 0 && !sending;

  // Message counter + soft heads-up. Hidden until the first reply this session, and hidden
  // for unlimited/dev accounts (where used climbs past cap). Goes gold at the last message
  // so the daily wall is never abrupt.
  const remaining = quota ? Math.max(0, quota.cap - quota.used) : null;
  const showQuota = !!quota && quota.used <= quota.cap;
  const quotaLow = remaining !== null && remaining <= 1;
  const quotaLabel =
    remaining === null ? ''
      : remaining === 0 ? "That's all for today. Halo resets tomorrow."
      : remaining === 1 ? '1 message left today. It resets tomorrow.'
      : `${remaining} of ${quota!.cap} messages left today.`;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);

    // If a verse is attached (brought from the Bible reader), send Halo the REFERENCE as
    // context. Only the reference travels, never the verse text, so scripture never enters
    // the crisis screen (lament passages carry death language by nature).
    const ctx = attachedContext;
    const outbound = ctx
      ? ctx.note
        ? `For context, I'm reading ${ctx.ref} as part of today's devotional. ${text}`
        : `For context, I'm reading ${ctx.ref} and would like to talk about it. ${text}`
      : text;

    // History the model sees: prior real turns only (skip system notices and crisis cards).
    // User turns carry what was actually SENT (with any context) so Halo keeps the thread.
    const history = messages
      .filter(m => m.role === 'user' || m.role === 'halo')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.role === 'user' ? (m.sent ?? m.text) : m.text }));

    setMessages(prev => [...prev, ctx ? { role: 'user', text, sent: outbound } : { role: 'user', text }]);
    setInput('');
    setAttachedContext(null);

    // Client-side crisis short-circuit (layer 1): never route a crisis to the AI; show
    // the vetted hardcoded response instantly, offline-safe.
    if (screenForCrisis(text).isCrisis) {
      triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
      setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      return;
    }

    setSending(true);

    try {
      const callable = httpsCallable(getFunctions(app), 'faithCompanion');
      const res = await callable({ message: outbound, tier, history });
      const data = (res.data ?? {}) as { ok?: boolean; reply?: string; crisis?: boolean; reason?: string; message?: string; used?: number; cap?: number };

      // Track today's usage for the counter. Present on a real reply and on the daily-limit
      // response; absent on crisis/resting (those are refunded, so usage is unchanged).
      if (typeof data.used === 'number' && typeof data.cap === 'number') {
        persistQuota(data.used, data.cap);
      }

      if (data.crisis) {
        setSending(false);
        triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
        setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      } else if (data.ok && data.reply) {
        // Verify Scripture BEFORE rendering so nothing fabricated ever flashes. Typing dots
        // stay up for the extra beat (usually instant; one fetch worst case).
        const built = await buildVerifiedReply(data.reply);
        setSending(false);
        setMessages(prev => [...prev, { role: 'halo', text: built.text, segments: built.segments }]);
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
        ? 'Please sign in to talk with Halo.'
        : 'Halo is resting. Please try again in a little bit.';
      setMessages(prev => [...prev, { role: 'system', text: msg }]);
    }
  };

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const panelScale      = anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  // Drag-to-dismiss: a Pan on the top strip translates the panel down; past a threshold (or
  // a fast flick) it slides off and closes, otherwise it springs back. Only downward drags
  // engage, so taps on the handle / header buttons still work.
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
        {/* Dim backdrop, tap to close. */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Drag wrapper (Reanimated translateY) holds the open/close panel (RN Animated). */}
        <Reanimated.View style={[{ flex: 1, marginTop: insets.top + 96 }, dragStyle]}>
          <Animated.View
            style={[
              styles.panel,
              {
                backgroundColor: theme.bgSheet,
                borderColor: theme.borderSheet,
                opacity: anim,
                transform: [{ scale: panelScale }],
              },
            ]}
          >
          <View style={{ flex: 1, paddingBottom: kb }}>
            {/* Top strip: drag down to dismiss, tap the handle to close. */}
            <GestureDetector gesture={dragGesture}>
              <View>
                <Pressable onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); }} hitSlop={10} style={styles.handleWrap}>
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
                  <Ionicons name="refresh" size={20} color={theme.textMuted} />
                </Pressable>
                <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </Pressable>
              </View>
                </View>
                </View>
              </GestureDetector>

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
                const body = (
                  <Text style={[styles.bubbleText, { color: theme.textPrimary }]}>
                    {m.segments
                      ? m.segments.map((s, j) =>
                          s.type === 'ref' ? (
                            <Text key={j} onPress={() => openRef(s)} style={styles.verseLink}>{s.value}</Text>
                          ) : (
                            <Text key={j}>{s.value}</Text>
                          ),
                        )
                      : m.text}
                  </Text>
                );
                // A real Halo reply (carries verified segments) gets an action row; the opening
                // greeting and the user's own messages do not.
                const isReply = m.role === 'halo' && !!m.segments;
                if (!isReply) {
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
                      {body}
                    </View>
                  );
                }
                return (
                  <View key={i} style={styles.replyWrap}>
                    <View style={[styles.bubble, styles.haloBubble, styles.replyBubble]}>{body}</View>
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => shareMessage(m.text)} hitSlop={8} style={styles.actionBtn}>
                        <Ionicons name="share-outline" size={17} color={theme.textMuted} />
                      </Pressable>
                      <Pressable onPress={() => setFeedback(i, 'up')} hitSlop={8} style={styles.actionBtn}>
                        <Ionicons
                          name={m.feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'}
                          size={17}
                          color={m.feedback === 'up' ? theme.accentGreen : theme.textMuted}
                        />
                      </Pressable>
                      <Pressable onPress={() => setFeedback(i, 'down')} hitSlop={8} style={styles.actionBtn}>
                        <Ionicons
                          name={m.feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'}
                          size={17}
                          color={m.feedback === 'down' ? theme.textSecondary : theme.textMuted}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {sending && <TypingDots />}
            </ScrollView>

            {/* Attached verse chip (when brought from the Bible reader). Dismissible: the
                offer can always be waved off, matching the scalpel-not-default context rule. */}
            {attachedContext && (
              <View style={[styles.contextChip, { backgroundColor: 'rgba(232,160,32,0.12)', borderColor: 'rgba(232,160,32,0.32)' }]}>
                <MiniCross size={12} color={GOLD} />
                <Text style={[styles.contextChipText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {attachedContext.note ? 'Reflecting on' : 'Discussing'} {attachedContext.ref}
                </Text>
                <Pressable onPress={() => setAttachedContext(null)} hitSlop={8} style={styles.contextChipClose}>
                  <Ionicons name="close" size={13} color={theme.textMuted} />
                </Pressable>
              </View>
            )}

            {/* Message counter / soft heads-up (gold on the last message). */}
            {showQuota && (
              <Text style={[styles.quota, { color: quotaLow ? GOLD : theme.textDim }]}>{quotaLabel}</Text>
            )}

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
        </Reanimated.View>

        {/* Toast layer ABOVE the modal (RN modals are a separate native window). */}
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
  haloBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232,160,32,0.12)',
    borderColor: 'rgba(232,160,32,0.32)',
    borderLeftColor: GOLD,
    borderLeftWidth: 2.5,
  },
  bubbleText: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  verseLink:  { color: GOLD, fontFamily: 'DMSans_600SemiBold', textDecorationLine: 'underline' },
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
  contextChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: 12, marginBottom: 2, marginTop: 2, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1 },
  contextChipText:  { fontSize: 12, fontFamily: 'DMSans_600SemiBold', maxWidth: 220 },
  contextChipClose: { padding: 2 },
  quota:      { fontSize: 11, fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.3, textAlign: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  input:      { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 10, fontFamily: 'DMSans_400Regular', textAlign: 'center', paddingHorizontal: 20, paddingTop: 8, lineHeight: 14 },
});
