import { useRef, useState } from 'react';
import {
  Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEMES, mix } from '../../theme';
import { getModeAccentTints } from '../../utils/modeAccent';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { Type } from '../../typography';
import BackgroundLayers from '../../components/BackgroundLayers';
import PrimaryCTA from '../../components/PrimaryCTA';
import ButtonShine from '../../components/ButtonShine';
import GradientTitle from '../../components/GradientTitle';
import GradientNumber from '../../components/GradientNumber';
import { BlurView } from 'expo-blur';

const theme = THEMES['light'];
// Pinned to Balanced's accent, same as profile-setup -- see the note there. Keeps Steps 1-2 and the
// no-answers state of Your Style on one consistent color instead of the generic app blue.
const { accent: ACCENT, selected: ACCENT_SELECTED, bg: ACCENT_BG, border: ACCENT_BORDER } = getModeAccentTints('balanced', theme);

const QUESTIONS = [
  {
    id: 'q1',
    text: 'How do you want to feel at the end of a good day?',
    answers: [
      { label: 'Like I showed up for myself',  points: 1 },
      { label: 'Like I stuck to my plan',      points: 2 },
      { label: 'Like I hit my targets',        points: 3 },
    ],
  },
  {
    id: 'q2',
    text: 'How do you measure progress?',
    answers: [
      { label: 'By how I feel day to day',              points: 1 },
      { label: 'By whether I\'m showing up consistently', points: 2 },
      { label: 'By the numbers moving in the right direction', points: 3 },
    ],
  },
  {
    id: 'q3',
    text: 'How do you handle setbacks?',
    answers: [
      { label: 'I give myself grace',                          points: 1 },
      { label: 'I reset and keep going',                       points: 2 },
      { label: 'I figure out what went wrong and attack it differently', points: 3 },
    ],
  },
  {
    id: 'q4',
    text: 'How important is tracking numbers?',
    answers: [
      { label: 'Numbers stress me out',      points: 1 },
      { label: 'General awareness is fine',  points: 2 },
      { label: 'I want full visibility',     points: 3 },
    ],
  },
  {
    id: 'q5',
    text: 'When you miss a day, you usually...',
    answers: [
      { label: 'Don\'t stress, tomorrow is a fresh start',  points: 1 },
      { label: 'Log it and adjust the rest of the week',    points: 2 },
      { label: 'Push harder the next day to make up for it', points: 3 },
    ],
  },
];

// The answers are SHUFFLED per question, once per mount. They used to render in points order every time --
// grace/feel first, numbers/attack last -- so the third option was always the discipline answer and the
// survey telegraphed its own scoring. By question three you stop answering honestly and start picking a
// column, and an instrument that reveals its key measures nothing. Shuffled per question (not globally) so
// each question's order is independent, and once per mount so the options never move under your thumb.
// Seeded off nothing but Math.random: this runs at mount, never during a render pass.
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function scoreToMode(score: number): 'mindful' | 'balanced' | 'discipline' {
  if (score <= 8)  return 'mindful';
  if (score <= 12) return 'balanced';
  return 'discipline';
}

