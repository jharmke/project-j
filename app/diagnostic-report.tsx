import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../components/Toast';
import TooltipIcon from '../components/TooltipIcon';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import {
  DiagnosticReport,
  ReportWindow,
  deleteReport,
  generateDiagnosticReport,
  loadSavedReports,
  minDaysForWindow,
  saveReport,
} from '../utils/diagnosticReport';

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dk: string): string {
  const [, m, d] = dk.split('-');
  return `${MONTH_ABBR[parseInt(m) - 1]} ${parseInt(d)}`;
}

function fmtDateFull(dk: string): string {
  const [y, m, d] = dk.split('-');
  return `${MONTH_ABBR[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// generatedAt is a UTC ISO timestamp; slicing its date shows the UTC day (rolls over
// before local midnight). Derive the LOCAL calendar date instead.
function localDateKey(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso.slice(0, 10);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function windowDateRange(windowDays: number): string {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - windowDays + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const endKey = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  return `${fmtDate(startKey)} – ${fmtDate(endKey)}`;
}

async function countLoggedDaysInWindow(windowDays: number): Promise<number> {
  let count = 0;
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  for (let i = 1; i <= windowDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `pj_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.excluded?.diet && parsed.entries?.length > 0) {
          const cals = parsed.entries.reduce((s: number, e: any) => s + (e.cal || 0), 0);
          if (cals > 400) count++;
        }
      }
    } catch {}
  }
  return count;
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DiagnosticReportScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { showToast } = useToast();

  const { registerScrollView, unregisterScrollView } = useTutorial();
  const generateBtnRef  = useTutorialTarget('evr_generate_btn');
  const scrollRef = useRef<any>(null);

  // Per-pattern windows: there is no window picker. The report blocks only if there is barely
  // anything to analyze; otherwise each finding uses its own lookback internally.
  const MIN_LOGGED = 7;

  const [savedReports, setSavedReports] = useState<DiagnosticReport[]>([]);
  const [generating, setGenerating]     = useState(false);
  const [initialized, setInitialized]   = useState(false);
  const [totalLogged, setTotalLogged]   = useState(0);

  const shadowStyle = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };

  useEffect(() => {
    registerScrollView('effort_vs_results', scrollRef);
    return () => unregisterScrollView('effort_vs_results');
  }, []);

  useFocusEffect(
    useCallback(() => {
      setInitialized(false);
      const load = async () => {
        const reports = await loadSavedReports();
        setSavedReports(reports);
        setTotalLogged(await countLoggedDaysInWindow(90));
        setInitialized(true);
      };
      load();
    }, [])
  );

  const blocked = initialized && totalLogged < MIN_LOGGED;

  const handleGenerate = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);
    try {
      const report = await generateDiagnosticReport();
      await saveReport(report);
      const updated = await loadSavedReports();
      setSavedReports(updated);
      router.push(`/diagnostic-report-view?id=${encodeURIComponent(report.id)}`);
    } catch {
      showToast('Could not generate report. Try again.', undefined, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = (report: DiagnosticReport) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Report',
      'Remove this saved report? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteReport(report.id);
            const updated = await loadSavedReports();
            setSavedReports(updated);
            showToast('Report deleted', undefined, 'success');
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ToastRenderer />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={t.accentBlueRaw} />
          <Text style={[styles.backText, { color: t.accentBlueRaw }]}>Stats</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={{ paddingHorizontal: 4, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>{'EFFORT VS\nRESULTS'}</Text>
          <TooltipIcon tooltipKey="effort_vs_results" size={18} />
        </View>

        {/* Intro line (replaces the window picker -- each pattern uses its own timeframe) */}
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: t.textSecondary, lineHeight: 20, marginBottom: 14 }}>
          A diagnostic read of your recent data. Each pattern is measured over the timeframe that fits it, so there's no window to pick.
        </Text>

        {/* Generate button */}
        <TouchableOpacity
          ref={generateBtnRef}
          onPress={handleGenerate}
          disabled={!initialized || generating || blocked}
          style={[styles.generateBtn, {
            backgroundColor: t.accentBlueRaw,
            opacity: !initialized ? 0.4 : generating ? 0.7 : blocked ? 0.4 : 1,
          }]}
        >
          {generating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateBtnText}>Analyzing your data...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>
              {blocked ? `Need ${MIN_LOGGED} logged days` : 'Generate Analysis'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Saved reports list */}
        {savedReports.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionLabel, { color: t.textMuted }]}>SAVED REPORTS</Text>
            {savedReports.map((r, idx) => {
              const isCurrent = idx === 0; // most recent is the live one
              return (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.75}
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/diagnostic-report-view?id=${encodeURIComponent(r.id)}`);
                  }}
                  style={[styles.reportRow, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: isCurrent ? t.accentBlueRaw : t.borderCard, ...shadowStyle }]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {isCurrent && (
                        <View style={{ backgroundColor: t.accentBlueBg, borderWidth: 1, borderColor: t.accentBlueBorder, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: t.accentBlueRaw }}>CURRENT</Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: t.textSecondary }}>
                        Generated {fmtDateFull(localDateKey(r.generatedAt))}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: t.textMuted }}>
                      {r.insufficientData ? 'Insufficient data' : `${r.minLoggedDays} days logged`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(r)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={t.statusBad} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state when no reports and not blocked */}
        {savedReports.length === 0 && initialized && !blocked && (
          <View style={[styles.emptyCard, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle }]}>
            <Ionicons name="analytics-outline" size={48} color={t.textMuted} style={{ marginBottom: 14 }} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No Reports Yet</Text>
            <Text style={[styles.emptyBody, { color: t.textSecondary }]}>
              Tap Generate to see what your logged data says about your results.
            </Text>
            <Text style={[styles.emptyHint, { color: t.textMuted }]}>
              More data means more accurate findings.
            </Text>
          </View>
        )}

        {/* Blocked empty state */}
        {savedReports.length === 0 && initialized && blocked && (
          <View style={[styles.emptyCard, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw, ...shadowStyle }]}>
            <Ionicons name="calendar-outline" size={48} color={t.textMuted} style={{ marginBottom: 14 }} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>Not Enough Data Yet</Text>
            <Text style={[styles.emptyBody, { color: t.textSecondary }]}>
              {`You have ${totalLogged} of ${MIN_LOGGED} logged days needed. Keep logging and this unlocks automatically.`}
            </Text>
            <Text style={[styles.emptyHint, { color: t.textMuted }]}>
              Even rough estimates on the days you miss count.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  heroTitle: {
    fontSize: 48,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 3,
    lineHeight: 52,
  },
  windowBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  generateBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  reportRow: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderTopWidth: 1.5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 0.5,
    borderTopWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  emptyHint: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 8,
  },
});
