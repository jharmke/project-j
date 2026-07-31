import { Ionicons } from '@/components/AppIcons';
import { Text } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useToast } from '../components/Toast';
import SproutIcon from '../components/SproutIcon';
import PrimaryCTA from '../components/PrimaryCTA';
import GradientNumber from '../components/GradientNumber';
import { GoldIconRow } from '../components/MembershipCard';
import { FoilChip, FoilEdge, GOLD_BASE, GOLD_DEEP, GOLD_EDGE, GOLD_ENGRAVE, GOLD_HI, GOLD_TINT } from '../components/SupporterFoil';
import { useMembership } from '../MembershipContext';
import { Type, numLine } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';

// ─── Support the Mission (the reframed paywall) ──────────────────────────────
// Copy locked in SPEC_monetization.md (DECISIONS #4). This renders the FREE-user
// state (the pitch). Purchase buttons are STUBBED until RevenueCat is wired in;
// they fire a toast so the screen is fully testable without the payment layer.
// Uses live theme tokens so it adapts across all 5 themes + accents.
// Mode-agnostic (no health data / scores), so no Mindful or faith-tier variant.

// Gold lives in components/SupporterFoil (one source of truth: Support screen + Profile + Settings).

type Perk = { icon: string; title: string; body: string; gold?: boolean; sprout?: boolean };

// ⚠️ KEEP IN STEP WITH THE ONBOARDING FREE-WEEK BLOCK (app/onboarding/all-set.tsx) AND THE STEP-DOWN NOTICE.
// All three describe the same tier, and a user reads them a week apart -- if the numbers or the wording drift,
// the step-down stops reading as a promise kept. Rewritten 2026-07-31 after item A: the two Otto lines are new
// and go FIRST, because building things is now the actual reason to subscribe.
const PERKS: Perk[] = [
  { icon: 'sparkles', title: 'Otto Gets To Work', body: "He works from everything you've logged, and builds workouts into your Workout tab and meals from food you actually eat." },
  { icon: 'chatbubbles', title: 'More AI Room', body: '30 messages a day with Otto and Halo, and 100 meal estimates a month.' },
  { icon: 'bar-chart', title: 'Deeper Reports', body: 'Custom Reports, Comparison, and your full Effort vs Results.' },
  { icon: 'albums', title: 'Room To Build', body: 'Higher limits on custom foods, recipes, saved meals and your exercise library.' },
  // sprout: renders the real gold Supporter sprout (the actual badge), not an Ionicon -- previews the exact perk.
  { icon: 'leaf', sprout: true, title: 'Custom Badge & Icon', body: 'A token of thanks for helping keep this going.', gold: true },
];

type Tip = { label: string; amount: string; gold?: boolean; productId: string };

