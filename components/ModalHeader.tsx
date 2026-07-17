import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import { PAGE_TITLE, Type } from '../typography';
import GradientTitle from './GradientTitle';

// ─── ModalHeader ──────────────────────────────────────────────────────────────
// The modal counterpart to ScreenHeader. Same discipline, DIFFERENT object.
//
// The title is LEFT-ALIGNED, matching the page titles. A modal's CONTENT is left-aligned (form labels,
// section headers, body copy all start at the left margin), so a centred title floats disconnected from
// its own grid -- and the page you opened the modal FROM has a left title too, so centring makes the
// title jump left->centre on open. The handle pill is the only thing that stays centred, because it is a
// universal grab affordance, not part of the text grid.
//
// Same face and colour as a page title (Clash, accent, mixed case) so a title reads as a title
// everywhere; smaller (20 vs 28) because a modal is a smaller surface.
//
// CLOSING: an explicit X in the top-right is the DEFAULT and the one unambiguous way out. The handle pill
// (drag/tap) and tap-outside are weak signals -- the pill's native meaning is "drag to dismiss", and
// tap-outside is invisible until discovered AND risks losing a half-typed form. The X guesses nothing.
// The X always WINS the corner; a screen's own action (a gear, an Edit) sits to its LEFT via `right`.

export default function ModalHeader({
  title,
  subtitle,
  subRow,
  onClose,
  right,
  color,
  showClose = true,
}: {
  title: string;                 // MIXED CASE. The component never uppercases.
  subtitle?: string;             // one quiet line under the title (e.g. HR Zones: "Indoor Walking · 35:47")
  subRow?: React.ReactNode;      // a second row under the title (e.g. Day Detail's ‹ date › nav)
  onClose?: () => void;          // the X and the handle pill both call this
  right?: React.ReactNode;       // a screen's own action, sits LEFT of the X
  color?: string;                // title colour override -- faith modals go amber
  showClose?: boolean;           // default true; set false only if a modal truly has no dismiss
}) {
  const { theme } = useTheme();
  const close = onClose ? () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onClose(); } : undefined;

  return (
    <View>
      {/* Handle pill -- centred grab affordance, also taps to close. */}
      <TouchableOpacity onPress={close} disabled={!close} style={styles.pillHit} hitSlop={{ top: 8, bottom: 8, left: 20, right: 20 }}>
        <View style={[styles.pill, { backgroundColor: theme.borderCard }]} />
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <GradientTitle
            title={title}
            color={color ?? theme.accentBlueRaw}
            style={[PAGE_TITLE, styles.title]}
            numberOfLines={1}
          />
          {subtitle ? (
            <Text numberOfLines={1} style={[styles.subtitle, { color: theme.textMuted, fontFamily: Type.ui }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={styles.slot}>{right}</View> : null}
        {showClose && close ? (
          <TouchableOpacity onPress={close} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {subRow ? <View style={styles.subRow}>{subRow}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pillHit: { alignSelf: 'center', paddingTop: 12, paddingBottom: 6, paddingHorizontal: 20 },
  pill:    { height: 4, width: 40, borderRadius: 2 },
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  // A modal is a smaller surface than a page, so the title steps down from 28 to 20. fontFamily/tracking
  // come from PAGE_TITLE so the face stays identical to the page titles. flex:1 so the title owns the row
  // and a right-slot action stays pinned to the edge.
  title:   { fontSize: 20 },
  subtitle:{ fontSize: 12, marginTop: 1 },
  slot:    { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  subRow:  { paddingHorizontal: 16, paddingTop: 8 },
});
