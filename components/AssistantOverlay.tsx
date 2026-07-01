import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import AssistantFAB from './AssistantFAB';
import AssistantChat from './AssistantChat';
import { useAuth } from '../AuthContext';
import { useCameraActive } from '../utils/assistantFab';
import { useTooltip } from '../useTooltip';
import { useTheme } from '../theme';

// Single app-wide mount for the general Companion assistant. Rendered once in the root layout, it
// decides on every screen whether the FAB should appear, and owns the open/close state for the chat.
//
// WHERE IT HIDES:
//  - Not signed in (the function requires auth; also covers the sign-in + onboarding flow).
//  - Faith surfaces: the Faith tab and the Bible / Journal / Prayer / Devotional / Plans screens.
//    Halo owns those (Halo mounts on those screens), so the general Companion steps aside there.
//  - The AI Meal Estimator screen (camera-first + redundant with a second AI helper).
//  - While any live camera is open (barcode scanner, estimator capture), via the camera signal.
// EVERYWHERE ELSE it shows (Home, Workout, Log, Stats, Profile, Settings, Add Food, Sleep hub,
// Day Detail, and so on).
//
// The tab bar is TAB_BAR_HEIGHT (64) tall, and this overlay lives ABOVE the tabs navigator, so on a
// tab screen the FAB must be lifted to clear the bar; on a pushed screen it sits near the bottom.

const TAB_BAR_HEIGHT = 64;
const FAB_DISC = 56; // matches AssistantFAB disc size, for placing the first-use callout above it

// Route segments (from useSegments, groups included) that suppress the FAB.
const HIDE_SEGMENTS = new Set([
  'sign-in',
  'onboarding',
  'bible',
  'journal',
  'prayer',
  'devotional',
  'plans',
  'ai-meal-estimator',
]);

export default function AssistantOverlay() {
  const { user } = useAuth();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const cameraActive = useCameraActive();
  const { theme } = useTheme();
  const { seen, markSeen } = useTooltip('companion_fab'); // first-use callout, shown once
  const [open, setOpen] = useState(false);

  const isTab = segments[0] === '(tabs)';
  const isFaithTab = isTab && segments[1] === 'faith';
  const hidden =
    !user ||
    cameraActive ||
    isFaithTab ||
    segments.some(s => HIDE_SEGMENTS.has(s));

  if (hidden) return null;

  // Match Halo's placement exactly. Halo mounts INSIDE a faith tab screen at bottom:18, and the
  // navigator already insets that content above the tab bar (64 + safe-area). This overlay lives
  // ABOVE the tab bar, so to land at the same spot we add the tab-bar height + safe-area + that
  // same 18 gap. Pushed screens (no tab bar) match Halo's 20 + safe-area (as on the Bible reader).
  const bottom = isTab ? TAB_BAR_HEIGHT + insets.bottom + 18 : insets.bottom + 20;

  // First-use callout: shown once (seen === false means loaded + not yet dismissed), only while the
  // chat is closed. Opening the chat (via the callout or the FAB) marks it seen so it never nags.
  const showCallout = seen === false && !open;
  const openChat = () => { if (seen === false) markSeen(); setOpen(true); };

  return (
    <>
      {showCallout && (
        <Pressable
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); openChat(); }}
          style={[styles.callout, { bottom: bottom + FAB_DISC + 10, backgroundColor: theme.bgSheet, borderColor: theme.accentBlueBorder }]}
        >
          <Text style={[styles.calloutTitle, { color: theme.textPrimary }]}>Hey, I can help</Text>
          <Text style={[styles.calloutText, { color: theme.textSecondary }]}>Ask me how to do anything in the app, or how you're tracking. Tap to start.</Text>
        </Pressable>
      )}
      <AssistantFAB bottom={bottom} onPress={openChat} />
      <AssistantChat visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  callout: {
    position: 'absolute',
    left: 24,
    maxWidth: 250,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 51,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', marginBottom: 2 },
  calloutText: { fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 16 },
});