// The perk list, ONE definition rendered in both states. It used to live inline in the free-state pitch
// only, so a paying Supporter had no way to see what they were paying for -- which is exactly the
// question someone asks the month their annual renewal is due. Extracted rather than copied: a second
// inline copy is how the two Today's Message cards drifted apart, and the two weight-achievement paths,
// and the fourteen copies of the nutrient maths.
function PerksList({ t }: { t: any }) {
  return (
    <View style={styles.perks}>
      {PERKS.map((p) => (
        <View key={p.title} style={styles.perk}>
          {/* "Custom Badge & Icon" promises TWO things, so it shows two: the real gold foil badge AND the
              real gold app icon. A free user sees exactly what they'd get, not an approximation of half
              of it. Every other perk shows its single accent glyph. */}
          {/* ONE icon per row, same 30px slot as every other perk, so all four titles line up without any
              layout trickery. This row used to render the sprout badge AND the app icon side by side --
              two icons where every other row has one, which threw the alignment off and then looked
              broken when they were overlapped to fix it. The gold app icon alone says it. */}
          {p.gold ? (
            <Image
              source={require('../assets/images/icon-gold.png')}
              style={[styles.perkIcon, { borderColor: GOLD_EDGE }]}
            />
          ) : (
            <View style={[styles.perkIcon, { backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder }]}>
              <Ionicons name={p.icon as any} size={15} color={t.accentBlue} />
            </View>
          )}
          <View style={styles.perkText}>
            <Text style={[styles.perkTitle, { color: t.textSecondary }]}>{p.title}</Text>
            <Text style={[styles.perkBody, { color: t.textSecondary }]}>{p.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const TIPS: Tip[] = [
  { label: 'Pitch in', amount: '$2.99', productId: 'tip_pitchin' },
  { label: 'Add some fuel', amount: '$4.99', productId: 'tip_addfuel' },
  { label: 'Power it forward', amount: '$9.99', productId: 'tip_powerforward' },
  { label: 'Back the mission', amount: '$24.99', productId: 'tip_backmission' },
  // The gold foil marks the TOP tip, so it moved here when Founder was added -- two gold tiles would
  // cancel each other out and mark nothing. The amount is only a fallback while the store loads; the
  // real price comes from App Store Connect via tipPrice(), so it can never drift from what Apple charges.
  { label: 'Founder', amount: '$49.99', gold: true, productId: 'tip_founder' },
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

  // Emphasis run inside the mission paragraph: the user's accent + semibold, so the key beats tie to the
  // page instead of introducing a third hue.
  const emph = { fontFamily: Type.uiSemibold, color: t.accentBlue };

  const { isSupporter, details, offering, tipProducts, purchasePackage, purchaseTip, restore: restorePurchases } = useMembership();

  // LIVE prices from the store, never hardcoded: if a price ever changes in App Store Connect, a
  // hardcoded string would keep showing the old number while Apple charged the new one.
  // Falls back to the known price only while the offering is still loading.
  const monthlyPrice = offering?.monthly?.product?.priceString ?? '$9.99';
  const annualPrice = offering?.annual?.product?.priceString ?? '$89.99';
  const tipPrice = (productId: string, fallback: string) =>
    tipProducts.find(p => p.identifier === productId)?.priceString ?? fallback;

  // What annual actually SAVES vs paying monthly for a year. Computed from the LIVE store prices, so it
  // can never drift from what Apple charges. Null (and the line is hidden) if either price is missing --
  // an invented saving would be exactly the kind of number we don't show.
  const annualSaving = (() => {
    const m = offering?.monthly?.product;
    const a = offering?.annual?.product;
    if (!m?.price || !a?.price) return null;
    const saved = m.price * 12 - a.price;
    if (saved <= 0) return null;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: a.currencyCode }).format(saved);
    } catch {
      return `$${saved.toFixed(2)}`;
    }
  })();

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  // Upgrade monthly -> annual. Same subscription group, so this is Apple's own plan-change flow:
  // annual is ranked the HIGHER service level, so it takes effect immediately and Apple credits the
  // unused part of the current month. No cancel-then-resubscribe.
  const handleChangePlan = async () => {
    if (busy) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const pkg = offering?.annual;
    if (!pkg) { showToast("Plan changes aren't available right now", 'Please try again in a moment', 'info'); return; }
    setBusy('change');
    try {
      const res = await purchasePackage(pkg);
      if (res === 'success') showToast("You're on the annual plan", 'Thank you for the support', 'success');
      else if (res === 'error') showToast("Plan change didn't go through", 'Please try again', 'error');
    } finally {
      setBusy(null);
    }
  };

  // Which purchase action is in flight: 'sub' | 'restore' | a tip product id. StoreKit takes a beat to
  // fetch the product and build the sheet (seconds on a cold/slow network), and without this the button
  // looked dead -- so people tap it twice. `busy` both drives the spinner AND locks out a second tap.
  const [busy, setBusy] = useState<string | null>(null);

  // Subscribe to the selected plan (monthly / annual).
  const handleSubscribe = async () => {
    if (busy) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (isSupporter) { showToast("You're already a Supporter", 'Thank you for keeping this going', 'success'); return; }
    const pkg = plan === 'monthly' ? offering?.monthly : offering?.annual;
    if (!pkg) { showToast("Purchases aren't available right now", 'Please try again in a moment', 'info'); return; }
    setBusy('sub');
    try {
      const res = await purchasePackage(pkg);
      if (res === 'success') showToast('Thank you for becoming a Supporter', 'Your support keeps this going', 'success');
      else if (res === 'error') showToast("Purchase didn't go through", 'Please try again', 'error');
      // cancelled = silent (the user backed out)
    } finally {
      setBusy(null);
    }
  };

  // One-time tip (consumable).
  const handleTip = async (productId: string) => {
    if (busy) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const product = tipProducts.find(p => p.identifier === productId);
    if (!product) { showToast("Tips aren't available right now", 'Please try again in a moment', 'info'); return; }
    setBusy(productId);
    try {
      const res = await purchaseTip(product);
      if (res === 'success') showToast('Thank you for chipping in', 'Every bit helps keep this going', 'success');
      else if (res === 'error') showToast("Purchase didn't go through", 'Please try again', 'error');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (busy) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setBusy('restore');
    try {
      const ok = await restorePurchases();
      if (ok) showToast('Purchases restored', 'Welcome back, Supporter', 'success');
      else showToast('Nothing to restore', 'No active Supporter purchase found', 'info');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <BackgroundLayers />
      <ScreenHeader title={"Support the Mission"} />
      
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Mission paragraph -- a personal note, wearing the SAME gold foil edge as the membership card so
            the two "mission" surfaces read as a family. Was amber-washed with amber text: amber is the
            app's WARNING color, so the page's most heartfelt card was painted in caution paint, and it
            fought both the accent and the gold. Foil edge + clean card + accent emphasis instead. */}
        <View style={[styles.cardShadow, { shadowColor: t.cardShadow, shadowOpacity: t.cardShadowOpacity }]}>
        <View style={[styles.missionCard, { backgroundColor: t.bgCard, borderColor: GOLD_EDGE }]}>
          <LinearGradient
            colors={[GOLD_DEEP, GOLD_HI, GOLD_BASE]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.foilEdge}
          />
          {/* Same heading treatment as "You're a Supporter" so the two foil-edged cards read as the same
              species. It was a tiny centred eyebrow next to a big left-aligned Bebas heading -- same hat,
              different voice, which is why it felt out of place. */}
          {/* The membership card's heading sits in a row beside a 42px chip, so it gets natural air above
              and below. This heading has none, so it gets matching breathing room by hand. */}
          <Text style={[styles.heading, { color: t.textSecondary, marginTop: 6, marginBottom: 14 }]}>The Promise</Text>
          <Text style={[styles.mission, { color: t.textSecondary, paddingHorizontal: 0, marginBottom: 0, textAlign: 'left' }]}>
            A lot of apps hide the basics behind a paywall: the barcode scanner, full macro tracking, even your
            sleep and recovery scores. Here,{' '}
            <Text style={emph}>they stay free</Text>. The one piece with a real cost to run is{' '}
            <Text style={emph}>the AI</Text>, the smarts behind Otto and Halo, your coaching, and the meal
            estimator. So if the app's been good to you,{' '}
            <Text style={emph}>a little support</Text> keeps it alive and moving forward.
          </Text>
          <Text style={[styles.missionClose, { color: t.accentBlue, textAlign: 'left' }]}>Either way, thank you for being part of this.</Text>
        </View>
        </View>

        {/* SUPPORTER STATE: the membership card. Replaces the whole pitch -- no price boxes, no perks
            list, no CTA. They already bought; keeping the sales pitch up is exactly the "we still want
            your money" move this model rejects. Just their membership, stated plainly. NO thank-you
            subline (decided 2026-07-13: the mission paragraph above already says it, and a third thank-you
            inside the receipt tips into sappy). Rows only render on REAL entitlement data -- the __DEV__
            toggle has no dates, and a placeholder date would be a lie. */}
        {isSupporter ? (
          <View style={[styles.cardShadow, { shadowColor: t.cardShadow, shadowOpacity: t.cardShadowOpacity }]}>
            {/* A NORMAL themed card wearing gold FOIL: the leaf chip + the top edge, both gradients.
                No flat gold anywhere, so nothing can read as mustard. The type stays in theme ink. */}
            <View style={[styles.memberCard, { backgroundColor: t.bgCard, borderColor: GOLD_EDGE }]}>
              <LinearGradient
                colors={[GOLD_DEEP, GOLD_HI, GOLD_BASE]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.foilEdge}
              />

              {/* Emblem on the RIGHT, like a hallmark. On the left it shoved the heading inward, so this
                  was the one card whose title didn't start on the same left edge as the others. */}
              <View style={styles.memberHead}>
                <Text style={[styles.heading, { color: t.textSecondary, marginBottom: 0 }]}>
                  {details?.isFirstWeek ? 'Your First Week' : "You're a Supporter"}
                </Text>
                <FoilChip size={36} />
              </View>

              {details && (
                <View style={[styles.memberRows, { borderTopColor: t.borderCard }]}>
                  {details.plan && (
                    <View style={styles.memberRow}>
                      <Text style={[styles.memberLabel, { color: t.textMuted }]}>Plan</Text>
                      <Text style={[styles.memberValue, { color: t.textSecondary }]}>
                        {details.plan === 'annual' ? 'Annual' : 'Monthly'}
                      </Text>
                    </View>
                  )}
                  {/* Hidden during the free week: "Member since" today is noise when the END date is on the
                      very next line, and they are not a member yet anyway. */}
                  {!details.isFirstWeek && fmtDate(details.memberSince) && (
                    <View style={styles.memberRow}>
                      <Text style={[styles.memberLabel, { color: t.textMuted }]}>Member since</Text>
                      <Text style={[styles.memberValue, { color: t.textSecondary }]}>{fmtDate(details.memberSince)}</Text>
                    </View>
                  )}
                  {/* Cancelled but still inside the paid period: this date is when access ENDS, not a
                      renewal. Saying "Renews on" to someone who just cancelled would be a lie.
                      ⚠️ And the 7-day taste is a THIRD case: it also does not renew, but "Ends on" is the
                      cancelled-subscription voice and reads like a punishment to someone mid-gift. */}
                  {/* ⚠️ ONE LINE DURING THE TASTE, not a label/value row. The two-column layout only reads as a
                      table because the paid state stacks THREE rows into a column. On its own, a single label
                      sits stranded on the left with the date all the way across the card and a canyon between
                      them. As one sentence there is nothing to strand. */}
                  {fmtDate(details.periodEnd) && (
                    details.isFirstWeek ? (
                      <View style={styles.memberRow}>
                        <Text style={[styles.memberValue, { color: t.textSecondary }]}>
                          Free week ends: {fmtDate(details.periodEnd)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.memberRow}>
                        <Text style={[styles.memberLabel, { color: t.textMuted }]}>
                          {details.willRenew ? 'Renews on' : 'Ends on'}
                        </Text>
                        <Text style={[styles.memberValue, { color: t.textSecondary }]}>{fmtDate(details.periodEnd)}</Text>
                      </View>
                    )
                  )}
                </View>
              )}

              {/* Monthly only: annual has nothing to switch to. Apple's own plan-change flow.
                  A ROW, not a centred pill: rows read as account management, centred pills read as ads.
                  It also finally STATES the saving -- the entire reason to switch was invisible before. */}
              {details?.plan === 'monthly' && (
                <PressScale
                  onPress={handleChangePlan}
                  wrapperStyle={{ marginTop: 14 }}
                  style={[styles.changePlan, {
                    backgroundColor: t.accentBlueBg, borderColor: t.accentBlueBorder,
                    opacity: busy && busy !== 'change' ? 0.5 : 1,
                  }]}
                >
                  {busy === 'change'
                    ? <ActivityIndicator size="small" color={t.accentBlue} />
                    : (
                      <>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.changePlanText, { color: t.accentBlue }]}>Switch to Annual</Text>
                          {annualSaving && (
                            <Text style={[styles.changePlanSub, { color: t.textMuted }]}>
                              {annualPrice} a year. Save {annualSaving}.
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={t.accentBlue} />
                      </>
                    )}
                </PressScale>
              )}

              {/* What they're paying for. The card was a receipt -- plan, dates, icon -- which is fine on
                  day one and useless eleven months later when the renewal is about to land and they
                  wonder what they're actually getting. Same list as the pitch, stated rather than sold:
                  "What you get", not "As a thank you, Supporters get". */}
              <View style={[styles.memberPerks, { borderTopColor: t.borderCard }]}>
                {/* `eyebrow`, the same small uppercase label every card in the app uses for a section.
                    This was sentence-case body text, which read as a stray line rather than a heading. */}
                {/* During the 7-day taste there is no support to be included with, so say what is true.
                    Still STATED rather than sold, same as the paid version. */}
                <Text style={[styles.eyebrow, { color: t.textMuted, marginBottom: 16 }]}>
                  {details?.isFirstWeek ? "What's included this week" : 'Included with your support'}
                </Text>
                <PerksList t={t} />

                {/* The gold icon is theirs -- point them at the switch (which lives in Appearance).
                    Sits UNDER the perk list, directly below the "Custom Badge & Icon" line it acts on.
                    Above the list it broke the card in half between the dates and what you get.
                    ⚠️ The wrapper's marginBottom cancels memberPerks' own -18, which was fine when the perk
                    list ended this block but clips whatever sits last now. */}
                <View style={{ marginBottom: 22 }}>
                  <GoldIconRow />

                  {/* Last thing on the card, as a footnote. The pitch card and the price boxes are hidden
                      while they are entitled, so during the taste a motivated user goes looking to subscribe
                      and finds nothing. Deliberate -- buying on day two throws away days they already have --
                      but silence reads as a dead end, so say why. */}
                  {details?.isFirstWeek && (
                    <Text style={[styles.memberNote, { color: t.textMuted }]}>
                      Subscription options open up when your week ends.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        ) : (
        /* FREE STATE: the pitch. */
        <View style={[styles.cardShadow, { shadowColor: t.cardShadow, shadowOpacity: t.cardShadowOpacity }]}>
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw }]}>
            <Text style={[styles.heading, { color: t.textSecondary }]}>Become a Supporter</Text>
            <Text style={[styles.sub, { color: t.textMuted }]}>As a thank you, Supporters get:</Text>
            <PerksList t={t} />

            {/* Price selection -- LIVE priceString from the store, not hardcoded. */}
            <View style={styles.prices}>
              <PressScale
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPlan('monthly'); }}
                style={[styles.price, {
                  borderColor: plan === 'monthly' ? t.accentBlue : t.borderCard,
                  backgroundColor: plan === 'monthly' ? t.accentBlueBg : t.bgInset,
                }]}
              >
                <GradientNumber value={monthlyPrice} color={t.textSecondary} style={styles.priceAmt} />
                <Text style={[styles.pricePer, { color: plan === 'monthly' ? t.accentBlue : t.textMuted }]}>per month</Text>
              </PressScale>
              <PressScale
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPlan('annual'); }}
                style={[styles.price, {
                  borderColor: plan === 'annual' ? t.accentBlue : t.borderCard,
                  backgroundColor: plan === 'annual' ? t.accentBlueBg : t.bgInset,
                }]}
              >
                <GradientNumber value={annualPrice} color={t.textSecondary} style={styles.priceAmt} />
                <Text style={[styles.pricePer, { color: plan === 'annual' ? t.accentBlue : t.textMuted }]}>per year</Text>
              </PressScale>
            </View>

            {/* The app's primary solid-fill button (components/PrimaryCTA). */}
            <PrimaryCTA
              label="Become a Supporter"
              onPress={handleSubscribe}
              icon={<SproutIcon size={18} color="#ffffff" />}
              busy={busy === 'sub'}
              disabled={!!busy && busy !== 'sub'}
            />
          </View>
        </View>
        )}

        {/* Tip jar */}
        <View style={[styles.cardShadow, { shadowColor: t.cardShadow, shadowOpacity: t.cardShadowOpacity }]}>
          <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.borderCard, borderTopColor: t.accentBlueRaw }]}>
            <Text style={[styles.heading, { color: t.textSecondary }]}>A One-Time Chip In</Text>
            <Text style={[styles.sub, { color: t.textMuted }]}>No subscription, no commitment. Every bit helps.</Text>

            {/* Wrapping grid, every tile the same size whatever the count; the top tip is gold as an
                option, not a push. An odd count leaves the last tile centred, not stretched. */}
            <View style={styles.tipTiles}>
              {TIPS.map((tip) => (
                <PressScale
                  key={tip.label}
                  onPress={() => handleTip(tip.productId)}
                  wrapperStyle={styles.tipTileWrap}
                  style={[styles.tipTile, {
                    // Champagne: gold at low alpha = a TINT of the card, not a gold fill, so it can't go
                    // mustard. Keeps the tile in family with the other three (all tinted) instead of
                    // reading as an empty/failed tile the way a plain white face did.
                    backgroundColor: tip.gold ? GOLD_TINT : t.accentBlueBg,
                    borderColor: tip.gold ? GOLD_EDGE : t.accentBlueBorder,
                    opacity: busy && busy !== tip.productId ? 0.5 : 1,
                  }]}
                >
                  {/* The top tip is MARKED, not shouted: clean card face + a gold foil edge. A full gold
                      face made the most expensive ask the loudest object on a page whose whole point is
                      "an option, not a push" -- and it made gold mean MONEY, when gold has to mean
                      membership. Foil edge marks the tier without pushing it. */}
                  {tip.gold && (
                    <LinearGradient
                      colors={[GOLD_DEEP, GOLD_HI, GOLD_BASE]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.foilEdge}
                    />
                  )}
                  <Text style={[styles.tipLabel, { color: t.textMuted }]}>{tip.label}</Text>
                  {busy === tip.productId
                    ? <ActivityIndicator size="small" color={t.accentBlue} style={styles.tipSpinner} />
                    : <GradientNumber value={tipPrice(tip.productId, tip.amount)} color={t.textSecondary} style={styles.tipAmt} />}
                </PressScale>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={restore}
          disabled={!!busy}
          style={[styles.restoreBtn, { opacity: busy && busy !== 'restore' ? 0.5 : 1 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {busy === 'restore'
            ? <ActivityIndicator size="small" color={t.accentBlue} />
            : <Text style={[styles.restore, { color: t.textSecondary }]}>Restore Purchases</Text>}
        </TouchableOpacity>
        <Text style={[styles.legal, { color: t.textMuted }]}>Payments are handled by the App Store. Cancel anytime in Settings.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 15, fontFamily: Type.ui },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  hero: { paddingHorizontal: 4, paddingBottom: 2 },
  heroTitle: { fontSize: 46, fontFamily: Type.num, letterSpacing: 2, lineHeight: numLine(46) },

  mission: { fontSize: 14.5, fontFamily: Type.uiMedium, lineHeight: 23, paddingHorizontal: 4, marginBottom: 2, textAlign: 'center' },
  // Padding + radius match memberCard exactly so the two foil cards line up edge for edge.
  missionCard: { borderWidth: 1, borderRadius: 14, padding: 16, overflow: 'hidden' },
  missionTitle: { fontSize: 11, fontFamily: Type.uiBold, letterSpacing: 2.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 },
  missionClose: { fontSize: 14, fontFamily: Type.uiSemibold, lineHeight: 20, textAlign: 'center', marginTop: 12 },

  // The wrapper pattern is already right here (the card below clips, so it cannot cast). Only the VALUES
  // were off: opacity 0.12 with a tight 2/8 blur is about a third of a normal card, and the render sites
  // passed a hardcoded '#000' -- wrong hue on Light (navy), invisible on Dark. shadowColor/shadowOpacity
  // now come from the theme at each render site.
  cardShadow: { borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  card: { borderRadius: 14, borderWidth: 0.5, borderTopWidth: 1.5, padding: 16, overflow: 'hidden' },

  eyebrow: { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  heading: { fontSize: 26, fontFamily: Type.num, letterSpacing: 1, lineHeight: numLine(26) },
  sub: { fontSize: 12.5, fontFamily: Type.uiSemibold, marginTop: 4, marginBottom: 16 },

  perks: { gap: 14, marginBottom: 18 },
  // Separated from the plan/dates block above by a rule, so the card reads as receipt-then-benefits
  // rather than one long undifferentiated list. Negative bottom margin cancels `perks`' own 18.
  // marginTop 4, not 16: the rows above already carry 9pt of their own vertical padding, so 16 on top of
  // that left the date row sitting hard against the divider above it and floating away from the one below.
  // 4 matches memberRows' own paddingTop, so the block is symmetric whether it holds one row or three.
  memberPerks: { marginTop: 4, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, marginBottom: -18 },
  perk: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  perkIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1, overflow: 'hidden' },
  perkText: { flex: 1 },
  perkTitle: { fontSize: 14.5, fontFamily: Type.uiBold, marginBottom: 2 },
  perkBody: { fontSize: 13, fontFamily: Type.ui, lineHeight: 18 },

  prices: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  price: { flex: 1, borderRadius: 13, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center' },
  priceAmt: { fontSize: 22, fontFamily: Type.num, letterSpacing: 0.5 },
  pricePer: { fontSize: 11, fontFamily: Type.uiSemibold, marginTop: 1 },

  // Supporter membership card (dark object; see the palette block up top).
  memberCard: { borderRadius: 14, borderWidth: 1, padding: 16, overflow: 'hidden' },
  foilEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5 },
  memberHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  memberSprout: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  memberRows: { borderTopWidth: 0.5, marginTop: 12, paddingTop: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  memberLabel: { fontSize: 13, fontFamily: Type.ui },
  memberValue: { fontSize: 14, fontFamily: Type.uiSemibold },
  memberNote: { fontSize: 12, fontFamily: Type.ui, lineHeight: 17, paddingTop: 12, textAlign: 'center' },
  changePlan: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
  },
  changePlanText: { fontSize: 14, fontFamily: Type.uiBold },
  changePlanSub: { fontSize: 12, fontFamily: Type.ui, marginTop: 2 },
  // Accent-tinted glow (shadowColor is set per-theme at the call site) -- lives on a WRAPPER because
  // the button itself needs overflow:hidden to clip the sheen, which would clip a shadow too.
  ctaGlow: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  cta: { borderRadius: 13, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  // Bebas caps, like the card headings -- DMSans bold 15 was the same weight as body copy, which is why
  // the label read as plain text sitting on a colored rectangle.
  ctaText: { fontSize: 19, fontFamily: Type.uiBold, letterSpacing: 1.2, color: '#ffffff' },
  supporterState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 13, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 16 },

  // justifyContent centre so an ODD number of tips leaves the last one centred rather than left-hung.
  // Full rows are unaffected: two tiles at 47% plus the gap already fill the width.
  tipTiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 0, marginBottom: 10, justifyContent: 'center' },
  // flexGrow is set per-tile now. It used to be 1 for everything, which was invisible while the count was
  // even -- add a fifth tip and the lone tile stretched to the full width, making the most expensive ask
  // the biggest object on the page. Every tile is the same size regardless of how many there are.
  tipTileWrap: { flexBasis: '47%' },
  tipTile: { borderRadius: 14, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', gap: 2, overflow: 'hidden' },
  tipLabel: { fontSize: 11, fontFamily: Type.uiSemibold, textAlign: 'center', lineHeight: 14, minHeight: 15 },
  tipAmt: { fontSize: 23, fontFamily: Type.num, letterSpacing: 0.5 },
  // Matches the tipAmt line box so swapping in the spinner doesn't resize the tile.
  tipSpinner: { height: 28 },


  restoreBtn: { alignSelf: 'center', paddingTop: 6 },
  restore: { fontSize: 13.5, fontFamily: Type.uiSemibold },
  legal: { fontSize: 10.5, fontFamily: Type.ui, textAlign: 'center', lineHeight: 15, paddingHorizontal: 20, marginTop: 2 },
});
