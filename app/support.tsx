import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import SproutIcon from '../components/SproutIcon';
import { useMembership } from '../MembershipContext';

// ─── Support the Mission (the reframed paywall) ──────────────────────────────
// Copy locked in SPEC_monetization.md (DECISIONS #4). This renders the FREE-user
// state (the pitch). Purchase buttons are STUBBED until RevenueCat is wired in;
// they fire a toast so the screen is fully testable without the payment layer.
// Uses live theme tokens so it adapts across all 5 themes + accents.
// Mode-agnostic (no health data / scores), so no Mindful or faith-tier variant.

type Perk = { icon: string; title: string; body: string; gold?: boolean; sprout?: boolean };

const PERKS: Perk[] = [
  { icon: 'sparkles', title: 'More AI Room', body: 'Big bumps to your Otto and meal-estimate limits.' },
  { icon: 'bar-chart', title: 'Custom Reports', body: 'Built from the stats that matter most to you.' },
  { icon: 'swap-horizontal', title: 'Comparison', body: 'Pick your time frames, line them up side by side, and see exactly how you compared.' },
  // sprout: renders the real gold Supporter sprout (the actual badge), not an Ionicon -- previews the exact perk.
  { icon: 'leaf', sprout: true, title: 'Custom Badge & Icon', body: 'A token of thanks for helping keep this going.', gold: true },
];

type Tip = { label: string; amount: string; gold?: boolean; productId: string };
const TIPS: Tip[] = [
  { label: 'Pitch in', amount: '$2.99', productId: 'tip_pitchin' },
  { label: 'Add some fuel', amount: '$4.99', productId: 'tip_addfuel' },
  { label: 'Power it forward', amount: '$9.99', productId: 'tip_powerforward' },
  { label: 'Back the mission', amount: '$24.99', gold: true, productId: 'tip_backmission' },
];

