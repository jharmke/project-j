import React from 'react';
import { Text } from '@/components/AppText';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@/components/AppIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { PAGE_TITLE, Type } from '../typography';
import GradientTitle from './GradientTitle';

// ─── ScreenHeader ─────────────────────────────────────────────────────────────
// ONE header for every pushed screen in the app. Not a style guide -- an actual component, because a
// style guide is what we HAD and it drifted anyway.
//
// The 34 screens each hand-built their own header, and the result was: seven title sizes (20/22/24/26/
// 28/42/46), three cases (CAPS, Mixed, mixed), three back controls (bare chevron, chevron in a tinted
// BOX, the text "<- Back"), two faces (Clash on some, RAJDHANI -- the NUMBER face -- on Support and
// What's New), and titles centred on some screens and left on others.
//
// The size chaos in particular was a SYMPTOM, not the disease. 28px looked right on Achievements
// (chevron | title | small chip -- the title has room) and enormous on Add Food (a wide "<- Back" text
// button | title | TWO action buttons -- the title is crushed). Same number, different space. Tuning the
// numbers per screen would have been compensating for headers that were built wrong. Unify the layout and
// the size question disappears.
//
// A page title is ONE ROLE. Achievements' title is not doing a different job than Add Food's. Hierarchy
// belongs INSIDE a screen (hero number vs card label vs prose), never across screens for the same role.
//
// LAYOUT
//   [ ‹ ]  Title .......................... [ right slot ]
//   [ optional second row -- e.g. Day Detail's ‹ date › nav ]

export default function ScreenHeader({
  title,
  subtitle,
  right,
  subRow,
  onBack,
  onTitlePress,
  color,
  topInset = true,
  numberOfLines = 1,
}: {
  title: string;                     // MIXED CASE. Never shout. The component does not uppercase.
  subtitle?: string;                 // one quiet line under the title (Reports: "Build your own...")
  right?: React.ReactNode;           // the one action this screen offers, if any
  subRow?: React.ReactNode;          // a second row under the title (date nav, segmented control)
  onBack?: () => void;               // defaults to router.back()
  onTitlePress?: () => void;         // Settings' 7-tap dev unlock lives on the title itself
  // This screen's CHROME colour -- the title AND the back chevron. Faith screens pass amber: the page, the
  // content and the tab-bar icon all go amber there, so a cyan chevron was the last thing still arguing.
  // It used to colour the TITLE ONLY, which is why Justin kept seeing amber titles over accent chevrons.
  // Pass a BUTTON-SAFE colour (theme.accentBlue / theme.accentAmber), never accentBlueRaw: on light accents
  // (Blush yellow, Light pink) raw is the bright unreadable value that accentBlue exists to replace.
  color?: string;
  topInset?: boolean;                // false when a parent already paid the safe-area top
  numberOfLines?: number;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.header,
      { borderBottomColor: theme.borderCard, paddingTop: (topInset ? insets.top : 0) + 8 },
    ]}>
      <View style={styles.row}>
        {/* BARE chevron. Never boxed: a tinted box reads as an ACTION, and Back is not an action, it is
            the way out. Never the text "<- Back" either -- that is a word doing an icon's job. The 44x44
            hit area is the standard; marginLeft pulls the GLYPH back to the margin so the title lines up
            with the content below it, without shrinking the target. */}
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); (onBack ?? router.back)(); }}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={color ?? theme.accentBlue} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={onTitlePress ? 0.7 : 1}
          disabled={!onTitlePress}
          onPress={onTitlePress}
          style={styles.title}
        >
          <GradientTitle
            title={title}
            color={color ?? theme.accentBlueRaw}
            style={PAGE_TITLE}
            numberOfLines={numberOfLines}
          />
          {subtitle ? (
            <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: Type.ui, color: theme.textMuted, marginTop: 1 }}>
              {subtitle}
            </Text>
          ) : null}
        </TouchableOpacity>

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>

      {subRow ? <View style={styles.subRow}>{subRow}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header:  { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 0.5 },
  row:     { flexDirection: 'row', alignItems: 'center' },
  back:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  // flex:1 so the title OWNS the space between the chevron and the action, and a long one truncates
  // instead of shoving the action off the edge.
  title:   { flex: 1, marginLeft: 2 },
  right:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  subRow:  { marginTop: 8 },
});
