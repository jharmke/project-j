import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AMBER        = '#e8a020';
const AMBER_LIGHT  = '#f0b830';
const BG_TOP       = '#0d0a1a';
const BG_BOTTOM    = '#060410';
const CARD_BG      = '#12101e';

const EMBER_COLORS = ['#e8a020', '#f07020', '#f0a030', '#d4600a', '#f0b830'];

const FAITH_OPTIONS = [
  {
    key:   'rooted',
    title: 'Rooted',
    copy:  'Faith woven into every day. Verses, reflection, prayer. All front and center.',
    verse: '"You will seek me and find me, when you seek me with all your heart."',
    ref:   'Colossians 2:7',
    verse2: '"Rooted and built up in him, strengthened in the faith as you were taught, and overflowing with thankfulness."',
  },
  {
    key:   'exploring',
    title: 'Exploring',
    copy:  "Come as you are. Faith at your own pace. There's no wrong way to start.",
    verse: '"You will seek me and find me, when you seek me with all your heart."',
    ref:   'Jeremiah 29:13',
  },
  {
    key:   'notrightnow',
    title: 'Not Right Now',
    copy:  "We're glad you're here. These features are available whenever you need them, and this door never locks.",
    verse: '"Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come."',
    ref:   '2 Corinthians 5:17',
  },
];

// Correct KJV verses per card
const VERSES: Record<string, { text: string; ref: string }> = {
  rooted: {
    text: '"Rooted and built up in him, strengthened in the faith as you were taught, and overflowing with thankfulness."',
    ref:  'Colossians 2:7',
  },
  exploring: {
    text: '"You will seek me and find me, when you seek me with all your heart."',
    ref:  'Jeremiah 29:13',
  },
  notrightnow: {
    text: '"Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come."',
    ref:  '2 Corinthians 5:17',
  },
};

// --- Ember particle ---
function Ember({ delay, x, size, duration, color }: {
  delay: number; x: number; size: number; duration: number; color: string;
}) {
  const y       = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      y.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, {
            toValue: -SCREEN_HEIGHT * 0.85,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7,  duration: duration * 0.15, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.45, duration: duration * 0.65, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,    duration: duration * 0.2,  useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:    'absolute',
        bottom:      -10,
        left:        x,
        width:       size,
        height:      size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform:   [{ translateY: y }],
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius:  size * 2.5,
        shadowOffset:  { width: 0, height: 0 },
      }}
    />
  );
}

// --- Diamond icon ---
function Diamond({ filled, size = 9 }: { filled: boolean; size?: number }) {
  return (
    <View style={{
      width:  size,
      height: size,
      transform: [{ rotate: '45deg' }],
      backgroundColor: filled ? AMBER : 'transparent',
      borderWidth: 1.5,
      borderColor: filled ? AMBER : 'rgba(232,160,32,0.4)',
      marginTop: 2,
    }} />
  );
}

