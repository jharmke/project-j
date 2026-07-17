import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../../utils/storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { isOnboardingPreview } from '../../utils/onboardingPreview';
import { Type, numLine } from '../../typography';
import { mix } from '../../theme';
import PrimaryCTA from '../../components/PrimaryCTA';
import { BlurView } from 'expo-blur';

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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
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

  // Selected was amber at SEVEN PERCENT -- next to nothing. The border did all the work of saying "chosen".
  const bgColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [CARD_BG, mix(AMBER, CARD_BG, 0.16)],
  });

  return (
    <Animated.View style={{ opacity: entranceAnim.fade, transform: [{ translateY: entranceAnim.slide }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <Animated.View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
          {/* NO SHINE. Tried it at Justin's push and he called it: too much. These are SELECTORS, and the
              shine system's own rule is that selectors get selected/unselected STATES, not gloss -- the
              gloss read as a plastic strip laid over a card that already breathes. The opaque amber fill
              plus the pulsing border is the whole treatment. Do not re-add. */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={styles.titleRow}>
              <Diamond filled={selected} />
              <Text style={[styles.cardTitle, { color: selected ? AMBER_LIGHT : 'rgba(240,184,48,0.7)' }]}>
                {option.title}
              </Text>
            </View>
            {/* Unselected copy was 28% white -- under the floor even on black. */}
            <Text style={[styles.cardCopy, { color: selected ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)' }]}>
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
      <Text style={[styles.changeNote, { color: 'rgba(255,255,255,0.45)' }]}>
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

  const handleContinue = async () => {
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/apple-health'); return; }
    if (!selected) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await AsyncStorage.getItem('pj_settings');
      const current  = existing ? JSON.parse(existing) : {};
      await storageSet('pj_settings', JSON.stringify({
        ...current,
        faithJourney: selected,
      }));
    } catch (e) {
      console.log('Faith journey save error', e);
    }
    router.push('/onboarding/apple-health');
  };

  return (
    <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={{ flex: 1 }}>

      {/* The fire the embers come off. The screen was DARKEST at the bottom and the embers rose out of pure
          black -- they had no source. This also un-inverts the app's own idea (light rising from below),
          which this screen was the only one to run upside down. */}
      <LinearGradient
        colors={['rgba(232,160,32,0)', 'rgba(232,160,32,0.10)', 'rgba(240,112,32,0.30)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SCREEN_HEIGHT * 0.55 }}
        pointerEvents="none"
      />

      {/* Embers */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {EMBERS.map(e => (
          <Ember key={e.id} x={e.x} size={e.size} duration={e.duration} delay={e.delay} color={e.color} />
        ))}
      </View>

      {/* Progress bar. Frosted + glued, like the rest of the flow -- but hand-built DARK. theme.chromeFill
          and tint="light" are light-theme values; used here they would lay two milky white bars across the
          dark room. */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(13,10,26,0.66)' }]} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.backBtn, { backgroundColor: 'rgba(232,160,32,0.15)', borderColor: 'rgba(232,160,32,0.30)' }]}
        >
          <Ionicons name="chevron-back" size={20} color={AMBER} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <View style={[styles.progressFill, { backgroundColor: AMBER, width: '67%' }]} />
        </View>
      </View>

      {/* Fixed frame, NO scroll -- there is not enough here to earn one. It has to fit, so the budget below
          is tight on purpose: the longest verse (2 Corinthians, on Not Right Now) is what everything has to
          clear. If a verse gets longer than that one, this breaks again. */}
      <View style={[styles.content, { paddingTop: insets.top + 66, paddingBottom: insets.bottom + 104 }]}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.screenLabel, { color: 'rgba(232,160,32,0.45)' }]}>STEP 4 OF 6</Text>
          <Text style={[styles.title, {
            color: AMBER,
            textShadowColor:  'rgba(232,160,32,0.2)',
            textShadowRadius: 40,
            textShadowOffset: { width: 0, height: 0 },
          }]}>
            Your Faith{'\n'}Journey.
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.66)' }]}>
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

      {/* Footer. Frosted dark, absolute -- content passes under it instead of stopping at an opaque slab. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: 'rgba(232,160,32,0.14)' }]}>
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,4,16,0.66)' }]} pointerEvents="none" />
        <PrimaryCTA
          label="Continue"
          fill={AMBER}
          disabled={!selected}
          faceStyle={{ borderRadius: 14, paddingVertical: 18 }}
          onPress={handleContinue}
        />
      </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:     { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: 'rgba(232,160,32,0.14)', overflow: 'hidden' },
  progressTrack:   { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 2 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content:         { flex: 1, paddingHorizontal: 24 },
  screenLabel:     { fontSize: 11, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  // 44, not 52. Two lines of display type was the single biggest block on the screen and the verse had to
  // live somewhere. Still the loudest thing here by a mile.
  title:           { fontSize: 44, fontFamily: Type.display, letterSpacing: 0.3, lineHeight: numLine(44), marginBottom: 10 },
  // VOICE, and readable. This is the app speaking at the most personal question in the flow; it was 13px
  // Onest at 38% white -- the interface face, whispering.
  subtitle:        { fontSize: 15, fontFamily: Type.voice, lineHeight: 21 },
  cardsContainer:  { marginTop: 20, gap: 10 },
  card:            { borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 78 },
  titleRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  cardTitle:       { fontSize: 19, fontFamily: Type.num, letterSpacing: 2, lineHeight: numLine(19) },
  cardCopy:        { fontSize: 13, fontFamily: Type.ui, lineHeight: 18, paddingLeft: 19 },
  verseBlock:      { marginTop: 18, paddingHorizontal: 4 },
  verseText:       { fontSize: 13, fontFamily: Type.voice, fontStyle: 'italic', lineHeight: 19, color: 'rgba(232,160,32,0.78)', textAlign: 'center' },
  verseRef:        { fontSize: 10, fontFamily: Type.uiBold, letterSpacing: 2, color: 'rgba(232,160,32,0.5)', textAlign: 'center', marginTop: 5, textTransform: 'uppercase' },
  changeNote:      { fontSize: 11, fontFamily: Type.ui, textAlign: 'center', marginTop: 12 },
  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5, overflow: 'hidden' },
});