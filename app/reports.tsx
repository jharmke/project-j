// app/reports.tsx
// Custom Reports hub (Pro feature). Lists the user's saved reports and starts a new one. A report is a
// saved CONFIG (name + date range + blocks) that renders live in app/report.tsx.
//
// ACCESS: Pro-gated at launch. During TestFlight beta it is OPEN TO ALL via REPORTS_BETA_OPEN (see the
// REVERT BEFORE LAUNCH list in the roadmap). The Pro-gate architecture stays in place so re-gating at
// launch is a one-line flip.

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import { loadReports, deleteReport, newReportId, RANGE_LABELS, Report } from '../utils/reports';

// 🚧 BETA HACK (revert before App Store launch): Reports is a Pro feature, but every TestFlight user gets
// full access during beta. Flip to false (or gate on the real subscription) before public release.
const REPORTS_BETA_OPEN = true;

export default function ReportsHub() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);

  const refresh = useCallback(() => { loadReports().then(setReports); }, []);
  useFocusEffect(refresh);

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.textSecondary }}>REPORTS</Text>
          <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 1 }}>Build your own, from any period.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {reports.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 70, paddingHorizontal: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="documents" size={30} color={theme.accentBlue} />
            </View>
            <Text style={{ fontSize: 17, fontFamily: 'DMSans_700Bold', color: theme.textSecondary, marginBottom: 6 }}>No reports yet</Text>
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', lineHeight: 19 }}>
              Create a report, pick a date range, and add the blocks you care about: nutrition, workouts, sleep, and more. Tap New Report to start.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 11, marginTop: 4 }}>
            {reports.map(r => (
              <TouchableOpacity key={r.id} activeOpacity={0.75} onPress={() => openReport(r.id)}
                style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderTopWidth: 1.5, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text" size={20} color={theme.accentBlue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.textSecondary }}>{r.name}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: theme.textMuted, marginTop: 2 }}>
                    {RANGE_LABELS[r.range.preset]} · {r.blockIds.length} block{r.blockIds.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(r)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={18} color={theme.textDim} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* New Report button (full accent) */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 14, backgroundColor: theme.bgPrimary, borderTopWidth: 0.5, borderTopColor: theme.borderCard }}>
        <TouchableOpacity onPress={startNew} activeOpacity={0.85}
          style={{ backgroundColor: theme.accentBlue, borderRadius: 12, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff' }}>New Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
