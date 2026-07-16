import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getTutorialsForTab } from '../data/tutorials';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { ToastRenderer } from './Toast';
import ModalHeader from './ModalHeader';
import { Type } from '../typography';

// ─── Emitter ─────────────────────────────────────────────────────────────────

type Listener = (tab: string | null) => void;
const listeners = new Set<Listener>();

export function showToolkit(tab: string) {
  listeners.forEach(fn => fn(tab));
}

function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Renderer (mount in _layout.tsx) ─────────────────────────────────────────

export function ToolkitRenderer() {
  const [tab, setTab] = useState<string | null>(null);

  useEffect(() => subscribe(setTab), []);

  if (!tab) return null;
  return <ToolkitSheetInner tab={tab} onClose={() => setTab(null)} />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const TAB_ROUTES: Record<string, string> = {
  home:    '/(tabs)/',
  log:     '/(tabs)/log',
  workout: '/(tabs)/workout',
  stats:   '/(tabs)/stats',
  profile: '/(tabs)/profile',
  faith:   '/(tabs)/faith',
};

function ToolkitSheetInner({ tab, onClose }: { tab: string; onClose: () => void }) {
  const { theme } = useTheme();
  const { startTutorial } = useTutorial();
  const router = useRouter();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;

  const tutorials = getTutorialsForTab(tab as any);

  // Faith tab wears amber end-to-end, so its toolkit does too (title, play icons, top edge).
  const faith = tab === 'faith';
  const accentRaw = faith ? theme.accentAmber : theme.accentBlueRaw;
  const accentTintBg = faith ? theme.accentAmber + '16' : theme.accentBlueBg;

  const animateIn = () => {
    overlayOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(16);

    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardOpacity,    { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 16, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      overlayOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(16);
      onClose();
    });
  };

  const handleStart = (id: string, returnRoute?: string) => {
    handleClose();
    setTimeout(() => startTutorial(id, returnRoute), 320);
  };

  const handleAllTutorials = () => {
    handleClose();
    setTimeout(() => router.push('/tutorials' as any), 320);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onShow={animateIn}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <ToastRenderer />

      {/* Overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      {/* Card container */}
      <View style={styles.cardContainer} pointerEvents="box-none">
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: theme.bgSheet,
            borderColor: theme.borderCard,
            borderTopColor: accentRaw + '55',
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}>
          {/* Standard modal header (handle pill + Clash title + X). The -16 pulls its own 16px padding
              back so the title left-aligns with the tour rows below; the card keeps its 16px sides. */}
          <View style={{ marginHorizontal: -16 }}>
            <ModalHeader
              title="Guided Tours"
              subtitle="Walk through each feature step by step."
              onClose={handleClose}
              color={faith ? theme.accentAmber : undefined}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical={false}
            style={styles.list}
          >
            {tutorials.map((t, i) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleStart(t.id, t.returnRoute)}
                style={[
                  styles.row,
                  {
                    borderBottomWidth: i < tutorials.length - 1 ? 0.5 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
                activeOpacity={0.65}
              >
                <View style={[styles.playIconWrap, { backgroundColor: accentTintBg, borderColor: accentRaw + '33' }]}>
                  <Ionicons name="play" size={12} color={accentRaw} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{t.name}</Text>
                  <Text style={[styles.rowDesc,  { color: theme.textSecondary }]}>
                    {t.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* All Tutorials */}
            <TouchableOpacity
              onPress={handleAllTutorials}
              style={[styles.row, styles.allRow, { borderTopColor: 'rgba(255,255,255,0.06)' }]}
              activeOpacity={0.65}
            >
              <View style={[styles.playIconWrap, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="grid" size={12} color={theme.textSecondary} />
              </View>
              <Text style={[styles.rowTitle, { color: theme.textSecondary, flex: 1 }]}>All Tutorials</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 0.5,
    borderTopWidth: 2,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  list: {
    flexGrow: 0,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  allRow: {
    marginTop: 4,
    borderTopWidth: 0.5,
  },
  playIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: Type.uiSemibold,
  },
  rowDesc: {
    fontSize: 11,
    fontFamily: Type.ui,
    marginTop: 1,
  },
});
