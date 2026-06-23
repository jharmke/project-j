import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';
import ToggleSwitch from './ToggleSwitch';
import {
  VERSES, presetKey, customKey, loadVersePool, saveVersePool, getAllVerses, resolveDailyVerse,
  DEFAULT_POOL, type VersePool, type CustomVerse, type DailyVerse,
} from '../data/verses';

// Manage the Today's Message pool. Opened from the gear on the Today's Message card (both the
// Home faith hub card and the Faith tab card). Centered floating card per the modal standard:
// spring scale + opacity fired in onShow, handle pill, overlay tap-to-dismiss, amber accent.
// Changes persist live to pj_verse_pool (so nothing is ever lost) and the card re-resolves its
// verse on close through onChanged. No double dashes in any user-facing string (project rule).

interface Props {
  visible: boolean;
  onClose: () => void;
  onChanged?: (verse: DailyVerse) => void;
}

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Count of verses actually in rotation for a prospective pool (raw, no empty-pool fallback), so
// the guards can refuse any action that would leave the rotation with nothing in it.
const rawActiveCount = (p: VersePool) =>
  VERSES.filter(v => !p.disabledPresets.includes(v.reference)).length + p.customVerses.length;

// A signature of what actually affects the displayed verse, so we only report a change when one
// truly happened. The pinned verse is ignored while cycling, so flipping to Pin one and back to
// Cycle daily nets no change and fires no toast.
const sigOf = (p: VersePool) => JSON.stringify({
  m: p.mode,
  d: [...p.disabledPresets].sort(),
  c: p.customVerses.map(x => x.id),
  p: p.mode === 'static' ? p.pinnedKey : null,
});

