import { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { THEMES } from '../../theme';

const theme = THEMES['light'];

const COMMITMENTS = [
  {
    number: '01',
    text: 'I will log honestly, even when it hurts to see the number.',
  },
  {
    number: '02',
    text: 'I will show up on the hard days, not just the easy ones.',
  },
  {
    number: '03',
    text: 'I will hold myself to the standard I set today.',
  },
];

const DISCIPLINE_COLOR = '#c2621a';

function CommitmentRow({
  item,
  confirmed,
  onConfirm,
  entranceAnim,
}: {
  item: typeof COMMITMENTS[0];
  confirmed: boolean;
  onConfirm: () => void;
  entranceAnim: { fade: Animated.Value; slide: Animated.Value };
}) {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const bgAnim     = useRef(new Animated.Value(0)).current;
  const checkAnim  = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.4)).current;

  const handlePress = () => {
    if (confirmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start();

    Animated.timing(bgAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();

    Animated.parallel([
      Animated.timing(checkAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
    ]).start();

    onConfirm();
  };

  const bgColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [`${DISCIPLINE_COLOR}08`, `${DISCIPLINE_COLOR}20`],
  });

  const borderColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [`${DISCIPLINE_COLOR}30`, `${DISCIPLINE_COLOR}70`],
  });

  return (
    <Animated.View style={{ opacity: entranceAnim.fade, transform: [{ translateY: entranceAnim.slide }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <Animated.View style={[styles.commitmentRow, { backgroundColor: bgColor, borderColor }]}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }], flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 16 }}>
            <Text style={[styles.commitmentNumber, { color: confirmed ? DISCIPLINE_COLOR : `${DISCIPLINE_COLOR}60` }]}>
              {item.number}
            </Text>
            <Text style={[styles.commitmentText, { color: confirmed ? theme.textPrimary : theme.textSecondary }]}>
              {item.text}
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: checkAnim, transform: [{ scale: checkScale }], marginLeft: 10 }}>
            <Ionicons name="checkmark-circle" size={22} color={DISCIPLINE_COLOR} />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CommitmentScreen() {
  const insets = useSafeAreaInsets();
  const [confirmed, setConfirmed] = useState([false, false, false]);
  const allConfirmed = confirmed.every(Boolean);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const lineAnims = COMMITMENTS.map(() => ({
    fade:  useRef(new Animated.Value(0)).current,
    slide: useRef(new Animated.Value(16)).current,
  }));

  const btnOpacity  = useRef(new Animated.Value(0.35)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    lineAnims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim.fade,  { toValue: 1, duration: 400, delay: 300 + i * 150, useNativeDriver: true }),
        Animated.timing(anim.slide, { toValue: 0, duration: 400, delay: 300 + i * 150, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  useEffect(() => {
    Animated.timing(btnOpacity, {
      toValue: allConfirmed ? 1 : 0.35,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [allConfirmed]);

  const handleConfirm = (index: number) => {
    setConfirmed(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const handleCommit = () => {
    if (!allConfirmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start(() => {
      router.push('/onboarding/faith-journey');
    });
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>

      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
          <View style={[styles.progressFill, { backgroundColor: DISCIPLINE_COLOR, width: '55%' }]} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: theme.textMuted }]}>DISCIPLINE</Text>
          <Text style={[styles.title, { color: DISCIPLINE_COLOR }]}>Make the{'\n'}Commitment.</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            This mode is for people who mean it.
          </Text>
        </Animated.View>

        <View style={styles.commitmentsContainer}>
          {COMMITMENTS.map((c, i) => (
            <CommitmentRow
              key={c.number}
              item={c}
              confirmed={confirmed[i]}
              onConfirm={() => handleConfirm(i)}
              entranceAnim={lineAnims[i]}
            />
          ))}
        </View>

        

      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.borderCard, backgroundColor: theme.gradientEnd }]}>
        <Animated.View style={{ transform: [{ scale: btnScale }], opacity: btnOpacity }}>
          <TouchableOpacity
            style={[styles.commitBtn, { backgroundColor: DISCIPLINE_COLOR }]}
            onPress={handleCommit}
            activeOpacity={1}
          >
            <Text style={styles.commitBtnText}>I'M IN.</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:          { paddingHorizontal: 24, paddingBottom: 8 },
  progressTrack:        { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:         { height: '100%', borderRadius: 2 },
  content:              { flex: 1, paddingHorizontal: 28, paddingTop: 36 },
  screenLabel:          { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  title:                { fontSize: 48, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, lineHeight: 50, marginBottom: 14 },
  subtitle:             { fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, lineHeight: 20, marginBottom: 8 },
  commitmentsContainer: { marginTop: 36, gap: 14 },
  commitmentRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 18 },
  commitmentNumber:     { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 26, minWidth: 28 },
  commitmentText:       { flex: 1, fontSize: 17, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 26 },
  footer:               { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  commitBtn:            { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  commitBtnText:        { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 4, color: '#ffffff' },
});