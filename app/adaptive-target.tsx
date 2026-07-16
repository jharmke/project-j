// app/adaptive-target.tsx
//
// The Adaptive TDEE suggestion screen (SPEC_wearable_robustness.md, Phase 2). Reached from the Otto
// hub's Type-A "your target may need a bump" notification. Recomputes fresh, explains the suggestion
// in plain language, shows a first-use disclaimer + inline micro disclaimer (health-data standard),
// and on Accept writes the new calorie target (the ONLY write this feature makes -- same as editing
// the target by hand). ?demo=1 shows a sample suggestion and never writes (for testing).

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import TooltipIcon from '../components/TooltipIcon';
import { useToast, ToastRenderer } from '../components/Toast';
import { computeAdaptiveTdee, applyAdaptiveTarget, type AdaptiveTdeeResult } from '../utils/adaptiveTdee';
import { clearNotification } from '../utils/notifications';
import { Type, PAGE_TITLE } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import PrimaryCTA from '../components/PrimaryCTA';

const DISCLAIMER_KEY = 'pj_adaptive_tdee_disclaimer_seen';

function todayKey(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

const DEMO_RESULT: AdaptiveTdeeResult = {
  status: 'ok', currentTarget: 1638, suggestedTarget: 1518, realTdee: 2202, divergence: -186,
  avgIntake: 1826, trendLbsPerWeek: -0.8, weighIns: 8, foodDays: 29, daysSinceWeighIn: 2,
};

export default function AdaptiveTargetScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const demo = params.demo === '1';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AdaptiveTdeeResult | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    (async () => {
      try { if (!(await AsyncStorage.getItem(DISCLAIMER_KEY))) setShowDisclaimer(true); } catch {}
      setResult(demo ? DEMO_RESULT : await computeAdaptiveTdee(todayKey()));
      setLoading(false);
    })();
  }, []);

  const dismissDisclaimer = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try { await AsyncStorage.setItem(DISCLAIMER_KEY, '1'); } catch {}
    setShowDisclaimer(false);
  };

  const accept = async () => {
    if (!result?.suggestedTarget) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (demo) { showToast(`Demo: target would update to ${result.suggestedTarget}`, undefined, 'info'); router.back(); return; }
    const ok = await applyAdaptiveTarget(result.suggestedTarget);
    if (ok) {
      clearNotification('tdee_suggestion');
      showToast(`Target updated to ${result.suggestedTarget} kcal`, undefined, 'success');
      router.back();
    } else {
      showToast('Could not update your target, please try again', undefined, 'error');
    }
  };

  const notNow = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); };

  const hasSuggestion = result?.status === 'ok' && result.suggestedTarget != null;
  const dir = result?.suggestedTarget != null && result.suggestedTarget < (result.currentTarget ?? 0) ? 'lower' : 'higher';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgPrimary }} edges={['top']}>
      <BackgroundLayers />
      {/* SafeAreaView edges={['top']} already paid the inset. */}
      <ScreenHeader title="Your Target" topInset={false} right={<TooltipIcon tooltipKey="adaptive_tdee" size={20} />} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={theme.accentBlue} />
          </View>
        ) : hasSuggestion ? (
          <>
            <View style={[styles.iconWrap, { backgroundColor: theme.accentBlueBg }]}>
              <Ionicons name="trending-up" size={26} color={theme.accentBlue} />
            </View>
            <Text style={[styles.title, { color: theme.textSecondary }]}>Your target may need a small adjustment</Text>
            <Text style={[styles.lede, { color: theme.textSecondary }]}>
              Based on your weight trend and what you've been eating, your real daily burn looks like about{' '}
              <Text style={{ fontFamily: Type.uiBold, color: theme.textSecondary }}>{result!.realTdee} kcal</Text>.
              To keep matching your goal pace, your target should shift a bit {dir}.
            </Text>

            <View style={[styles.compareCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }]}>
              <View style={styles.compareCol}>
                <Text style={[styles.compareLabel, { color: theme.textMuted }]}>NOW</Text>
                <Text style={[styles.compareValMuted, { color: theme.textSecondary }]}>{result!.currentTarget}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={theme.textDim} />
              <View style={styles.compareCol}>
                <Text style={[styles.compareLabel, { color: theme.accentBlue }]}>SUGGESTED</Text>
                <Text style={[styles.compareVal, { color: theme.accentBlue }]}>{result!.suggestedTarget}</Text>
              </View>
            </View>

            <Text style={[styles.detail, { color: theme.textDim }]}>
              From {result!.weighIns} weigh-ins and {result!.foodDays} logged days. Your trend is about{' '}
              {result!.trendLbsPerWeek} lb/week. We only ever move your target in small steps.
            </Text>

            <View style={[styles.caveatBox, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
              <Ionicons name="information-circle-outline" size={16} color={theme.accentBlue} style={{ marginTop: 1 }} />
              <Text style={[styles.caveatText, { color: theme.textSecondary }]}>
                Built from your food log, so the more consistently and completely you log, the sharper this
                estimate. It counts your logged intake as-is; meals you don't log aren't included.
              </Text>
            </View>

            <Text style={[styles.micro, { color: theme.textMuted }]}>For informational purposes only. Not medical advice.</Text>

            <Pressable onPress={accept} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: theme.accentBlue, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.primaryText}>Update target to {result!.suggestedTarget}</Text>
            </Pressable>
            <Pressable onPress={notNow} style={styles.ghostBtn}>
              <Text style={[styles.ghostText, { color: theme.textMuted }]}>Not now</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={[styles.iconWrap, { backgroundColor: theme.accentBlueBg }]}>
              <Ionicons name="checkmark-circle-outline" size={26} color={theme.accentBlue} />
            </View>
            <Text style={[styles.title, { color: theme.textSecondary }]}>
              {result?.status === 'stale' ? 'Time for a weigh-in' : "You're on track"}
            </Text>
            <Text style={[styles.lede, { color: theme.textSecondary }]}>
              {result?.status === 'stale'
                ? 'Your last weigh-in is over 10 days old, so we\'re holding your target steady rather than guessing. Step on the scale a couple times this week to keep it accurate.'
                : result?.status === 'insufficient'
                ? 'We need a few more weigh-ins and logged days before we can fine-tune your target from your real trend. Keep logging and weighing in.'
                : 'Your current target still matches your real burn and goal pace. Nothing to change right now.'}
            </Text>
            <Text style={[styles.micro, { color: theme.textMuted }]}>For informational purposes only. Not medical advice.</Text>
            <PrimaryCTA label="Got it" onPress={notNow} faceStyle={{ borderRadius: 12, paddingVertical: 16 }} />
          </>
        )}
      </ScrollView>

      <Modal transparent visible={showDisclaimer} animationType="fade" onRequestClose={dismissDisclaimer}>
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { backgroundColor: theme.bgSheet, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
            <View style={[styles.handle, { backgroundColor: theme.textDim }]} />
            <Text style={[styles.modalTitle, { color: theme.accentBlue }]}>ABOUT THIS SUGGESTION</Text>
            <Text style={[styles.modalBody, { color: theme.textSecondary }]}>
              This estimates your real daily burn from your weight trend and logged intake, then suggests a
              matching calorie target. It's most accurate when you log your food consistently and completely,
              and it's an estimate, not a prescription. It only ever changes your target if you tap Accept.
              For informational purposes only. Not medical advice.
            </Text>
            <PrimaryCTA label="Got it" onPress={dismissDisclaimer} wrapperStyle={{ marginTop: 4 }} faceStyle={{ borderRadius: 12, paddingVertical: 16 }} />
          </View>
        </View>
      </Modal>

      <ToastRenderer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 26, alignItems: 'flex-start' },
  headerTitle: { ...PAGE_TITLE },
  iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontFamily: Type.uiBold, lineHeight: 28, marginBottom: 10 },
  lede: { fontSize: 15, fontFamily: Type.ui, lineHeight: 22, marginBottom: 20 },
  compareCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 14, borderWidth: 0.5, paddingVertical: 18, marginBottom: 16 },
  compareCol: { alignItems: 'center' },
  compareLabel: { fontSize: 9, letterSpacing: 2, fontFamily: Type.uiBold, marginBottom: 6 },
  compareVal: { fontSize: 30, fontFamily: Type.uiBold },
  compareValMuted: { fontSize: 30, fontFamily: Type.uiBold },
  detail: { fontSize: 12.5, fontFamily: Type.ui, lineHeight: 18, marginBottom: 14 },
  caveatBox: { flexDirection: 'row', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  caveatText: { flex: 1, fontSize: 12.5, fontFamily: Type.ui, lineHeight: 18 },
  micro: { fontSize: 11, fontFamily: Type.ui, marginBottom: 22, fontStyle: 'italic' },
  primaryBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 15, fontFamily: Type.uiBold, color: '#ffffff' },
  ghostBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ghostText: { fontSize: 14, fontFamily: Type.uiSemibold },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 2.5, padding: 20, alignItems: 'stretch' },
  handle: { width: 40, height: 5, borderRadius: 3, opacity: 0.5, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 12, letterSpacing: 2, fontFamily: Type.uiBold, marginBottom: 10, textAlign: 'center' },
  modalBody: { fontSize: 14, fontFamily: Type.ui, lineHeight: 21, marginBottom: 18, textAlign: 'center' },
});