export default function VersePoolModal({ visible, onClose, onChanged }: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [pool, setPool] = useState<VersePool>({ ...DEFAULT_POOL });
  const [expanded, setExpanded] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<CustomVerse | null>(null);
  const initialSig = useRef('');

  const open = () => {
    setExpanded(false);
    setConfirmRemove(null);
    loadVersePool()
      .then(p => { setPool(p); initialSig.current = sigOf(p); })
      .catch(() => { setPool({ ...DEFAULT_POOL }); initialSig.current = sigOf(DEFAULT_POOL); });
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    if (sigOf(pool) !== initialSig.current) {
      resolveDailyVerse(dateKey(new Date())).then(v => onChanged?.(v)).catch(() => {});
    }
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const closeWithHaptic = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (sigOf(pool) !== initialSig.current) showToast("Today's Message updated", 'Your rotation was saved', 'success');
    close();
  };

  // Persist on every change so a crash or backgrounding never loses the pool. Whether anything
  // meaningfully changed is judged at close time by comparing signatures, not a sticky flag.
  const commit = (next: VersePool) => {
    setPool(next);
    saveVersePool(next).catch(() => {});
  };

  const builtInsOn = pool.disabledPresets.length < VERSES.length;

  const setMode = (next: 'cycle' | 'static') => {
    if (next === pool.mode) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    let pinnedKey = pool.pinnedKey;
    if (next === 'static') {
      const all = getAllVerses(pool);
      if (!pinnedKey || !all.some(a => a.key === pinnedKey)) pinnedKey = all[0]?.key ?? null;
    }
    commit({ ...pool, mode: next, pinnedKey });
  };

  const toggleBuiltIns = (on: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (!on && pool.customVerses.length === 0) {
      showToast('Keep at least one verse', 'Add your own verse first, or leave the built-in verses on.', 'error');
      return;
    }
    commit({ ...pool, disabledPresets: on ? [] : VERSES.map(v => v.reference) });
  };

  const togglePreset = (ref: string, currentlyOn: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const disabledPresets = currentlyOn
      ? [...pool.disabledPresets, ref]
      : pool.disabledPresets.filter(r => r !== ref);
    const next = { ...pool, disabledPresets };
    if (rawActiveCount(next) === 0) {
      showToast('Keep at least one verse', 'You need at least one verse in rotation.', 'error');
      return;
    }
    commit(next);
  };

  const askRemove = (c: CustomVerse) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setConfirmRemove(c);
  };

  const doRemove = () => {
    const c = confirmRemove;
    if (!c) return;
    const customVerses = pool.customVerses.filter(x => x.id !== c.id);
    const next: VersePool = {
      ...pool,
      customVerses,
      pinnedKey: pool.pinnedKey === customKey(c.id) ? null : pool.pinnedKey,
    };
    if (rawActiveCount(next) === 0) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      showToast('Keep at least one verse', 'Turn the built-in verses back on first.', 'error');
      setConfirmRemove(null);
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    commit(next);
    setConfirmRemove(null);
    showToast('Verse removed', '', 'success');
  };

  const pinVerse = (key: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    commit({ ...pool, pinnedKey: key });
  };

  const amberBg = 'rgba(212,134,10,0.15)';
  const amberBorder = 'rgba(212,134,10,0.40)';

  const allVerses = getAllVerses(pool);

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <ToastRenderer />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]} pointerEvents="none" />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        <Animated.View
          style={{
            width: '88%', maxHeight: '80%',
            backgroundColor: theme.bgSheet,
            borderRadius: 20, borderWidth: 0.5, borderColor: theme.borderCard,
            borderTopWidth: 1.5, borderTopColor: amberBorder,
            shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 28, elevation: 24,
            overflow: 'hidden',
            transform: [{ scale: scaleAnim }], opacity: opacityAnim,
          }}
        >
          {/* Handle */}
          <TouchableOpacity onPress={closeWithHaptic} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }} hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 14, paddingTop: 6, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sunny" size={16} color={theme.accentAmber} />
              <Text style={{ fontSize: 18, color: theme.accentAmber, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 }}>TODAY'S MESSAGE</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
            {/* Mode toggle */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {([['cycle', 'sync', 'Cycle daily'], ['static', 'pin', 'Pin one']] as const).map(([mode, icon, label]) => {
                const active = pool.mode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setMode(mode)}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      paddingVertical: 11, borderRadius: 10, minHeight: 44,
                      backgroundColor: active ? amberBg : theme.bgCard,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? amberBorder : theme.borderCard,
                    }}
                  >
                    <Ionicons name={icon as any} size={15} color={active ? theme.accentAmber : theme.textMuted} />
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_700Bold', color: active ? theme.accentAmber : theme.textSecondary }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 18, lineHeight: 17 }}>
              {pool.mode === 'cycle' ? 'A new verse each day from your rotation.' : 'Show one verse every day until you change it.'}
            </Text>

            {pool.mode === 'cycle' ? (
              <>
                {/* Built-in verses master switch */}
                <View style={[styles.rowCard, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>Curated verses</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 2 }}>{VERSES.length} Hand-picked verses</Text>
                  </View>
                  <ToggleSwitch value={builtInsOn} onValueChange={toggleBuiltIns} />
                </View>

                {/* Cherry-pick presets */}
                {builtInsOn && (
                  <>
                    <TouchableOpacity
                      onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setExpanded(e => !e); }}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, minHeight: 44 }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>Customize the list</Text>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                    {expanded && VERSES.map(v => {
                      const on = !pool.disabledPresets.includes(v.reference);
                      return (
                        <View key={v.reference} style={[styles.verseRow, { borderColor: theme.borderSubtle }]}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text numberOfLines={2} style={{ fontSize: 13, fontFamily: 'Lora_500Medium', color: theme.textSecondary, lineHeight: 18 }}>{v.text}</Text>
                            <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: theme.accentAmber, letterSpacing: 1, marginTop: 3, textTransform: 'uppercase' }}>{v.reference}</Text>
                          </View>
                          <ToggleSwitch value={on} onValueChange={() => togglePreset(v.reference, on)} />
                        </View>
                      );
                    })}
                  </>
                )}

                {/* Your verses */}
                <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>YOUR VERSES</Text>
                {pool.customVerses.length ? (
                  pool.customVerses.map(c => (
                    <View key={c.id} style={[styles.verseRow, { borderColor: theme.borderSubtle }]}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text numberOfLines={3} style={{ fontSize: 13, fontFamily: 'Lora_500Medium', color: theme.textSecondary, lineHeight: 18 }}>{c.text}</Text>
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: theme.accentAmber, letterSpacing: 1, marginTop: 3, textTransform: 'uppercase' }}>{c.reference}</Text>
                      </View>
                      <TouchableOpacity onPress={() => askRemove(c)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 18, gap: 6 }}>
                    <Ionicons name="add-circle-outline" size={26} color={theme.textMuted} />
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>No verses added yet</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'DMSans_400Regular', color: theme.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 }}>
                      Highlight a verse in the Bible reader, then tap Add to Today's Message rotation.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* Pin one: pick a single verse from the whole library */
              <>
                {allVerses.map(({ key, verse }) => {
                  const selected = pool.pinnedKey === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => pinVerse(key)}
                      activeOpacity={0.8}
                      style={[styles.verseRow, {
                        borderColor: selected ? amberBorder : theme.borderSubtle,
                        backgroundColor: selected ? amberBg : 'transparent',
                        borderRadius: 10, paddingHorizontal: 10, marginBottom: 6,
                      }]}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text numberOfLines={2} style={{ fontSize: 13, fontFamily: 'Lora_500Medium', color: theme.textSecondary, lineHeight: 18 }}>{verse.text}</Text>
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: theme.accentAmber, letterSpacing: 1, marginTop: 3, textTransform: 'uppercase' }}>{verse.reference}</Text>
                      </View>
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? theme.accentAmber : theme.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        </Animated.View>

        {/* Remove-verse confirm */}
        {confirmRemove && (
          <>
            <TouchableOpacity
              style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
              activeOpacity={1}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setConfirmRemove(null); }}
            />
            <View style={{ position: 'absolute', width: '78%', backgroundColor: theme.bgSheet, borderRadius: 18, borderWidth: 0.5, borderColor: theme.borderCard, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 30 }}>
              <Text style={{ fontSize: 16, fontFamily: 'DMSans_700Bold', color: theme.textPrimary, marginBottom: 8 }}>Remove this verse?</Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans_400Regular', color: theme.textMuted, lineHeight: 19, marginBottom: 18 }}>
                It will stop showing in Today's Message. You can add it again later.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setConfirmRemove(null); }} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.borderCard, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: theme.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={doRemove} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.accentRedBg, borderWidth: 1, borderColor: theme.accentRedBorder, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontFamily: 'DMSans_700Bold', color: theme.accentRed }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 0.5, padding: 14, marginBottom: 4 },
  verseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginTop: 18, marginBottom: 6 },
});
