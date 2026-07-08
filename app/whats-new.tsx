import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fragment } from 'react';
import { useTheme } from '../theme';
import { WHATS_NEW_RELEASES } from '../data/whatsNew';

// What's New / release notes page. Mirrors the Mission page look (clean cards, big hero title).
// Reached permanently from Settings > About, and once per release from an Otto hub notification.
export default function WhatsNewScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={t.accentBlueRaw} />
          <Text style={[styles.backText, { color: t.accentBlueRaw }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>WHAT'S NEW</Text>
        </View>

        {WHATS_NEW_RELEASES.map((release) => (
          <Fragment key={release.releaseId}>
            <View style={styles.patchHeaderRow}>
              <Text style={[styles.patchHeader, { color: t.textMuted }]}>{release.version}</Text>
              {release.date ? (
                <Text style={[styles.patchDate, { color: t.textMuted }]}>{release.date}</Text>
              ) : null}
            </View>

            {release.highlights.map((h, i) => (
              <View key={i} style={[styles.cardShadow, { shadowColor: '#000' }]}>
                <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw }]}>
                  <View style={styles.iconRow}>
                    <View style={[styles.iconCircle, { backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder }]}>
                      <Ionicons name={h.icon as any} size={15} color={t.accentBlueRaw} />
                    </View>
                    <Text style={[styles.cardTitle, { color: t.textMuted }]}>{h.title}</Text>
                  </View>

                  {h.body ? (
                    <Text style={[styles.cardBody, { color: t.textSecondary }]}>{h.body}</Text>
                  ) : null}

                  {h.bullets ? (
                    <View style={{ gap: 6, marginTop: 2 }}>
                      {h.bullets.map((b, bi) => (
                        <View key={bi} style={styles.bulletRow}>
                          <Text style={[styles.bulletDot, { color: t.accentBlueRaw }]}>{'•'}</Text>
                          <Text style={[styles.cardBody, { color: t.textSecondary, flex: 1 }]}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText:    { fontSize: 15, fontFamily: 'DMSans_400Regular' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  hero:        { paddingHorizontal: 4, paddingBottom: 4 },
  heroTitle:   { fontSize: 42, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3, lineHeight: 46 },
  patchHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12, marginBottom: -2, paddingHorizontal: 4 },
  patchHeader: { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, textTransform: 'uppercase' },
  patchDate:   { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1, textTransform: 'uppercase' },
  cardShadow:  { borderRadius: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  card:        { borderRadius: 14, borderWidth: 0.5, borderTopWidth: 1.5, padding: 14, overflow: 'hidden' },
  iconRow:     { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  iconCircle:  { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 15, fontFamily: 'DMSans_700Bold', flex: 1 },
  cardBody:    { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
  bulletRow:   { flexDirection: 'row', gap: 8 },
  bulletDot:   { fontSize: 13, lineHeight: 19 },
});
