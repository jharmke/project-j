// components/NotificationPanel.tsx
//
// The notification list for the Otto hub (SPEC_otto_notifications.md). A floating card OVERLAY
// inside AssistantChat (not its own Modal), anchored just inside Otto's chat panel (so it reads as
// Otto's sub-panel, not a card poking above it). House standard: opaque surface, accent top border,
// accent title, tap-to-close handle, spring scale-in, no bottom sheet / no banner.
//
// Each notification is a uniform-height CARD. Type B (stack) events of the same category collapse
// into ONE card with a real stacked-cards look (shadowed offset cards peeking behind) + a count;
// tapping expands into the individual cards, animated with Reanimated. The modal holds ONE fixed
// size so it never jumps. Unread items get an accent dot + rail. On close we mark read ONLY the
// items you actually saw (singles + groups you expanded); a collapsed group you never opened keeps
// its unread dots.

import { useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import Reanimated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useTheme } from '../theme';
import PrimaryCTA from './PrimaryCTA';
import TooltipIcon from './TooltipIcon';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import {
  useNotifications, markReadIds, clearNotification, clearAllNotifications, type NotifItem,
} from '../utils/notifications';
import { Type } from '../typography';
import GradientTitle from './GradientTitle';

const CARD_MIN_H = 70;

const CAT_LABEL: Record<string, string> = {
  achievement: 'Achievements',
  daily_goal: 'Daily Goals',
  record: 'Records',
  summary_ready: 'Summaries',
  whats_new: "What's New",
  tdee_suggestion: 'Suggestion',
  rate_us: 'Rate Us',
  feedback_prompt: 'Feedback',
};

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

type Entry =
  | { kind: 'single'; item: NotifItem; sort: number }
  | { kind: 'group'; category: string; items: NotifItem[]; sort: number };

function buildEntries(items: NotifItem[]): Entry[] {
  const byCat = new Map<string, NotifItem[]>();
  const entries: Entry[] = [];
  for (const it of items) {
    if (it.lifecycle === 'replace') { entries.push({ kind: 'single', item: it, sort: it.createdAt }); continue; }
    if (!byCat.has(it.category)) byCat.set(it.category, []);
    byCat.get(it.category)!.push(it);
  }
  for (const [category, list] of byCat) {
    const sorted = list.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (sorted.length === 1) entries.push({ kind: 'single', item: sorted[0], sort: sorted[0].createdAt });
    else entries.push({ kind: 'group', category, items: sorted, sort: sorted[0].createdAt });
  }
  entries.sort((a, b) => b.sort - a.sort);
  return entries;
}

