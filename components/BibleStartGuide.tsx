import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme';

/**
 * "Where do I start?" guide for the faith Bible card's first-time state. A small centered fade
 * pop-up (matches the prayer modals, never a slide-up) listing a few curated starting points,
 * each with a short warm reason. Tapping one opens the reader at that book and chapter via the
 * reader's openBook / openChapter params. Static curated content, NOT the reading-plans engine
 * (that is its own deferred feature).
 *
 * No text input here, so the faith-tab "keyboard swallows taps" bug (AddPrayerModal) does not apply.
 */

const GOLD = '212,134,10';

type Starter = { book: string; chapter: number; display: string; why: string };

// Book names match data/bible-web.ts exactly (the reader's openBook path matches by exact name).
const STARTERS: Starter[] = [
  { book: 'John',     chapter: 1,  display: 'John',              why: 'Start here. The clearest picture of who Jesus is and why He came.' },
  { book: 'Mark',     chapter: 1,  display: 'Mark',              why: "The fastest, most action-driven account of Jesus' life." },
  { book: 'Psalms',   chapter: 23, display: 'Psalms (Psalm 23)', why: 'Honest prayers for comfort, fear, and gratitude. Read when you need to feel understood.' },
  { book: 'Proverbs', chapter: 1,  display: 'Proverbs',          why: 'Short, practical wisdom for everyday life. 31 chapters, one a day fits the month.' },
  { book: 'Acts',     chapter: 1,  display: 'Acts',              why: 'The early church and the Spirit at work after Jesus. Adventurous and fast-moving.' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BibleStartGuide({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 250 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const fadeOut = (then: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => then());
  };

  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fadeOut(onClose);
  };

  const pick = (s: Starter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fadeOut(() => {
      onClose();
      router.push({ pathname: '/bible', params: { openBook: s.book, openChapter: String(s.chapter) } });
    });
  };

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close} onShow={animateIn}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg }}
        activeOpacity={1}
        onPress={close}
      />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View
          style={{
            width: '88%',
            backgroundColor: theme.bgSheet,
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: theme.borderCard,
            borderTopWidth: 1.5,
            borderTopColor: `rgba(${GOLD},0.7)`,
            padding: 20,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="book" size={15} color={theme.accentAmber} />
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentAmber }}>
              Where do I start?
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginBottom: 14, lineHeight: 20 }}>
            Good places to dig in, each with a reason why. Tap one to start reading.
          </Text>

          {STARTERS.map((s, i) => (
            <TouchableOpacity
              key={`${s.book}_${s.chapter}`}
              activeOpacity={0.8}
              onPress={() => pick(s)}
              style={{
                borderWidth: 1,
                borderColor: theme.borderInput,
                borderTopColor: `rgba(${GOLD},0.3)`,
                borderRadius: 10,
                padding: 12,
                marginBottom: i === STARTERS.length - 1 ? 0 : 8,
                backgroundColor: theme.bgInput,
                minHeight: 44,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.accentAmber }}>{s.display}</Text>
                <Ionicons name="arrow-forward" size={14} color={theme.textMuted} />
              </View>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textSecondary, lineHeight: 17 }}>{s.why}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={close} style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
