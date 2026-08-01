// app/reports.tsx
// Custom Reports hub (Pro feature). Lists the user's saved reports and starts a new one. A report is a
// saved CONFIG (name + date range + blocks) that renders live in app/report.tsx.
//
// ACCESS: Pro-gated at launch. During TestFlight beta it is OPEN TO ALL via REPORTS_BETA_OPEN (see the
// REVERT BEFORE LAUNCH list in the roadmap). The Pro-gate architecture stays in place so re-gating at
// launch is a one-line flip.

import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useMembership } from '../MembershipContext';
import { useToast } from '../components/Toast';
import { loadReports, deleteReport, newReportId, RANGE_LABELS, Report } from '../utils/reports';
import { Type } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';
import PrimaryCTA from '../components/PrimaryCTA';
import GradientNumber from '../components/GradientNumber';
// GradientTitle's own note says it is wired through ScreenHeader/ModalHeader rather than called from a
// screen -- that is about not duplicating TITLE wiring, and this is a card headline, not a page title.
// MembershipCard already uses it the same way.
import GradientTitle from '../components/GradientTitle';
// Supporter locks are FLAT gold, never foil. Foil means "you have this" (the Supporter mark); a lock means
// "you could have this". Same colour family, different symbol, opposite meanings. Foil also needs size to
// read as metal (three gradient stops) and turns to mush at icon sizes.
import { GOLD_BASE } from '../components/SupporterFoil';

// ✅ FLIPPED FALSE 2026-07-28. Reports is now genuinely Supporter-gated, as designed.
// History: this flag was born 2026-07-07 when Reports shipped and no purchase system existed -- it was the
// only way anyone could see the feature. RevenueCat and the locked screen both landed 2026-07-12 and the
// flag was simply left on so testers kept access. It is redundant now that testers are comped in RevenueCat.
// ⚠️ RESOLVED, DO NOT READ THIS AS A LIVE PROBLEM. While the flag was ON it was OR'd in AHEAD of the
// entitlement check, which forced access for everyone and meant the locked screen below could not be
// reached -- not even via the "Force Free State" dev toggle. That is over: the flag is false and
// **Justin has since seen and tested the locked Reports and Comparison screens on device.**
// The lesson worth keeping is only the pattern: a beta flag OR'd ahead of an entitlement check hides the
// locked state from everyone, so it can ship unlooked-at. Same blind spot once bit the EvR locked card.
// Still true and worth checking before a build: any tester never comped in RevenueCat loses Reports.
export const REPORTS_BETA_OPEN = false;

export default function ReportsHub() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);

  const refresh = useCallback(() => { loadReports().then(setReports); }, []);
  useFocusEffect(refresh);

  // Supporter gate from RevenueCat. Reports is Supporter-only, but REPORTS_BETA_OPEN keeps it open to all during beta.
  const { isSupporter: isPro } = useMembership();
  const hasAccess = REPORTS_BETA_OPEN || isPro;

  const startNew = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/report', params: { new: '1' } });
  };

  const openReport = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/report', params: { id } });
  };

  const confirmDelete = (r: Report) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Delete Report', `Delete "${r.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const next = await deleteReport(r.id);
        setReports(next);
        showToast('Report deleted', undefined, 'success');
      } },
    ]);
  };

  // Whole Reports tool is a Supporter feature (dormant until REPORTS_BETA_OPEN flips false with RevenueCat).
  if (!hasAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
        <ScreenHeader title="Reports" />
        {/* Sits in the upper third, not dead centre: centred in a full-height container it floated with a
            screen's worth of nothing above it and read as lost rather than deliberate. */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 40, paddingHorizontal: 24, paddingBottom: 24 }}>
          {/* borderTopColor matches every card on the Stats tab -- without it this looked like it came from
              a different app. */}
          <View style={{ backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.accentBlueBorder, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, borderRadius: 14, padding: 20, alignItems: 'center', shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
            {/* Lock only -- the headline right below already names the tier. Gradient-masked to match the
                headline; a flat glyph above gradient text read as two different design languages. */}
            <View style={{ marginBottom: 12 }}>
              <Ionicons name="lock-closed" size={20} color={GOLD_BASE} />
            </View>
            <GradientTitle title="Custom Reports is a Supporter feature" color={theme.textSecondary} style={{ fontSize: 17, fontFamily: Type.uiBold, textAlign: 'center', marginBottom: 8 }} />
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 21, textAlign: 'center', marginBottom: 18 }}>
              Build your own report from any period, with the stats that matter most to you.
            </Text>
            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/support'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 15, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Become a Supporter →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <BackgroundLayers />
      {/* Header */}
      <ScreenHeader title="Reports" subtitle="Build your own, from any period." />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {reports.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 70, paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="documents" size={30} color={theme.accentBlue} />
            </View>
            <Text style={{ fontSize: 17, fontFamily: Type.uiBold, color: theme.textSecondary, marginBottom: 6 }}>No reports yet</Text>
            <Text style={{ fontSize: 13, fontFamily: Type.ui, color: theme.textMuted, textAlign: 'center', lineHeight: 19 }}>
              Create a report, pick a date range, and add the blocks you care about: nutrition, workouts, sleep, and more. Tap New Report to start.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 11, marginTop: 4 }}>
            {reports.map(r => (
              <TouchableOpacity key={r.id} activeOpacity={0.75} onPress={() => openReport(r.id)}
                style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text" size={20} color={theme.accentBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 15, fontFamily: Type.uiBold }} numberOfLines={1} />
                  <Text style={{ fontSize: 12, fontFamily: Type.uiMedium, color: theme.textMuted, marginTop: 2 }}>
                    {RANGE_LABELS[r.range.preset]} · {r.blockIds.length} block{r.blockIds.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(r)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* New Report lives IN the scroll, under the list. It was a pinned bottom bar wearing the floating
            SAVE-bar chrome (opaque block + top border) -- that pattern is for a contextual save that
            animates in when there are unsaved changes, and this is a create action with nothing pending.
            It sat there permanently, and Otto (bottom-left) landed on top of it. */}
        <PrimaryCTA
          wrapperStyle={{ marginTop: 16 }}
          faceStyle={{ paddingVertical: 15, borderRadius: 12 }}
          label="New Report"
          icon={<Ionicons name="add" size={20} color="#ffffff" />}
          onPress={startNew}
        />
      </ScrollView>
    </View>
  );
}