// --- Faith card ---
function FaithCard({
  option,
  selected,
  onSelect,
  entranceAnim,
}: {
  option: typeof FAITH_OPTIONS[0];
  selected: boolean;
  onSelect: () => void;
  entranceAnim: { fade: Animated.Value; slide: Animated.Value };
}) {
  const borderAnim  = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const breatheRef  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (selected) {
      Animated.timing(borderAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      breatheRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
          Animated.timing(breatheAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
        ])
      );
      breatheRef.current.start();
    } else {
      breatheRef.current?.stop();
      Animated.timing(borderAnim,  { toValue: 0, duration: 200, useNativeDriver: false }).start();
      Animated.timing(breatheAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
    return () => breatheRef.current?.stop();
  }, [selected]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start();
    onSelect();
  };

  const borderColor = breatheAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: selected
      ? ['rgba(232,160,32,0.6)', 'rgba(240,184,48,1.0)']
      : ['rgba(232,160,32,0.18)', 'rgba(232,160,32,0.18)'],
  });

  const bgColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [CARD_BG, 'rgba(232,160,32,0.07)'],
  });

  return (
    <Animated.View style={{ opacity: entranceAnim.fade, transform: [{ translateY: entranceAnim.slide }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <Animated.View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.titleRow}>
              <Diamond filled={selected} />
              <Text style={[styles.cardTitle, { color: selected ? AMBER_LIGHT : 'rgba(240,184,48,0.5)' }]}>
                {option.title}
              </Text>
            </View>
            <Text style={[styles.cardCopy, { color: selected ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.28)' }]}>
              {option.copy}
            </Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- Verse block ---
function VerseBlock({ selected }: { selected: string | null }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(8)).current;
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;

    // Fade out current, swap, fade in new
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 8, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShown(selected);
      Animated.parallel([
        Animated.timing(opacity,   { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }, [selected]);

  if (!shown) return null;

  const verse = VERSES[shown];
  if (!verse) return null;

  return (
    <Animated.View style={[styles.verseBlock, { opacity, transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.verseText}>{verse.text}</Text>
      <Text style={styles.verseRef}>{verse.ref}</Text>
      <Text style={[styles.changeNote, { color: 'rgba(255,255,255,0.2)' }]}>
        You can change this anytime in Settings.
      </Text>
    </Animated.View>
  );
}

// Stable ember config -- generated once, tighter delay ceiling
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  id:       i,
  x:        (Math.random() * (SCREEN_WIDTH - 14)) + 2,
  size:     2 + Math.random() * 5,
  duration: 5000 + Math.random() * 5000,
  delay:    i < 8 ? 0 : Math.random() * 2500, // first 8 fire immediately, rest staggered
  color:    EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)],
}));

export default function FaithJourneyScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const cardAnims = FAITH_OPTIONS.map(() => ({
    fade:  useRef(new Animated.Value(0)).current,
    slide: useRef(new Animated.Value(16)).current,
  }));

  const btnOpacity = useRef(new Animated.Value(0.3)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    cardAnims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim.fade,  { toValue: 1, duration: 500, delay: 400 + i * 180, useNativeDriver: true }),
        Animated.timing(anim.slide, { toValue: 0, duration: 500, delay: 400 + i * 180, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  useEffect(() => {
    Animated.timing(btnOpacity, {
      toValue: selected ? 1 : 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  const handleContinue = async () => {
    if (!selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1.0,  duration: 80, useNativeDriver: true }),
    ]).start(async () => {
      try {
        const existing = await AsyncStorage.getItem('pj_settings');
        const current  = existing ? JSON.parse(existing) : {};
        await AsyncStorage.setItem('pj_settings', JSON.stringify({
          ...current,
          faithJourney: selected,
        }));
      } catch (e) {
        console.log('Faith journey save error', e);
      }
      router.push('/onboarding/apple-health');
    });
  };

  return (
    <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={{ flex: 1 }}>

      {/* Embers */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {EMBERS.map(e => (
          <Ember key={e.id} x={e.x} size={e.size} duration={e.duration} delay={e.delay} color={e.color} />
        ))}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <View style={[styles.progressFill, { backgroundColor: AMBER, width: '70%' }]} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: 'rgba(232,160,32,0.45)' }]}>STEP 5 OF 7</Text>
          <Text style={[styles.title, {
            color: AMBER,
            textShadowColor:  'rgba(232,160,32,0.2)',
            textShadowRadius: 40,
            textShadowOffset: { width: 0, height: 0 },
          }]}>
            Your Faith{'\n'}Journey.
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.38)' }]}>
            No wrong answer. This shapes how Project J walks with you.
          </Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          {FAITH_OPTIONS.map((option, i) => (
            <FaithCard
              key={option.key}
              option={option}
              selected={selected === option.key}
              onSelect={() => setSelected(option.key)}
              entranceAnim={cardAnims[i]}
            />
          ))}
        </View>

        <VerseBlock selected={selected} />

      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: 'rgba(232,160,32,0.1)', backgroundColor: BG_BOTTOM }]}>
        <Animated.View style={{ transform: [{ scale: btnScale }], opacity: btnOpacity }}>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: AMBER }]}
            onPress={handleContinue}
            activeOpacity={1}
          >
            <Text style={styles.continueBtnText}>CONTINUE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:     { paddingHorizontal: 24, paddingBottom: 8 },
  progressTrack:   { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 2 },
  content:         { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  screenLabel:     { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 },
  title:           { fontSize: 52, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, lineHeight: 54, marginBottom: 12 },
  subtitle:        { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  cardsContainer:  { marginTop: 28, gap: 12 },
  card:            { borderWidth: 1, borderRadius: 16, padding: 18, minHeight: 88 },
  titleRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  cardTitle:       { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, lineHeight: 22 },
  cardCopy:        { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19, paddingLeft: 19 },
  verseBlock:      { marginTop: 24, paddingHorizontal: 4 },
  verseText:       { fontSize: 13, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 20, color: 'rgba(232,160,32,0.55)', textAlign: 'center' },
  verseRef:        { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: 'rgba(232,160,32,0.35)', textAlign: 'center', marginTop: 6, textTransform: 'uppercase' },
  changeNote:      { fontSize: 11, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 16 },
  footer:          { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  continueBtn:     { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  continueBtnText: { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3, color: '#0d0a1a' },
});