import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTutorialsForTab } from '../data/tutorials';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { ToastRenderer } from './Toast';

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

// ─── Sheet ────────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<string, string> = {
  home:    'HOME',
  log:     'NUTRITION LOG',
  workout: 'WORKOUT',
  stats:   'STATS',
  profile: 'PROFILE',
};

function ToolkitSheetInner({ tab, onClose }: { tab: string; onClose: () => void }) {
  const { theme } = useTheme();
  const { startTutorial } = useTutorial();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const translateY = useSharedValue(600);
  const animStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const tutorials = getTutorialsForTab(tab as any);

  const handleShow = () => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  };

  const handleClose = () => {
    translateY.value = withSpring(600, { damping: 22, stiffness: 220 });
    setTimeout(onClose, 280);
  };

  const handleStart = (id: string) => {
    handleClose();
    setTimeout(() => startTutorial(id), 320);
  };

  const handleAllTutorials = () => {
    handleClose();
    setTimeout(() => router.push('/settings'), 320);
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onShow={handleShow}
      onRequestClose={handleClose}
    >
      <ToastRenderer />

      {/* Backdrop */}
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Sheet container */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Reanimated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.bgSheet, paddingBottom: insets.bottom + 8 },
            animStyle,
          ]}
        >
          {/* Handle pill */}
          <View style={[styles.handle, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              {TAB_LABELS[tab] ?? tab.toUpperCase()} TOOLKIT
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Guided Tours</Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            Walk through each feature step by step.
          </Text>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical={false}
          >
            {tutorials.map((t, i) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleStart(t.id)}
                style={[
                  styles.row,
                  {
                    borderBottomWidth: i < tutorials.length - 1 ? 0.5 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  },
                ]}
                activeOpacity={0.65}
              >
                <View style={[styles.playIconWrap, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueRaw + '33' }]}>
                  <Ionicons name="play" size={12} color={theme.accentBlueRaw} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{t.name}</Text>
                  <Text style={[styles.rowDesc,  { color: theme.textSecondary }]} numberOfLines={1}>
                    {t.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
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
        </Reanimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 14,
  },
  list: {
    flexGrow: 0,
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
    fontFamily: 'DMSans_600SemiBold',
  },
  rowDesc: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    marginTop: 1,
  },
});
