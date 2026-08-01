import { useEffect, useRef, useState } from 'react';
import { Text, TextInput } from '@/components/AppText';
import {
  Alert, Animated, Easing, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { barFillGradient } from '../utils/barGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@/components/AppIcons';
import ButtonShine from './ButtonShine';
import * as Haptics from 'expo-haptics';
import { triggerHaptic, triggerHapticNotification } from '@/utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from '../firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useMembership } from '../MembershipContext';
import { CRISIS_RESPONSE, screenForCrisis } from '../utils/faithCrisis';
import { buildCompanionStats } from '../utils/companionStats';
import { buildPRContextIfRelevant, buildExerciseNamesIfRelevant } from '../utils/companionPRs';
import { messageHitsWall, messageAsksForMore, messageBlocksPitch, messageAsksForExercises, workoutAskWantsMoreThanTwo, WALLS_BEFORE_PITCH } from '../utils/companionPitch';
import { buildWorkoutContextIfRelevant } from '../utils/companionWorkouts';
import { buildFoodContextIfRelevant } from '../utils/companionFood';
import { buildSleepContextIfRelevant } from '../utils/companionSleep';
import { buildBodyContextIfRelevant } from '../utils/companionBody';
import { buildAchievementsContextIfRelevant } from '../utils/companionAchievements';
import { buildJournalContextIfRelevant } from '../utils/companionJournal';
import { COMPANION_ROUTES, ROUTE_TRIGGERS } from '../utils/companionRoutes';
import { resolveDayRef, type DayRef } from '../utils/companionDayRef';
import { isDayRecall } from '../utils/companionWorkouts';
import { TUTORIAL_TRIGGERS, TUTORIAL_ROUTE_OVERLAP } from '../utils/companionTutorials';
import { useTutorial } from '../context/TutorialContext';
import { TAB_TUTORIALS } from '../data/tutorials';
import { ToastRenderer, useToast } from './Toast';
import GradientTitle from './GradientTitle';
import HeaderIconButton from './HeaderIconButton';
import { useTheme } from '../theme';
import NotificationPanel from './NotificationPanel';
import TutorialOverlay from './TutorialOverlay';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { useNotifications } from '../utils/notifications';
import { Type } from '../typography';

// The GENERAL Companion assistant's chat overlay (NOT Halo). Same panel UX as Halo's chat so the
// two feel like siblings, but re-skinned to the app THEME ACCENT and pointed at the deployed
// `appCompanion` Cloud Function (which enforces the daily cap + crisis backstop). No Scripture
// verification here: the assistant answers wellness + app-knowledge questions, not faith, so its
// replies are plain text. The crisis response is reused as-is (it is faith-neutral care + resources).

const CRISIS_RED = '#cc3333';

type StyleMode = 'discipline' | 'balanced' | 'mindful';
type FaithTier = 'rooted' | 'exploring' | 'notrightnow';

const GREETINGS = [
  "Hey, I'm Otto. What can I help you with?",
  "Hi, Otto here. Question about the app, your numbers, or where to start? Ask away.",
  "What's on your mind, food, training, sleep, or finding your way around the app?",
  "I'm here. Ask me how to do anything, or how you're tracking.",
  "Ready when you are. What would you like to figure out?",
];
const pickGreeting = () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

// Local cache of today's usage so the counter can show the moment the chat opens (the client
// cannot read the server's ai_usage_companion counter, which is locked down by the rules). The
// date is the server's UTC day, so a stale cache self-expires at the daily reset.
const QUOTA_KEY = 'pj_companion_quota';
// Remaining-messages count stays hidden until this many are left. Keep in sync with CompanionChat.
const QUOTA_VISIBLE_AT = 5;
const utcDay = () => new Date().toISOString().slice(0, 10);
const localTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Replace [[stat:key]] tokens in a reply with the guaranteed-correct value from the pack the client
// sent. An UNKNOWN key (the model referenced a stat that does not exist) is STRIPPED, never rendered
// as a number, so a missing value can never become a wrong one; unknown keys are logged to a dev key
// as the leak backstop. Also cleans the little artifacts a strip can leave (empty parens, doubled
// spaces, a space before punctuation), same as Halo's reference-strip cleanup.
function substituteStats(text: string, valueMap: Record<string, string>): string {
  const unknown: string[] = [];
  const out = text.replace(/\[\[stat:([a-zA-Z0-9_]+)\]\]/g, (_m, key: string) => {
    if (valueMap[key] !== undefined) return valueMap[key];
    unknown.push(key);
    return '';
  });
  const cleaned = out
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  if (unknown.length) {
    AsyncStorage.getItem('pj_companion_stat_flags')
      .then(raw => {
        const all = raw ? JSON.parse(raw) : [];
        all.push({ ts: Date.now(), unknown });
        return AsyncStorage.setItem('pj_companion_stat_flags', JSON.stringify(all.slice(-100)));
      })
      .catch(() => {});
  }
  return cleaned;
}