// Press-scale wrapper: dips to 0.97 on press-in, back to 1 on release (timing, not spring --
// matches the app's card-press standard). Gives the price boxes a tactile feel instead of a flat tap.
function PressScale({ onPress, style, wrapperStyle, children }: { onPress: () => void; style: any; wrapperStyle?: any; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(scale, { toValue: v, duration: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  return (
    <Animated.View style={[wrapperStyle ?? { flex: 1 }, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={() => to(0.97)} onPressOut={() => to(1)} onPress={onPress} style={style}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useTheme();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  // Derived gold (amber) tints from the theme token so it tracks the active theme.
  const goldBg = t.accentAmber + '18';
  const goldBorder = t.accentAmber + '44';
  // Emphasis run inside the mission paragraph: amber + semibold for warmth + rhythm on the key beats.
  const emph = { fontFamily: 'DMSans_600SemiBold' as const, color: t.accentAmber };

  const { isSupporter, offering, tipProducts, purchasePackage, purchaseTip, restore: restorePurchases } = useMembership();

  // Subscribe to the selected plan (monthly / annual).
  const handleSubscribe = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isSupporter) { showToast("You're already a Supporter", 'Thank you for keeping this going', 'success'); return; }
    const pkg = plan === 'monthly' ? offering?.monthly : offering?.annual;
    if (!pkg) { showToast("Purchases aren't available right now", 'Please try again in a moment', 'info'); return; }
    const res = await purchasePackage(pkg);
    if (res === 'success') showToast('Thank you for becoming a Supporter', 'Your support keeps this going', 'success');
    else if (res === 'error') showToast("Purchase didn't go through", 'Please try again', 'error');
    // cancelled = silent (the user backed out)
  };

  // One-time tip (consumable).
  const handleTip = async (productId: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const product = tipProducts.find(p => p.identifier === productId);
    if (!product) { showToast("Tips aren't available right now", 'Please try again in a moment', 'info'); return; }
    const res = await purchaseTip(product);
    if (res === 'success') showToast('Thank you for chipping in', 'Every bit helps keep this going', 'success');
    else if (res === 'error') showToast("Purchase didn't go through", 'Please try again', 'error');
  };

  const restore = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const ok = await restorePurchases();
    if (ok) showToast('Purchases restored', 'Welcome back, Supporter', 'success');
    else showToast('Nothing to restore', 'No active Supporter purchase found', 'info');
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: t.accentBlueRaw }]}>Support the Mission</Text>
        </View>

        {/* Mission paragraph -- treated as a personal note: amber left rule + soft wash, distinct from the
            feature cards below (which have full borders) so the "why" reads as intentional, not filler. */}
        <View style={[styles.missionCard, { backgroundColor: t.accentAmber + '10', borderColor: t.accentAmber + '66' }]}>
          <Text style={[styles.missionTitle, { color: t.accentAmber }]}>The Promise</Text>
          <Text style={[styles.mission, { color: t.textSecondary, paddingHorizontal: 0, marginBottom: 0 }]}>
            A lot of apps hide the basics behind a paywall: the barcode scanner, full macro tracking, even your
            sleep and recovery scores. Here,{' '}
            <Text style={emph}>they stay free</Text>. The one piece with a real cost to run is{' '}
            <Text style={emph}>the AI</Text>, the smarts behind Otto and Halo, your coaching, and the meal
            estimator. So if the app's been good to you,{' '}
            <Text style={emph}>a little support</Text> keeps it alive and moving forward.
          </Text>
          <Text style={[styles.missionClose, { color: t.accentAmber }]}>Either way, thank you for being part of this.</Text>
        </View>

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
                    {p.sprout
                      ? <SproutIcon size={20} color={p.gold ? t.accentAmber : t.accentBlue} />
                      : <Ionicons name={p.icon as any} size={15} color={p.gold ? t.accentAmber : t.accentBlue} />}
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
              <PressScale
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPlan('monthly'); }}
                style={[styles.price, {
                  borderColor: plan === 'monthly' ? t.accentBlue : t.borderCard,
                  backgroundColor: plan === 'monthly' ? t.accentBlueBg : t.bgInset,
                }]}
              >
                <Text style={[styles.priceAmt, { color: t.textSecondary }]}>$6.99</Text>
                <Text style={[styles.pricePer, { color: plan === 'monthly' ? t.accentBlue : t.textMuted }]}>per month</Text>
              </PressScale>
              <PressScale
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPlan('annual'); }}
                style={[styles.price, {
                  borderColor: plan === 'annual' ? t.accentBlue : t.borderCard,
                  backgroundColor: plan === 'annual' ? t.accentBlueBg : t.bgInset,
                }]}
              >
                <Text style={[styles.priceAmt, { color: t.textSecondary }]}>$69.99</Text>
                <Text style={[styles.pricePer, { color: plan === 'annual' ? t.accentBlue : t.textMuted }]}>per year</Text>
              </PressScale>
            </View>

            {isSupporter ? (
              <View style={[styles.supporterState, { backgroundColor: goldBg, borderColor: goldBorder }]}>
                <SproutIcon size={20} color={t.accentAmber} />
                <View>
                  <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: t.accentAmber }}>You're a Supporter</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: t.textMuted, marginTop: 1 }}>Thank you for keeping this going</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity activeOpacity={0.85} onPress={handleSubscribe} style={[styles.cta, { backgroundColor: t.accentBlue }]}>
                <Text style={styles.ctaText}>Become a Supporter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tip jar */}
        <View style={[styles.cardShadow, { shadowColor: '#000' }]}>
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw }]}>
            <Text style={[styles.eyebrow, { color: t.textMuted }]}>Support once</Text>
            <Text style={[styles.heading, { color: t.accentBlueRaw }]}>A one-time chip in</Text>
            <Text style={[styles.sub, { color: t.textMuted }]}>No subscription, no commitment. Every bit helps.</Text>

            {/* 2x2 grid: all four tiles equal size/format; the $24.99 stays gold as an option, not a push. */}
            <View style={styles.tipTiles}>
              {TIPS.map((tip) => (
                <PressScale
                  key={tip.label}
                  onPress={() => handleTip(tip.productId)}
                  wrapperStyle={styles.tipTileWrap}
                  style={[styles.tipTile, {
                    backgroundColor: tip.gold ? goldBg : t.accentBlueBg,
                    borderColor: tip.gold ? goldBorder : t.accentBlueBorder,
                  }]}
                >
                  <Text style={[styles.tipLabel, { color: tip.gold ? t.accentAmber : t.textMuted }]}>{tip.label}</Text>
                  <Text style={[styles.tipAmt, { color: tip.gold ? t.accentAmber : t.textSecondary }]}>{tip.amount}</Text>
                </PressScale>
              ))}
            </View>
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

  mission: { fontSize: 14.5, fontFamily: 'DMSans_500Medium', lineHeight: 23, paddingHorizontal: 4, marginBottom: 2, textAlign: 'center' },
  missionCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  missionTitle: { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 2.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 },
  missionClose: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', lineHeight: 20, textAlign: 'center', marginTop: 12 },

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
  supporterState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 13, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 16 },

  tipTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 0, marginBottom: 10 },
  tipTileWrap: { flexBasis: '47%', flexGrow: 1 },
  tipTile: { borderRadius: 14, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', gap: 2 },
  tipLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', textAlign: 'center', lineHeight: 14, minHeight: 15 },
  tipAmt: { fontSize: 23, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.5 },


  restoreBtn: { alignSelf: 'center', paddingTop: 6 },
  restore: { fontSize: 13.5, fontFamily: 'DMSans_600SemiBold' },
  legal: { fontSize: 10.5, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 15, paddingHorizontal: 20, marginTop: 2 },
});
