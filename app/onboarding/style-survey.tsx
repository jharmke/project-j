import { useRef, useState } from 'react';
import {
  Animated, ScrollView, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEMES } from '../../theme';

const theme = THEMES['light'];

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

function scoreToMode(score: number): 'mindful' | 'balanced' | 'discipline' {
  if (score <= 8)  return 'mindful';
  if (score <= 12) return 'balanced';
  return 'discipline';
}

export default function StyleSurveyScreen() {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const scaleAnims = useRef(
    QUESTIONS.map(() => [
      new Animated.Value(1),
      new Animated.Value(1),
      new Animated.Value(1),
    ])
  ).current;

  const handleSelect = (qIdx: number, aIdx: number, points: number) => {
    setAnswers(prev => ({ ...prev, [QUESTIONS[qIdx].id]: points }));
    // spring the selected answer
    const anim = scaleAnims[qIdx][aIdx];
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(anim,  { toValue: 1,    useNativeDriver: true, bounciness: 6 }),
    ]).start();
  };

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined);
  const totalScore  = Object.values(answers).reduce((a, b) => a + b, 0);

  const handleContinue = () => {
    if (!allAnswered) return;
    const mode = scoreToMode(totalScore);
    router.push({ pathname: '/onboarding/your-style', params: { mode, score: String(totalScore) } });
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>

      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.accentBlueRaw, width: '28%' }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 3 OF 7</Text>
        <Text style={[styles.title, { color: theme.accentBlueRaw }]}>Let's find your style</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Four questions. No wrong answers.
        </Text>

        {QUESTIONS.map((q, qIdx) => {
          const selected = answers[q.id];
          return (
            <View key={q.id} style={styles.questionBlock}>
              <Text style={[styles.questionText, { color: theme.textPrimary }]}>
                {qIdx + 1}. {q.text}
              </Text>
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
                            backgroundColor: isSelected ? theme.accentBlueBg  : theme.bgInput,
                            borderColor:     isSelected ? theme.accentBlueBorder : theme.borderInput,
                          },
                        ]}
                      >
                        <View style={[
                          styles.answerDot,
                          {
                            borderColor:     isSelected ? theme.accentBlueRaw : theme.borderInput,
                            backgroundColor: isSelected ? theme.accentBlueRaw : 'transparent',
                          }
                        ]} />
                        <Text style={[
                          styles.answerText,
                          { color: isSelected ? theme.accentBlue : theme.textSecondary }
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

      {/* Continue footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard }]}>
        {allAnswered && (
          <Text style={[styles.footerHint, { color: theme.textMuted }]}>
            {scoreToMode(totalScore) === 'mindful'    ? 'You lead with grace. That\'s a strength.' :
             scoreToMode(totalScore) === 'balanced'   ? 'You know how to meet yourself halfway.'   :
                                                        'You\'re built for results. Let\'s go.'}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            {
              backgroundColor: allAnswered ? theme.accentBlueRaw : theme.bgInput,
              borderWidth:     allAnswered ? 0 : 0.5,
              borderColor:     theme.borderInput,
            }
          ]}
          onPress={handleContinue}
          disabled={!allAnswered}
        >
          <Text style={[styles.continueBtnText, { color: allAnswered ? '#ffffff' : theme.textDim }]}>
            SEE MY STYLE
          </Text>
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:    { paddingHorizontal: 24, paddingBottom: 8 },
  progressTrack:  { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 2 },
  content:        { padding: 24, paddingTop: 16 },
  screenLabel:    { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  title:          { fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 6 },
  subtitle:       { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 28 },
  questionBlock:  { marginBottom: 28 },
  questionText:   { fontSize: 15, fontFamily: 'DMSans_600SemiBold', lineHeight: 22, marginBottom: 12 },
  answersCol:     { gap: 8 },
  answerBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  answerDot:      { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  answerText:     { fontSize: 14, fontFamily: 'DMSans_500Medium', flex: 1 },
  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, backgroundColor: theme.gradientEnd },
  footerHint:     { fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  continueBtn:    { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  continueBtnText:{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3 },
});