// Otto is instructed (system prompt) to reply in PLAIN TEXT, but Haiku occasionally emits markdown anyway
// (**bold**, `code`). The chat renders a plain Text node, so those characters show up raw. Strip them out
// rather than trust the model 100%. Conservative: unwrap **bold**/`code`, then drop any stray asterisks.
function stripInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

type Role = 'user' | 'assistant' | 'system' | 'crisis';
type Msg = { role: Role; text: string; feedback?: 'up' | 'down'; routes?: string[]; tutorials?: string[]; dayJump?: DayRef };

// Replace [[route:key]] tokens with the route's plain label inline (so the sentence still reads
// naturally) and collect the recognized keys so the client can render tappable pills below the
// reply. Unknown keys are stripped (a bad link can never navigate anywhere).
function substituteRoutes(text: string, question: string): { text: string; routes: string[]; tutorials: string[] } {
  const routes: string[] = [];
  // Strip the token from the text entirely (the model names the screen in words already) and just
  // collect the key for a pill below. Stripping avoids the "label typed twice" collision that inline
  // substitution caused when the model wrote both the token AND the screen name.
  const out = text.replace(/\[\[route:([a-zA-Z0-9_]+)\]\]/g, (_m, key: string) => {
    const r = COMPANION_ROUTES[key];
    if (r && !routes.includes(key)) routes.push(key);
    return '';
  });
  const cleaned = out
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  // Deterministic fallback: the model is unreliable about emitting route tokens, so also attach a
  // pill whenever the reply NAMES a known destination (it names screens in words every time). Caps
  // total pills so they never get noisy.
  const lower = cleaned.toLowerCase();
  for (const t of ROUTE_TRIGGERS) {
    if (routes.length >= 3) break;
    if (routes.includes(t.key)) continue;
    if (t.phrases.some(p => lower.includes(p))) routes.push(t.key);
  }
  // "Show me how" tutorial pills scan the USER'S QUESTION (their intent), NOT the reply. Scanning
  // the reply let an incidental mention hijack the pill: asking "how do I log food" surfaced the
  // BARCODE tutorial because the answer happened to mention scanning a barcode. The question is what
  // they actually want to learn. When a tutorial covers the same feature as a route pill, the route
  // pill is dropped (TUTORIAL_ROUTE_OVERLAP) so the user never gets both for one thing.
  const qLower = question.toLowerCase();
  const tutorials: string[] = [];
  for (const t of TUTORIAL_TRIGGERS) {
    if (tutorials.length >= 2) break;
    if (tutorials.includes(t.id)) continue;
    if (t.phrases.some(p => qLower.includes(p))) tutorials.push(t.id);
  }
  const dropRoutes = new Set(tutorials.map(id => TUTORIAL_ROUTE_OVERLAP[id]).filter(Boolean));
  const keptRoutes = routes.filter(k => !dropRoutes.has(k));
  // Combined cap of 3, tutorials prioritized (a walkthrough is more actionable than a jump).
  const cappedTutorials = tutorials.slice(0, 3);
  const keptRoutesCapped = keptRoutes.slice(0, Math.max(0, 3 - cappedTutorials.length));
  return { text: cleaned, routes: keptRoutesCapped, tutorials: cappedTutorials };
}

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
// Otto's little identity chip, sits to the left of each of his messages (matches the header brand dot).
const OTTO_AVATAR = 26;
function OttoAvatar({ accent }: { accent: string }) {
  return (
    <View style={{ width: OTTO_AVATAR, height: OTTO_AVATAR, borderRadius: OTTO_AVATAR / 2, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
      <ButtonShine radius={OTTO_AVATAR / 2} solid />
      <Ionicons name="sparkles" size={13} color="#ffffff" />
    </View>
  );
}

// Gentle mount animation for each message: fade + slide up as it lands.
function MountFade({ children }: { children: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

// Three dots that bounce in a STAGGERED wave (not in unison) so it clearly reads as "typing".
function TypingDots({ accent }: { accent: string }) {
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const dots = [d0, d1, d2];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={styles.ottoRow}>
      <OttoAvatar accent={accent} />
      <View style={[styles.bubble, styles.assistantBubble]}>
        <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 3, alignItems: 'center' }}>
          {dots.map((d, i) => (
            <Animated.View key={i} style={{
              width: 6, height: 6, borderRadius: 3, backgroundColor: accent,
              opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            }} />
          ))}
        </View>
      </View>
    </View>
  );
}

// Otto can be open on any screen, but a tutorial's targets live on its own tab. Resolve the tab a
// tutorial belongs to (from TAB_TUTORIALS) so the launcher can navigate there first; tutorials that
// push further (add-food, recipe-builder, etc.) do so via their own steps once on that tab.
const TUTORIAL_TAB_ROUTE: Record<string, string> = {
  home: '/(tabs)', log: '/(tabs)/log', workout: '/(tabs)/workout', stats: '/(tabs)/stats', profile: '/(tabs)/profile', settings: '/settings',
};
function tutorialTabRoute(id: string): string | null {
  for (const tab of Object.keys(TAB_TUTORIALS)) {
    if (TAB_TUTORIALS[tab].includes(id)) return TUTORIAL_TAB_ROUTE[tab] ?? null;
  }
  return null;
}

export default function AssistantChat({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { startTutorial, registerTutorialAction, unregisterTutorialAction, skipTutorial, activeState } = useTutorial();
  const bellRef = useTutorialTarget('notif_bell');
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  // theme.accentBlue is already button-safe (theme bakes in the light-theme override), so filled
  // surfaces (send button, brand dot) read fine across themes.
  const accent = theme.accentBlue;

  const [messages, setMessages] = useState<Msg[]>(() => [{ role: 'assistant', text: pickGreeting() }]);
  const [input, setInput] = useState('');
  // Keyboard following. Identical to Halo's -- the full history of what failed and why lives in
  // CompanionChat and is worth reading before touching this. Short version: a useState height
  // teleported; Reanimated's useAnimatedKeyboard does not track inside an RN <Modal>;
  // KeyboardAvoidingView cannot animate at all here because LayoutAnimation is disabled on iOS under
  // the New Architecture. A JS-driven animation is the only mechanism left, and the thing that made
  // the earlier one feel broken was its CURVE (an ease-in stalls at the start), not its thread.
  const kbPad = useRef(new Animated.Value(0)).current;
  // Boolean only, for the disclaimer -- the container is already padded by the keyboard height.
  const [kbUp, setKbUp] = useState(false);
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
    // Drives the padding, the disclaimer flag, and re-scrolling the latest message clear of the
    // keyboard on reopen.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    // Runs SHORTER than the keyboard's own reported duration on purpose: this cannot start until JS
    // receives the event, which is already after the keyboard began moving, so running the full
    // duration from a late start finishes late by that same margin. The finish is pulled in instead,
    // and the curve front-loads the travel so any remaining tail is too small to read as lag.
    // KB_FOLLOW is the one number to touch: LOWER is faster. Keep this in step with CompanionChat.
    const KB_FOLLOW = 0.7;
    const travel = (to: number, duration?: number) => {
      Animated.timing(kbPad, {
        toValue: to,
        duration: Math.min(Math.max((duration || 250) * KB_FOLLOW, 120), 250),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // paddingBottom is a layout prop; the native driver cannot carry it.
      }).start();
    };

    const s = Keyboard.addListener(showEvt, (e: any) => {
      setKbUp(true);
      travel(e?.endCoordinates?.height ?? 0, e?.duration);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const h = Keyboard.addListener(hideEvt, (e: any) => {
      setKbUp(false);
      travel(0, e?.duration);
    });
    return () => { s.remove(); h.remove(); };
  }, [kbPad]);

  const [notifOpen, setNotifOpen] = useState(false);
  const { unread } = useNotifications();
  // Reset the notification panel whenever Otto is dismissed, so it never re-opens stale.
  useEffect(() => { if (!visible) setNotifOpen(false); }, [visible]);

  // Notification-hub tour: is a step that lives inside Otto currently active? Drives the abort-on-
  // manual-dismiss guard below (so closing Otto mid-tour ends the tour instead of stranding it).
  const inOttoTourStep = !!(activeState?.tutorial.steps[activeState.stepIndex] as any)?.inOtto;
  // The tour opens the notification panel on cue. Inert unless the tour fires it.
  useEffect(() => {
    registerTutorialAction('openNotifPanelForTour', async () => {
      setNotifOpen(true);
      await new Promise(r => setTimeout(r, 380)); // let the panel spring in before the spotlight measures it
    });
    return () => unregisterTutorialAction('openNotifPanelForTour');
  }, [registerTutorialAction, unregisterTutorialAction]);

  const close = () => {
    if (inOttoTourStep) skipTutorial(); // user dismissed Otto mid-tour -> end the tour cleanly
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => onClose());
  };

  const shareMessage = async (text: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try { await Share.share({ message: text }); } catch {}
  };

  // Tapping a route pill: fade the chat out (same as close), then navigate to the destination.
  const openRoute = (key: string) => {
    const r = COMPANION_ROUTES[key];
    if (!r) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      onClose();
      if (r.params) router.push({ pathname: r.path as any, params: r.params });
      else router.push(r.path as any);
    });
  };

  // Tapping the day-jump pill: same close-then-navigate shape as a route pill, but carrying a DATE.
  // ⚠️ The route table cannot express this -- every entry there has fixed params -- which is why this is
  // its own handler rather than another COMPANION_ROUTES key.
  // ⚠️ `/day-detail` is a real registered route that renders the same content with a working back action,
  // but NOTHING in the app has ever navigated to it (Home and Stats both render Day Detail as a sheet).
  // This is the first caller. If it looks wrong as a full page, the alternative is opening Home with a
  // param and letting it raise its own sheet.
  const openDayDetail = (ref: DayRef) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      onClose();
      router.push({ pathname: '/day-detail' as any, params: { date: ref.date } });
    });
  };

  // Tapping a "Show me how" pill: fade the chat out, then launch the guided tutorial. The tour
  // self-navigates to its own screen via its steps, so we just start it. A short delay lets the
  // chat finish closing before the tutorial overlay takes over (mirrors the tutorials list launch).
  const openTutorial = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    const tabRoute = tutorialTabRoute(id);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      onClose();
      if (tabRoute) router.push(tabRoute as any);
      // Let the destination mount before the tour starts (it then drives navigation via its steps).
      setTimeout(() => { startTutorial(id); }, tabRoute ? 420 : 300);
    });
  };

  // Thumbs-down sends the flagged exchange to Justin.
  //
  // It used to append to a phone-only key (`pj_companion_reports`) that NOTHING in the codebase ever
  // read -- so a user flagged a bad answer, was told "this helps improve Otto", and it died on their
  // device. The toast made a promise the code did not keep. That local write is gone.
  //
  // Reuses the EXISTING app_feedback path rather than a new collection: a Cloud Function already
  // watches it and emails, so this needed no new collection, no security-rule change, no new function
  // and no deploy. `type` is what makes these filterable in the inbox if they ever get noisy.
  //
  // The QUESTION is sent alongside the reply on purpose -- a flagged answer is meaningless without
  // knowing what was asked. Fire-and-forget: a failed send must never block the UI or lose the tap,
  // and the user has already been thanked.
  const saveReport = async (userMessage: string, reply: string) => {
    try {
      if (!auth.currentUser) return;
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'app_feedback'), {
        type: 'Otto reply',
        description: `QUESTION:\n${userMessage || '(none captured)'}\n\nOTTO'S REPLY:\n${reply}`,
        photoUrl: null,
        userName: auth.currentUser.displayName ?? '',
        userEmail: auth.currentUser.email ?? '',
        appVersion: Constants.expoConfig?.version ?? '1.0',
        device: `${Platform.OS} ${Platform.Version}`,
        timestamp: serverTimestamp(),
      });
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
    showToast(newVal === 'up' ? 'Thanks for the feedback' : 'Thanks, this helps improve Otto', undefined, 'success');
  };

  const resetChat = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Keyboard.dismiss();
    setInput('');
    setSending(false);
    setMessages([{ role: 'assistant', text: pickGreeting() }]);
    // New conversation, new wall count. The weekly budget on the server is what stops this being a way to
    // farm pitches by starting fresh chats.
    wallCountRef.current = 0;
    pitchedRef.current = false;
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

  const { isSupporter } = useMembership();
  // Walls hit in THIS conversation. A ref, not state: nothing renders from it and it must not cause a
  // re-render mid-send. Resets with the chat, which is exactly what "once per conversation" means.
  const wallCountRef = useRef(0);
  // ⚠️ ONE PITCH PER CONVERSATION. The wall count only ever climbs, so once it passes three EVERY later
  // message would ask again and Otto could mention the plan three times in a single sitting, which is the
  // nagging the whole rule exists to prevent. The server tells us when he actually pitched (he does not
  // always take the opening on the exact message it is offered), and that shuts the request off for the rest
  // of this conversation. Resets with the chat, same as the wall count.
  const pitchedRef = useRef(false);

  const canSend = input.trim().length > 0 && !sending;

  const remaining = quota ? Math.max(0, quota.cap - quota.used) : null;
  // Only surface the counter once it is actually useful information. Always-on, it reads as a fuel gauge
  // and makes a helpful assistant feel metered; at 5 left it reads as a heads-up. Same rule on Halo.
  const showQuota = !!quota && quota.used <= quota.cap && remaining !== null && remaining <= QUOTA_VISIBLE_AT;
  const quotaLow = remaining !== null && remaining <= 1;
  const quotaLabel =
    remaining === null ? ''
      : remaining === 0 ? "That's all for today. Otto resets tomorrow."
      : remaining === 1 ? '1 message left today. Otto resets tomorrow.'
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

      // ─── THE FREE/PAID DATA GATE (THE PLAN item B; decided in SPEC_otto.md open item 1) ───
      // ⚠️ STRUCTURAL, NOT INSTRUCTIONAL. Free users are simply not SENT their logged data. Telling Otto to
      // "know but not say" is a wall made of willpower: models cave when pushed three times. If the numbers
      // were never sent there is nothing to leak, and no prompt trick can extract them.
      // The server enforces this again (appCompanion.ts) so a modified client cannot get round it.
      //
      // FREE STILL GETS: their goals/targets and coaching mode (userContext, above), ACHIEVEMENTS (the
      // retention engine, and four of its counters are faith progress), JOURNAL + PRAYERS (faith is never
      // paywalled), and the exercise-NAME list (a guardrail, not a perk).
      // FREE LOSES: the always-on snapshot, lift PRs, workout history, food history, sleep/recovery, and
      // body measurements.
      //
      // ⚠️ THE FREE EXTRAS TRAVEL IN THEIR OWN FIELD, not inside dataSnapshot. The server re-applies the
      // gate by discarding dataSnapshot for a non-Supporter, so anything that must survive for free users
      // cannot be smuggled inside it.
      let dataSnapshot: string | undefined;
      let freeContext: string | undefined;
      // ⚠️ STAYS EMPTY FOR FREE USERS ON PURPOSE. substituteStats STRIPS any [[stat:key]] whose key is not in
      // this map, so if Otto ever reaches for a number he was not given, the user sees nothing rather than a
      // wrong figure or raw bracket code. Belt and braces behind the prompt rules.
      let statValueMap: Record<string, string> = {};
      // ⚠️ ONE FLAG, TWO JOBS: it tells the server to attach the two-movement cap to THIS message, and it is
      // half of the wall check below. Attaching the cap only on workout messages is why it costs nothing on
      // the other nine messages of someone's day. Supporters are excluded here, and the server re-checks.
      const capsWorkout = !isSupporter && messageAsksForExercises(text);
      // Did they ask for MORE than two? Drives both the wall count and whether Otto says the limit line.
      const workoutCut = capsWorkout && workoutAskWantsMoreThanTwo(text);
      if (isSupporter) {
        // Fresh each message so mid-chat logging is reflected. Reuses the app's own calc utils, so
        // every number matches the coach/reports exactly (see utils/companionStats.ts).
        const pack = await buildCompanionStats(localTodayKey());
        statValueMap = pack.valueMap;
        // Only when the message is about PRs, attach the user's full lift-PR list to THIS request (kept
        // out of the always-on snapshot so it costs nothing on unrelated messages). See utils/companionPRs.
        const prCtx = await buildPRContextIfRelevant(text);
        const woCtx = await buildWorkoutContextIfRelevant(text);
        const foodCtx = await buildFoodContextIfRelevant(text);
        const sleepCtx = await buildSleepContextIfRelevant(text);
        const bodyCtx = await buildBodyContextIfRelevant(text);
        const achCtx = await buildAchievementsContextIfRelevant(text);
        const journalCtx = await buildJournalContextIfRelevant(text);
        const extraCtx = [prCtx, woCtx, foodCtx, sleepCtx, bodyCtx, achCtx, journalCtx].filter(Boolean).join('\n\n');
        dataSnapshot = extraCtx ? `${pack.snapshotText}\n\n${extraCtx}` : pack.snapshotText;
      } else {
        const achCtx = await buildAchievementsContextIfRelevant(text);
        const journalCtx = await buildJournalContextIfRelevant(text);
        const namesCtx = await buildExerciseNamesIfRelevant(text);
        freeContext = [achCtx, journalCtx, namesCtx].filter(Boolean).join('\n\n') || undefined;
        // ⚠️ `namesCtx` counts as a wall too. It fires when the user NAMES one of their own exercises, which
        // is a PR/training question ("how's my bench trending") -- a real wall, but one messageHitsWall
        // cannot see, because the PR detector needs their lift names and it does not have them. Missing this
        // meant three walls only ever counted as two and the pitch could never become eligible.
        // ⚠️ A CAPPED WORKOUT ANSWER IS A WALL TOO, but only when they asked for MORE than two -- ask for two
        // and get two and nothing was withheld. One increment maximum, so a message that is both a data
        // question and a workout ask still counts once, not twice.
        if (messageHitsWall(text) || namesCtx || workoutCut) wallCountRef.current += 1;
      }

      // ⚠️ A REQUEST, NOT A DECISION. The server still checks that they are a CONFIRMED free user and that
      // the weekly budget has room before Otto is told he may say anything. See SPEC_otto.md open item 4.
      // ⚠️ THE ONCE-PER-CONVERSATION LATCH APPLIES TO THE WALL TRIGGER ONLY. If they ASK about the plan, he
      // answers, every time -- a direct question deserves a real answer and stonewalling it is worse than a
      // second mention. Latching both would mean someone who asked "how much is it?" right after he brought
      // it up got nothing back.
      const pitchRequested =
        !isSupporter &&
        !messageBlocksPitch(text) &&
        (messageAsksForMore(text) || (wallCountRef.current >= WALLS_BEFORE_PITCH && !pitchedRef.current));
      const callable = httpsCallable(getFunctions(app), 'appCompanion');
      const res = await callable({ message: text, history, styleMode, faithTier, userContext, dataSnapshot, freeContext, pitchRequested, capsWorkout, workoutCut });
      const data = (res.data ?? {}) as { ok?: boolean; reply?: string; crisis?: boolean; message?: string; used?: number; cap?: number; pitched?: boolean };

      if (typeof data.used === 'number' && typeof data.cap === 'number') {
        persistQuota(data.used, data.cap);
      }

      // He mentioned the plan, so this conversation is done asking. Latches on only: a later message must
      // never turn it back off.
      if (data.pitched) pitchedRef.current = true;

      if (data.crisis) {
        setSending(false);
        triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
        setMessages(prev => [...prev, { role: 'crisis', text: '' }]);
      } else if (data.ok && data.reply) {
        setSending(false);
        // Substitute [[stat:key]] tokens with the exact values from the pack we sent (so any personal
        // number is the app's own number), then pull out [[route:key]] tokens into tappable pills.
        const { text: finalText, routes, tutorials } = substituteRoutes(substituteStats(data.reply!, statValueMap), text);
        // ⚠️ THE DAY JUMP IS COMPUTED FROM THE QUESTION, NOT THE REPLY, and by the APP, not Otto. He gets
        // dates wrong (asked on Sat 1 Aug what he did yesterday, he said "Friday, August 1st"), and on the
        // free plan he cannot see the data to check himself. Both tiers get the button: a Supporter still
        // gets the full answer above it, this is an addition and never a substitute.
        const dayJump = isDayRecall(text) ? (resolveDayRef(text, new Date()) ?? resolveDayRef('today', new Date())!) : undefined;
        setMessages(prev => [...prev, { role: 'assistant', text: stripInlineFormatting(finalText), routes, tutorials, dayJump }]);
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
        ? 'Please sign in to use Otto.'
        : 'Otto is resting. Please try again in a little bit.';
      setMessages(prev => [...prev, { role: 'system', text: msg }]);
    }
  };

  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const panelScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  const closeFromDrag = () => {
    if (inOttoTourStep) skipTutorial(); // dragged Otto away mid-tour -> end the tour cleanly
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
          {/* Theme gradient behind the whole chat, matching every other screen in the app (the chat modal
              was the one flat-white surface). Rendered at reduced opacity over the sheet base so it's a
              gentle wash, not the full-strength page gradient (chat bubbles are subtle, so the bg carries
              more weight here). Clipped by the panel's overflow:hidden rounded corners. */}
          <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} pointerEvents="none" />
          {/* Padding by the RAW keyboard height is correct and needs no offset: the panel's bottom edge
              is the screen's bottom edge. (KeyboardAvoidingView needed a keyboardVerticalOffset only
              because it derives its number from its own onLayout frame, measured relative to its
              parent, so the panel's top margin threw the maths off and it parked under the keyboard.) */}
          <Animated.View style={{ flex: 1, paddingBottom: kbPad }}>
            <GestureDetector gesture={dragGesture}>
              <View>
                <Pressable onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); close(); }} hitSlop={10} style={styles.handleWrap}>
                  <View style={[styles.handle, { backgroundColor: theme.textDim }]} />
                </Pressable>
                <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
                  <View style={styles.brandRow}>
                    <View style={[styles.brandDot, { backgroundColor: accent }]}>
                      <ButtonShine radius={15} solid />
                      <Ionicons name="sparkles" size={15} color="#ffffff" />
                    </View>
                    <View>
                      <GradientTitle title="Otto" color={accent} numberOfLines={1} style={styles.brand} />
                      <Text style={[styles.brandSub, { color: theme.textDim }]}>Wellness and app guide</Text>
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    <View ref={bellRef} collapsable={false}>
                      <HeaderIconButton icon="notifications" onPress={() => { Keyboard.dismiss(); setNotifOpen(true); }} />
                      {unread > 0 && <View style={[styles.bellDot, { backgroundColor: theme.statusBad, borderColor: theme.bgSheet }]} />}
                    </View>
                    <HeaderIconButton icon="refresh" onPress={newChat} />
                    <HeaderIconButton icon="close" onPress={close} />
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
                // HIS words wear the VOICE face; YOURS stay on interface. That contrast IS the point -- an
                // assistant who speaks in the same face as the app's chrome reads as the app talking to
                // itself. Same rule as Halo and the coach surfaces.
                // `selectable` gives iOS's own press-and-hold selection (magnifier, Copy, Look Up), so a
                // user can lift ONE sentence out of a reply instead of sharing the whole thing through
                // the share sheet. Costs nothing: it is a core Text prop, no package and no new build,
                // where a copy BUTTON would need expo-clipboard and therefore a native rebuild.
                // Safe here because nothing competes for the long-press: the bubble is a plain View, and
                // the panel's drag-to-dismiss wraps only the handle and header, not the message list.
                const body = <Text selectable style={[styles.bubbleText, m.role !== 'user' && { fontFamily: Type.voice }, { color: theme.textPrimary }]}>{m.text}</Text>;
                const isReply = m.role === 'assistant' && i > 0; // opening greeting gets no action row
                if (!isReply) {
                  if (m.role === 'user') {
                    return (
                      <MountFade key={i}>
                        <View style={[styles.bubble, { alignSelf: 'flex-end', backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
                          {body}
                        </View>
                      </MountFade>
                    );
                  }
                  // Otto greeting: avatar + bubble row.
                  return (
                    <MountFade key={i}>
                      <View style={styles.ottoRow}>
                        <OttoAvatar accent={accent} />
                        <View style={[styles.bubble, styles.assistantBubble, { flexShrink: 1 }]}>{body}</View>
                      </View>
                    </MountFade>
                  );
                }
                return (
                  <MountFade key={i}>
                  <View style={styles.ottoRow}>
                    <OttoAvatar accent={accent} />
                    <View style={styles.replyCol}>
                    <View style={[styles.bubble, styles.assistantBubble, styles.replyBubble]}>{body}</View>
                    {((m.routes && m.routes.length > 0) || (m.tutorials && m.tutorials.length > 0) || m.dayJump) && (
                      <View style={styles.pillRow}>
                        {/* The day jump leads: it is the most specific answer to "what did I do on X". Its
                            label carries the real date so the user sees WHICH day before tapping. */}
                        {m.dayJump && (
                          <Pressable onPress={() => openDayDetail(m.dayJump!)} style={[styles.pill, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
                            <Ionicons name="calendar" size={12} color={accent} />
                            <Text style={[styles.pillText, { color: accent }]}>{m.dayJump.label}</Text>
                          </Pressable>
                        )}
                        {m.tutorials?.map(id => {
                          const t = TUTORIAL_TRIGGERS.find(x => x.id === id);
                          if (!t) return null;
                          return (
                            <Pressable key={`tut-${id}`} onPress={() => openTutorial(id)} style={[styles.pill, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]}>
                              <Ionicons name="play-circle" size={13} color={theme.accentGreen} />
                              <Text style={[styles.pillText, { color: theme.accentGreen }]}>{t.label}</Text>
                            </Pressable>
                          );
                        })}
                        {m.routes?.map(k => {
                          const r = COMPANION_ROUTES[k];
                          if (!r) return null;
                          return (
                            <Pressable key={k} onPress={() => openRoute(k)} style={[styles.pill, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
                              <Ionicons name="arrow-forward" size={12} color={accent} />
                              <Text style={[styles.pillText, { color: accent }]}>{r.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
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
                    </View>
                  </MountFade>
                );
              })}
              {sending && <TypingDots accent={accent} />}
            </ScrollView>

            {showQuota && (
              <Text style={[styles.quota, { color: quotaLow ? accent : theme.textDim }]}>{quotaLabel}</Text>
            )}

            {/* Otto's free-user nudge. Copy locked in SPEC_monetization. Shown ONLY to a free user and
                ONLY at the wall (1 left / none left) -- never mid-conversation, never to a Supporter, and
                never on Halo (faith is never upcharged). This is the whole "never nag" rule in one place:
                the ask appears at the moment it's actually useful information, and nowhere else.
                Closes Otto BEFORE navigating (same fade-then-route pattern as openRoute above). It used to
                push /support with the sheet still mounted, leaving the chat sitting on top of the page it
                had just sent you to.
                The CTA half is bold + underlined because at the wall the quota line ALSO turns accent
                (deliberately, so the wall isn't abrupt) -- so without this the two lines are identical in
                colour, size and weight and read as one paragraph with nothing to suggest a tap target.
                paddingVertical (not hitSlop) grows the row to ~44pt: hitSlop would have reached down into
                the input bar and stolen taps from the send button. */}
            {showQuota && quotaLow && !isSupporter && (
              <Pressable
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  Keyboard.dismiss();
                  Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
                    onClose();
                    router.push('/support' as any);
                  });
                }}
                style={{ paddingVertical: 10 }}
                hitSlop={{ top: 2, bottom: 2, left: 12, right: 12 }}
              >
                <Text style={[styles.quota, { color: accent, paddingTop: 0, paddingBottom: 0 }]}>
                  Supporters get more time with Otto each day.{' '}
                  <Text style={{ fontFamily: Type.uiBold, textDecorationLine: 'underline' }}>Become a Supporter →</Text>
                </Text>
              </Pressable>
            )}

            <View style={styles.inputBar}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                placeholder="Ask Otto..."
                placeholderTextColor={theme.textPlaceholder}
                value={input}
                onChangeText={setInput}
                multiline
                onBlur={() => inputRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
              />
              {/* Molded when it's live: a flat accent disc was the only primary action in the app still
                  painted rather than gradient-filled. The disabled state stays flat on purpose -- the
                  gradient is what says "this does something now". */}
              <Pressable
                onPress={send}
                disabled={!canSend}
                style={[styles.sendBtn, { backgroundColor: canSend ? accent : theme.bgInput, borderColor: canSend ? accent : theme.borderInput, overflow: 'hidden' }]}
              >
                {canSend && (
                  <LinearGradient
                    colors={barFillGradient(accent)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Ionicons name="arrow-up" size={20} color={canSend ? '#ffffff' : theme.textDim} />
              </Pressable>
            </View>

            <Text style={[styles.disclaimer, { color: theme.textDim, paddingBottom: kbUp ? 10 : insets.bottom + 8 }]}>
              Otto is AI and can make mistakes. Not a substitute for a doctor or professional.
            </Text>
          </Animated.View>
        </Animated.View>
        </Reanimated.View>

        <ToastRenderer />

        <NotificationPanel
          visible={notifOpen}
          topOffset={insets.top + 96}
          onClose={() => setNotifOpen(false)}
          onNavigate={(route) => { close(); setTimeout(() => { try { router.push(route as any); } catch {} }, 200); }}
        />

        {/* Modal-scoped tutorial overlay: spotlights targets that live inside this Modal (the bell,
            the notification panel) for the notification-hub tour. Renders nothing unless an inOtto
            tour step is active, so it never affects normal Otto use. See TutorialOverlay `scope`. */}
        <TutorialOverlay scope="modal" />
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
  brand:     { fontSize: 22, fontFamily: Type.num, letterSpacing: 1.5 },
  brandSub:  { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginTop: -2 },
  closeBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellDot:   { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
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
  },
  bubbleText: { fontSize: 14, fontFamily: Type.ui, lineHeight: 20 },
  ottoRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  replyCol:    { flexShrink: 1, marginBottom: 10 },
  replyBubble: { maxWidth: '100%', marginBottom: 0 },
  actionRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2, paddingLeft: 2 },
  actionBtn:   { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 2 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  pillText:    { fontSize: 12, fontFamily: Type.uiSemibold },
  systemMsg:  { fontSize: 12, fontFamily: Type.ui, textAlign: 'center', alignSelf: 'center', maxWidth: '90%', marginVertical: 10, lineHeight: 17 },
  crisisCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  crisisMsg:      { fontSize: 14, fontFamily: Type.ui, lineHeight: 20 },
  crisisBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  crisisBtnLabel: { fontSize: 13, fontFamily: Type.uiSemibold },
  crisisBtnDetail:{ fontSize: 12, fontFamily: Type.ui, marginTop: 1 },
  crisisSmall:    { fontSize: 11, fontFamily: Type.ui, lineHeight: 16 },
  crisisClosing:  { fontSize: 13, fontFamily: Type.uiSemibold, textAlign: 'center', marginTop: 2 },
  quota:      { fontSize: 11, fontFamily: Type.uiSemibold, letterSpacing: 0.3, textAlign: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  inputBar:   { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 6 },
  input:      { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: Type.ui },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { fontSize: 10, fontFamily: Type.ui, textAlign: 'center', paddingHorizontal: 20, paddingTop: 8, lineHeight: 14 },
});