export default function StyleSurveyScreen() {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Shuffled ONCE per mount. In a ref, not in render: reshuffling on every keystroke/state change would
  // move the options under the user's thumb mid-tap.
  const questions = useRef(QUESTIONS.map(q => ({ ...q, answers: shuffle(q.answers) }))).current;
  const scaleAnims = useRef(
    QUESTIONS.map(() => [
      new Animated.Value(1),
      new Animated.Value(1),
      new Animated.Value(1),
    ])
  ).current;

  const handleSelect = (qIdx: number, aIdx: number, points: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setAnswers(prev => ({ ...prev, [questions[qIdx].id]: points }));
    // spring the selected answer
    const anim = scaleAnims[qIdx][aIdx];
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(anim,  { toValue: 1,    useNativeDriver: true, bounciness: 6 }),
    ]).start();
  };

  const allAnswered = isOnboardingPreview() || questions.every(q => answers[q.id] !== undefined);
  const totalScore  = Object.values(answers).reduce((a, b) => a + b, 0);

  const handleContinue = () => {
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: '/onboarding/your-style', params: { mode: 'balanced', score: '8' } }); return; }
    if (!allAnswered) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const mode = scoreToMode(totalScore);
    router.push({ pathname: '/onboarding/your-style', params: { mode, score: String(totalScore) } });
  };

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1 }}>
      <BackgroundLayers glow={ACCENT} />

      {/* Progress bar. Frosted chrome, absolute, glued to the top -- content scrolls under it. It answers
          "how much more of this is there", the one thing worth permanent screen space here; the title and
          subtitle are read once and are free to scroll away. */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12, borderBottomColor: theme.borderCard }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.backBtn, { backgroundColor: ACCENT_BG, borderColor: ACCENT_BORDER }]}
        >
          <Ionicons name="chevron-back" size={20} color={ACCENT} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
          <View style={[styles.progressFill, { backgroundColor: ACCENT, width: '33%' }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 2 OF 6</Text>
        <GradientTitle title="Let's find your style" color={ACCENT} style={styles.title} />
        {/* "Five", not "Four" -- there are five questions, and this was the first thing the screen told you. */}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Five questions. No wrong answers.
        </Text>

        {questions.map((q, qIdx) => {
          const selected = answers[q.id];
          return (
            <View key={q.id} style={styles.questionBlock}>
              <GradientNumber value={`${qIdx + 1}. ${q.text}`} color={theme.textSecondary} style={styles.questionText} />
              <View style={styles.answersCol}>
                {q.answers.map((a, aIdx) => {
                  const isSelected = selected === a.points;
                  return (
                    <Animated.View key={aIdx} style={{ transform: [{ scale: scaleAnims[qIdx][aIdx] }] }}>
                      <TouchableOpacity
                        onPress={() => handleSelect(qIdx, aIdx, a.points)}
                        activeOpacity={0.8}
                        style={[
                          styles.answerBtn,
                          {
                            // OPAQUE when selected. accentBlueBg is a ~10% tint, and this page now glows
                            // accent -- accent over accent is the mud we hit everywhere today, which is why
                            // the selected answer "blended in". The radio dot itself is fine and already
                            // established (Profile's Activity Level + Training Frequency rows use it).
                            backgroundColor: isSelected ? ACCENT_SELECTED : theme.bgInput,
                            borderColor:     isSelected ? ACCENT_BORDER : theme.borderInput,
                          },
                        ]}
                      >
                        {isSelected ? <ButtonShine radius={10} /> : null}
                        <View style={[
                          styles.answerDot,
                          {
                            borderColor:     isSelected ? ACCENT : theme.borderInput,
                            backgroundColor: isSelected ? ACCENT : 'transparent',
                          }
                        ]} />
                        <Text style={[
                          styles.answerText,
                          { color: isSelected ? ACCENT : theme.textSecondary }
                        ]}>
                          {a.label}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Continue footer. Frosted chrome (blur + chromeFill), like the tab bar -- it painted an opaque slab
          of gradientEnd, which was invisible only while the page was that same flat colour. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard, overflow: 'hidden' }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        {allAnswered && (
          <Text style={[styles.footerHint, { color: theme.textMuted }]}>
            {scoreToMode(totalScore) === 'mindful'    ? 'You lead with grace. That\'s a strength.' :
             scoreToMode(totalScore) === 'balanced'   ? 'You know how to meet yourself halfway.'   :
                                                        'You\'re built for results. Let\'s go.'}
          </Text>
        )}
        <PrimaryCTA
          label="See My Style"
          fill={ACCENT}
          disabled={!allAnswered}
          faceStyle={{ borderRadius: 14, paddingVertical: 18 }}
          onPress={handleContinue}
        />
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, overflow: 'hidden' },
  progressTrack:  { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 2 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content:        { padding: 24, paddingTop: 16 },
  screenLabel:    { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  // No textShadow -- a drop shadow on a display title is a trick nothing else in the app uses.
  title:          { fontSize: 36, fontFamily: Type.display, letterSpacing: 0.3, marginBottom: 6 },
  // VOICE: this is the app talking, not a label. See the fuller note in profile-setup.
  subtitle:       { fontSize: 15, fontFamily: Type.voice, lineHeight: 22, marginBottom: 28 },
  questionBlock:  { marginBottom: 28 },
  questionText:   { fontSize: 15, fontFamily: Type.uiSemibold, lineHeight: 22, marginBottom: 12 },
  answersCol:     { gap: 8 },
  // No shadow: these are selectable rows, not floating cards. Every one of them hovered.
  answerBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  answerDot:      { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  answerText:     { fontSize: 14, fontFamily: Type.uiMedium, flex: 1 },
  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  footerHint:     { fontSize: 12, fontFamily: Type.voice, textAlign: 'center', marginBottom: 10 },
});