import React from 'react';
import { Text } from '@/components/AppText';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@/components/AppIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useMembership } from '../MembershipContext';
import SproutIcon from './SproutIcon';
import { FoilChip, FoilEdge, GOLD_EDGE, GOLD_TINT } from './SupporterFoil';
import { Type, numLine } from '../typography';
import GradientTitle from './GradientTitle';

// ─── Membership card ─────────────────────────────────────────────────────────
// ONE component, used by BOTH Profile > Membership and Settings > Membership, so the two can't drift.
// Two states of the same object:
//   SUPPORTER -- gold foil edge + hallmark + champagne tint, the plan as a pill, the REAL renewal date.
//   FREE      -- the same object in the user's accent (never gold: gold marks membership, and showing a
//                free user the badge they don't have empties the badge of meaning).
// Both tap through to /support.
//
// The date is real or absent. If RevenueCat gives us no period end (e.g. Justin's __DEV__ toggle, which
// has no entitlement behind it), the line falls back to the plan name -- never a placeholder date.

export default function MembershipCard() {
  const { theme } = useTheme();
  const { isSupporter, details } = useMembership();

  const plan = details?.plan === 'annual' ? 'Annual' : details?.plan === 'monthly' ? 'Monthly' : null;
  const periodEnd = details?.periodEnd
    ? details.periodEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  // ⚠️ THE 7-DAY TASTE KEEPS THE GOLD, ONLY THE WORDS CHANGE (SPEC_monetization.md). Showing someone exactly
  // what the paid state looks like is the entire point of the week. But calling them a Supporter would not be
  // true -- they have not supported anything yet -- and it quietly cheapens the word for people who actually
  // pay. "Ends" is also the cancelled-subscription voice and reads like a punishment seven days into a gift.
  const isFirstWeek = !!details?.isFirstWeek;
  // "Renews" is a promise. If they've cancelled, this date is when access ENDS -- say that instead.
  const dateLine = periodEnd
    ? isFirstWeek
      ? `Free week ends ${periodEnd}`
      : `${details?.willRenew ? 'Renews' : 'Ends'} ${periodEnd}`
    : null;

  return (
    // The shadow rides a WRAPPER. The card must clip (the tint layer and the 2.5px top edge strip both run
    // to the corners and would square them off), and a view that clips cannot cast a shadow -- iOS
    // masksToBounds deletes it. So this card had a shadow that never rendered. Same rule as IFCard, which
    // already solved it, and PrimaryCTA's glow wrapper. Theme tokens too: the old '#000' @0.10 was
    // invisible on Dark and the wrong hue on Light (whose shadow is navy).
    <View style={{ borderRadius: 14, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 }}>
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/support' as any); }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        // TINTED in both states -- champagne for a Supporter, the user's accent for a free user. A plain
        // bgCard fill made the free card the SAME color as its container on Settings (a settings section
        // is itself a card), so on Slate/Warm/Blush it vanished into the section. A tint always separates
        // from whatever it sits on, whichever theme is active.
        // ...EXCEPT the tint was the ONLY fill, and both tints are translucent (GOLD_TINT is 13%,
        // accentBlueBg ~10%). GOLD_TINT's own note says it is "a tint of the card, never a fill" -- and on
        // Profile there WAS no card under it, just the page, so the champagne wash sat on the accent bottom
        // glow and the card dissolved into the background (Justin, 2026-07-15). Same bug as Stats' VIEW ALL
        // ACHIEVEMENTS. Fix: give the tint the CARD it was written for -- an opaque bgCard base, with the
        // tint layered ON TOP (see the wash below). The tint keeps doing its separating job, it just has
        // something solid to do it against now.
        backgroundColor: theme.bgCard,
        borderWidth: 1, borderColor: isSupporter ? GOLD_EDGE : theme.accentBlueRaw + '55',
        borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14,
        overflow: 'hidden',
      }}
    >
      {/* The tint, now layered over the opaque bgCard base above rather than BEING the fill. First child so
          everything else (the foil edge, the chip, the text) sits on top of it. */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: isSupporter ? GOLD_TINT : theme.accentBlueBg }]}
        pointerEvents="none"
      />

      {/* Struck edge along the top: foil for a Supporter, the user's accent for a free user. */}
      {isSupporter
        ? <FoilEdge />
        : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, backgroundColor: theme.accentBlueRaw }} />}

      {/* Same chip object in both states -- gold leaf for a Supporter, the user's accent for a free user.
          A bare sprout floated in the row with nothing anchoring it. */}
      {isSupporter ? (
        <FoilChip size={34} />
      ) : (
        <View style={{
          width: 34, height: 34, borderRadius: 10, borderWidth: 1,
          borderColor: theme.accentBlueBorder, backgroundColor: theme.accentBlueBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <SproutIcon size={21} color={theme.accentBlue} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <GradientTitle
          title={isSupporter ? (isFirstWeek ? 'Your First Week' : "You're a Supporter") : 'Support the Mission'}
          color={isSupporter ? theme.textSecondary : theme.accentBlue}
          numberOfLines={1}
          style={{ fontSize: 20, fontFamily: Type.num, letterSpacing: 0.8, lineHeight: numLine(20) }}
        />

        {isSupporter ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {plan && (
              <View style={{
                backgroundColor: GOLD_TINT, borderWidth: 1, borderColor: GOLD_EDGE,
                borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{
                  fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 1.5,
                  color: theme.textSecondary, textTransform: 'uppercase',
                }}>
                  {plan}
                </Text>
              </View>
            )}
            {/* Semibold, to sit level with the bold caps pill beside it -- thin regular next to a bold
                pill read as two unrelated pieces of text. */}
            <Text style={{ fontSize: 12.5, fontFamily: Type.uiSemibold, color: theme.textMuted }}>
              {dateLine ?? 'Thank you for keeping this going'}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted, marginTop: 3 }}>
            Help keep the app going
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={isSupporter ? theme.textMuted : theme.accentBlue} />
    </TouchableOpacity>
    </View>
  );
}

// Pointer, not a second control: the gold-icon switch itself lives in Settings > Appearance (where anyone
// would instinctively look for it). Two toggles setting the same thing is how settings drift apart, so this
// just tells a Supporter the perk is theirs and takes them to it.
export function GoldIconRow() {
  const { theme } = useTheme();
  const { isSupporter } = useMembership();
  if (!isSupporter) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        router.push('/settings?section=appearance' as any);
      }}
      style={{
        // No top margin of its own -- the perk list above already ends with 18pt, and stacking another 12
        // on top left this floating well clear of the "Custom Badge & Icon" line it belongs to. Spacing is
        // the parent's job.
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: GOLD_TINT, borderWidth: 1, borderColor: GOLD_EDGE,
        borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12,
      }}
    >
      <Image
        source={require('../assets/images/icon-gold.png')}
        style={{ width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: GOLD_EDGE }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontFamily: Type.uiBold, color: theme.textSecondary }}>Gold App Icon</Text>
        <Text style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted, marginTop: 1 }}>
          Turn it on in Settings &gt; Appearance
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
    </TouchableOpacity>
  );
}
