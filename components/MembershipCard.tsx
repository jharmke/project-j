import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { useMembership } from '../MembershipContext';
import SproutIcon from './SproutIcon';
import { FoilChip, FoilEdge, GOLD_EDGE, GOLD_TINT } from './SupporterFoil';

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
  // "Renews" is a promise. If they've cancelled, this date is when access ENDS -- say that instead.
  const dateLine = periodEnd ? `${details?.willRenew ? 'Renews' : 'Ends'} ${periodEnd}` : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/support' as any); }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        // TINTED in both states -- champagne for a Supporter, the user's accent for a free user. A plain
        // bgCard fill made the free card the SAME color as its container on Settings (a settings section
        // is itself a card), so on Slate/Warm/Blush it vanished into the section. A tint always separates
        // from whatever it sits on, whichever theme is active.
        backgroundColor: isSupporter ? GOLD_TINT : theme.accentBlueBg,
        borderWidth: 1, borderColor: isSupporter ? GOLD_EDGE : theme.accentBlueRaw + '55',
        borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 3,
      }}
    >
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
        <Text style={{
          fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 0.8, lineHeight: 22,
          color: isSupporter ? theme.textSecondary : theme.accentBlue,
        }}>
          {isSupporter ? "You're a Supporter" : 'Support the Mission'}
        </Text>

        {isSupporter ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {plan && (
              <View style={{
                backgroundColor: GOLD_TINT, borderWidth: 1, borderColor: GOLD_EDGE,
                borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{
                  fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5,
                  color: theme.textSecondary, textTransform: 'uppercase',
                }}>
                  {plan}
                </Text>
              </View>
            )}
            {/* Semibold, to sit level with the bold caps pill beside it -- thin regular next to a bold
                pill read as two unrelated pieces of text. */}
            <Text style={{ fontSize: 12.5, fontFamily: 'DMSans_600SemiBold', color: theme.textMuted }}>
              {dateLine ?? 'Thank you for keeping this going'}
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 3 }}>
            Help keep the app going
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={isSupporter ? theme.textMuted : theme.accentBlue} />
    </TouchableOpacity>
  );
}