export default function NotificationPanel({
  visible, onClose, onNavigate, topOffset = 120,
}: {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: { pathname: string; params?: Record<string, any> }) => void;
  topOffset?: number; // top of Otto's chat panel, so we anchor just inside it (not above it)
}) {
  const { theme } = useTheme();
  const { items } = useNotifications();
  const panelRef = useTutorialTarget('notif_panel'); // spotlight target for the notification-hub tour
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sessionExpanded = useRef<Set<string>>(new Set());

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const wasVisible = useRef(false);

  const screenH = Dimensions.get('window').height;
  const topPad = topOffset + 8;
  const contentH = Math.round(Math.max(280, Math.min(screenH * 0.6, screenH - topPad - 210)));

  if (visible && !wasVisible.current) {
    wasVisible.current = true;
    sessionExpanded.current = new Set();
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 9, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  } else if (!visible && wasVisible.current) {
    wasVisible.current = false;
    // Mark read ONLY what was actually seen: replace items, single-item categories (always visible),
    // and any group that was expanded this session. Collapsed-never-opened groups stay unread.
    const counts = new Map<string, number>();
    items.forEach(it => { if (it.lifecycle === 'stack') counts.set(it.category, (counts.get(it.category) || 0) + 1); });
    const seen = items.filter(it =>
      it.lifecycle === 'replace' || counts.get(it.category) === 1 || sessionExpanded.current.has(it.category),
    ).map(it => it.id);
    if (seen.length) markReadIds(seen);
    setExpanded(new Set());
    sessionExpanded.current = new Set();
  }

  const animateOut = (after: () => void) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.9, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => after());
  };

  const dismiss = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); animateOut(onClose); };

  const toggleGroup = (cat: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else { next.add(cat); sessionExpanded.current.add(cat); }
      return next;
    });
  };

  const tapItem = (n: NotifItem) => {
    if (!n.route) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const route = n.route;
    animateOut(() => { onClose(); onNavigate(route); });
  };

  const removeItem = (id: string) => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); clearNotification(id); };

  if (!visible) return null;

  const entries = buildEntries(items);

  const Card = (n: NotifItem, opts: { nested?: boolean } = {}) => (
    <Pressable
      onPress={() => tapItem(n)}
      style={({ pressed }) => [
        styles.card,
        // Solo (top-level) cards float with the same shadow the collapsed group cards use; nested cards
        // inside an expanded group stay flat so the group doesn't read as a pile of floating tiles.
        !opts.nested && styles.cardShadow,
        {
          backgroundColor: theme.bgInput, borderColor: theme.borderCard,
          borderLeftWidth: n.read ? 0.5 : 3, borderLeftColor: n.read ? theme.borderCard : theme.accentBlue,
          marginLeft: opts.nested ? 16 : 0, opacity: pressed && n.route ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.iconChip, { backgroundColor: (n.iconColor ?? theme.accentBlueRaw) + '22' }]}>
        <Ionicons name={(n.icon as any) ?? 'notifications'} size={17} color={n.iconColor ?? theme.accentBlue} />
      </View>
      <View style={{ flex: 1, paddingRight: 6 }}>
        <View style={styles.titleRow}>
          {!n.read && <View style={[styles.unreadDot, { backgroundColor: theme.accentBlue }]} />}
          <View style={{ flex: 1 }}>
            <GradientTitle title={n.title} color={theme.textSecondary} numberOfLines={1} style={styles.cardTitle} />
          </View>
        </View>
        {/* Rate Us / Feedback show full body text, untruncated -- both are 'replace' lifecycle
            (never more than one instance in the list at once, unlike stackable achievement/record
            cards), and the reasoning line ("why bother") is the point of the copy. */}
        {!!n.body && (
          <Text
            style={[styles.cardBody, { color: theme.textSecondary }]}
            numberOfLines={n.category === 'rate_us' || n.category === 'feedback_prompt' ? undefined : 2}
          >
            {n.body}
          </Text>
        )}
        <Text style={[styles.cardTime, { color: theme.textDim }]}>{relTime(n.createdAt)}</Text>
      </View>
      <Pressable onPress={() => removeItem(n.id)} hitSlop={10} style={styles.cardClear}>
        <Ionicons name="close" size={16} color={theme.textDim} />
      </Pressable>
    </Pressable>
  );

  const GroupCard = (category: string, groupItems: NotifItem[]) => {
    const isOpen = expanded.has(category);
    const top = groupItems[0];
    const rest = groupItems.length - 1;
    const anyUnread = groupItems.some(g => !g.read);

    if (isOpen) {
      return (
        <View>
          <Pressable
            onPress={() => toggleGroup(category)}
            style={({ pressed }) => [styles.card, { backgroundColor: theme.bgInput, borderColor: theme.borderCard, borderLeftWidth: anyUnread ? 3 : 0.5, borderLeftColor: anyUnread ? theme.accentBlue : theme.borderCard, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.iconChip, { backgroundColor: (top.iconColor ?? theme.accentBlueRaw) + '22' }]}>
              <Ionicons name={(top.icon as any) ?? 'notifications'} size={17} color={top.iconColor ?? theme.accentBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                {anyUnread && <View style={[styles.unreadDot, { backgroundColor: theme.accentBlue }]} />}
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{CAT_LABEL[category] ?? 'Updates'}</Text>
              </View>
              <Text style={[styles.cardBody, { color: theme.textSecondary }]}>{groupItems.length} total</Text>
            </View>
            <Ionicons name="chevron-up" size={18} color={theme.textDim} />
          </Pressable>
          {groupItems.map(n => (
            <Reanimated.View key={n.id} entering={FadeInDown.duration(190)} exiting={FadeOut.duration(120)} layout={LinearTransition.duration(200)}>
              {Card(n, { nested: true })}
            </Reanimated.View>
          ))}
        </View>
      );
    }

    return (
      <View style={{ marginBottom: 20 }}>
        {/* Cards peeking behind = a real stack. Render DEEPEST first so z-order cascades correctly
            (deepest card is the narrowest + lowest, front card is drawn last, on top of all). At most
            two peeks, and only one for a 2-item group, so the visual never overstates the count. */}
        {groupItems.length >= 3 && (
          <View pointerEvents="none" style={[styles.peek, { top: 14, bottom: -14, left: 16, right: 16, backgroundColor: theme.bgInput, borderColor: theme.borderCard }]} />
        )}
        <View pointerEvents="none" style={[styles.peek, { top: 8, bottom: -8, left: 8, right: 8, backgroundColor: theme.bgInput, borderColor: theme.borderCard }]} />
        <Pressable
          onPress={() => toggleGroup(category)}
          style={({ pressed }) => [
            styles.card, styles.cardShadow,
            { marginBottom: 0, backgroundColor: theme.bgInput, borderColor: theme.borderCard,
              borderLeftWidth: anyUnread ? 3 : 0.5, borderLeftColor: anyUnread ? theme.accentBlue : theme.borderCard,
              opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.iconChip, { backgroundColor: (top.iconColor ?? theme.accentBlueRaw) + '22' }]}>
            <Ionicons name={(top.icon as any) ?? 'notifications'} size={17} color={top.iconColor ?? theme.accentBlue} />
          </View>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <View style={styles.titleRow}>
              {anyUnread && <View style={[styles.unreadDot, { backgroundColor: theme.accentBlue }]} />}
              <View style={{ flex: 1 }}>
                <GradientTitle title={CAT_LABEL[category] ?? 'Updates'} color={theme.textSecondary} numberOfLines={1} style={styles.cardTitle} />
              </View>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary }]} numberOfLines={1}>
              {top.title}{rest > 0 ? `  ·  +${rest} more` : ''}
            </Text>
          </View>
          <View style={[styles.countPill, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}>
            <Text style={[styles.countText, { color: theme.accentBlue }]}>{groupItems.length}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={theme.textDim} style={{ marginLeft: 6 }} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={dismiss} />
      <View style={[styles.wrap, { paddingTop: topPad }]} pointerEvents="box-none">
        <Animated.View
          ref={panelRef as any}
          style={[
            styles.modal,
            { backgroundColor: theme.bgSheet, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, opacity, transform: [{ scale }] },
          ]}
        >
          <Pressable onPress={dismiss} hitSlop={12} style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.textDim }]} />
          </Pressable>

          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <GradientTitle title="Notifications" color={theme.accentBlueRaw} style={styles.title} />
              <TooltipIcon tooltipKey="notification_hub" size={15} />
            </View>
            {items.length > 0 && (
              <Pressable
                onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Clear all notifications?', 'This removes all of them for good.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear all', style: 'destructive', onPress: () => clearAllNotifications() },
                  ]);
                }}
                hitSlop={10}
              >
                <Text style={[styles.clearAll, { color: theme.accentBlue }]}>Clear all</Text>
              </Pressable>
            )}
          </View>

          <View style={{ height: contentH }}>
            {items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="notifications-outline" size={30} color={theme.textDim} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>You're all caught up</Text>
                <Text style={[styles.emptyBody, { color: theme.textDim }]}>Wins and updates will show up here as they happen.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
                {entries.map(e => (
                  <Reanimated.View key={e.kind === 'single' ? e.item.id : `grp_${e.category}`} layout={LinearTransition.duration(220)} exiting={FadeOut.duration(140)}>
                    {e.kind === 'single' ? Card(e.item) : GroupCard(e.category, e.items)}
                  </Reanimated.View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 }}>
            <PrimaryCTA label="Done" onPress={dismiss} faceStyle={{ paddingVertical: 14, borderRadius: 12 }} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 22 },
  modal: {
    width: '100%', maxWidth: 400, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 2.5, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 16,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3, opacity: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  title: { fontSize: 18, fontFamily: Type.display, letterSpacing: 0.3 },
  clearAll: { fontSize: 12, fontFamily: Type.uiSemibold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontFamily: Type.uiSemibold, marginBottom: 4 },
  emptyBody: { fontSize: 12.5, fontFamily: Type.ui, textAlign: 'center', lineHeight: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: CARD_MIN_H,
    borderRadius: 12, borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  iconChip: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontFamily: Type.uiBold },
  cardBody: { fontSize: 12.5, fontFamily: Type.ui, lineHeight: 17, marginTop: 1 },
  cardTime: { fontSize: 10.5, fontFamily: Type.uiMedium, marginTop: 3 },
  cardClear: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  peek: { position: 'absolute', borderRadius: 12, borderWidth: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4, elevation: 2 },
  peekBack: { opacity: 0.9 },
  countPill: { minWidth: 22, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontSize: 11, fontFamily: Type.uiBold },
});
