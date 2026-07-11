import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';

// ─── Support the Mission (the reframed paywall) ──────────────────────────────
// Copy locked in SPEC_monetization.md (DECISIONS #4). This renders the FREE-user
// state (the pitch). Purchase buttons are STUBBED until RevenueCat is wired in;
// they fire a toast so the screen is fully testable without the payment layer.
// Uses live theme tokens so it adapts across all 5 themes + accents.
// Mode-agnostic (no health data / scores), so no Mindful or faith-tier variant.

type Perk = { icon: string; title: string; body: string; gold?: boolean };

const PERKS: Perk[] = [
  { icon: 'sparkles', title: 'More AI Room', body: 'Big bumps to your Otto and meal-estimate limits.' },
  { icon: 'bar-chart', title: 'Custom Reports', body: 'Built from the stats that matter most to you.' },
  { icon: 'calendar', title: 'Day-by-Day', body: 'Compare any two days and see exactly what changed.' },
  { icon: 'leaf', title: 'Custom Badge & Icon', body: 'A token of thanks for helping keep this going.', gold: true },
];

type Tip = { label: string; amount: string };
const TIPS: Tip[] = [
  { label: 'Pitch in', amount: '$2.99' },
  { label: 'Add some fuel', amount: '$4.99' },
  { label: 'Power it forward', amount: '$9.99' },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  // Derived gold (amber) tints from the theme token so it tracks the active theme.
  const goldBg = t.accentAmber + '18';
  const goldBorder = t.accentAmber + '44';

  // Stubbed purchase handlers until RevenueCat is integrated.
  const comingSoon = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Purchases are coming soon', 'Payment setup is still being built', 'info');
  };
  const restore = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    showToast('Nothing to restore yet', undefined, 'info');
  };

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="leaf" size={20} color={t.accentAmber} style={{ marginBottom: 6 }} />
          <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>Support the Mission</Text>
        </View>

        {/* Mission paragraph */}
        <Text style={[styles.mission, { color: t.textSecondary }]}>
          A lot of apps hide the basics behind a paywall: the barcode scanner, full macro tracking, even your
          sleep and recovery scores. Here, they stay free. The one piece with a real cost to run is the AI, the
          smarts behind Otto and Halo, your coaching, and the meal estimator. So if the app's been good to you,
          a little support keeps it alive and moving forward. Either way, thank you for being part of this.
        </Text>

        {/* Become a Supporter */}
        <View style={[styles.cardShadow, { shadowColor: '#000' }]}>
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw }]}>
            <Text style={[styles.eyebrow, { color: t.textMuted }]}>Support monthly</Text>
            <Text style={[styles.heading, { color: t.accentBlueRaw }]}>Become a Supporter</Text>
            <Text style={[styles.sub, { color: t.textMuted }]}>As a thank you, Supporters get:</Text>

            <View style={styles.perks}>
              {PERKS.map((p) => (
                <View key={p.title} style={styles.perk}>
                  <View style={[styles.perkIcon, {
                    backgroundColor: p.gold ? goldBg : t.accentBlueBg,
                    borderColor: p.gold ? goldBorder : t.accentBlueBorder,
                  }]}>
                    <Ionicons name={p.icon as any} size={15} color={p.gold ? t.accentAmber : t.accentBlue} />
                  </View>
                  <View style={styles.perkText}>
                    <Text style={[styles.perkTitle, { color: t.textSecondary }]}>{p.title}</Text>
                    <Text style={[styles.perkBody, { color: t.textSecondary }]}>{p.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Price selection */}
            <View style={styles.prices}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPlan('monthly'); }}
                style={[styles.price, {
                  borderColor: plan === 'monthly' ? t.accentBlue : t.borderCard,
                  backgroundColor: plan === 'monthly' ? t.accentBlueBg : t.bgInset,
                }]}
              >
                <Text style={[styles.priceAmt, { color: t.textSecondary }]}>$6.99</Text>
                <Text style={[styles.pricePer, { color: plan === 'monthly' ? t.accentBlue : t.textMuted }]}>per month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPlan('annual'); }}
                style={[styles.price, {
                  borderColor: plan === 'annual' ? t.accentBlue : t.borderCard,
                  backgroundColor: plan === 'annual' ? t.accentBlueBg : t.bgInset,
                }]}
              >
                <Text style={[styles.priceAmt, { color: t.textSecondary }]}>$69.99</Text>
                <Text style={[styles.pricePer, { color: plan === 'annual' ? t.accentBlue : t.textMuted }]}>per year</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={comingSoon} style={[styles.cta, { backgroundColor: t.accentBlue }]}>
              <Text style={styles.ctaText}>Become a Supporter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tip jar */}
        <View style={[styles.cardShadow, { shadowColor: '#000' }]}>
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw }]}>
            <Text style={[styles.eyebrow, { color: t.textMuted }]}>Support once</Text>
            <Text style={[styles.heading, { color: t.accentBlueRaw }]}>A one-time chip in</Text>

            <View style={styles.tipTiles}>
              {TIPS.map((tip) => (
                <TouchableOpacity
                  key={tip.label}
                  activeOpacity={0.85}
                  onPress={comingSoon}
                  style={[styles.tipTile, { backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder }]}
                >
                  <Text style={[styles.tipLabel, { color: t.textMuted }]}>{tip.label}</Text>
                  <Text style={[styles.tipAmt, { color: t.accentBlue }]}>{tip.amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={comingSoon}
              style={[styles.tipHero, { backgroundColor: goldBg, borderColor: goldBorder }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="leaf" size={16} color={t.accentAmber} />
                <Text style={[styles.tipHeroLabel, { color: t.accentAmber }]}>Back the mission</Text>
              </View>
              <Text style={[styles.tipHeroAmt, { color: t.accentAmber }]}>$24.99</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={restore} style={styles.restoreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.restore, { color: t.accentBlue }]}>Restore Purchases</Text>
        </TouchableOpacity>
        <Text style={[styles.legal, { color: t.textDim }]}>Payments are handled by the App Store. Cancel anytime in Settings.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 15, fontFamily: 'DMSans_400Regular' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  hero: { paddingHorizontal: 4, paddingBottom: 2 },
  heroTitle: { fontSize: 46, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, lineHeight: 50 },

  mission: { fontSize: 14.5, fontFamily: 'DMSans_400Regular', lineHeight: 23, paddingHorizontal: 4, marginBottom: 2 },

  cardShadow: { borderRadius: 14, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  card: { borderRadius: 14, borderWidth: 0.5, borderTopWidth: 1.5, padding: 16, overflow: 'hidden' },

  eyebrow: { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  heading: { fontSize: 26, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, lineHeight: 28 },
  sub: { fontSize: 12.5, fontFamily: 'DMSans_600SemiBold', marginTop: 4, marginBottom: 16 },

  perks: { gap: 14, marginBottom: 18 },
  perk: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  perkIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  perkText: { flex: 1 },
  perkTitle: { fontSize: 14.5, fontFamily: 'DMSans_700Bold', marginBottom: 2 },
  perkBody: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 18 },

  prices: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  price: { flex: 1, borderRadius: 13, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center' },
  priceAmt: { fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },
  pricePer: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', marginTop: 1 },

  cta: { borderRadius: 13, paddingVertical: 15, alignItems: 'center' },
  ctaText: { fontSize: 15, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3, color: '#ffffff' },

  tipTiles: { flexDirection: 'row', gap: 9, marginTop: 16, marginBottom: 10 },
  tipTile: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 15, alignItems: 'center', gap: 6 },
  tipLabel: { fontSize: 10.5, fontFamily: 'DMSans_600SemiBold', textAlign: 'center', minHeight: 26 },
  tipAmt: { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },

  tipHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 14, borderWidth: 1, paddingVertical: 15 },
  tipHeroLabel: { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  tipHeroAmt: { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },

  restoreBtn: { alignSelf: 'center', paddingTop: 6 },
  restore: { fontSize: 13.5, fontFamily: 'DMSans_600SemiBold' },
  legal: { fontSize: 10.5, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 15, paddingHorizontal: 20, marginTop: 2 },
});
