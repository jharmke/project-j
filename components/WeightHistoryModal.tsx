// Weight History modal -- opened from the gear on the home Weight card. Shows the starting
// weight (the earliest weigh-in, what "Total" is measured from), an editable history of past
// weigh-ins (edit/delete per day, water-log style), and a back-dated "+ add a past weigh-in".
// Goal weight is read-only here (edited in Profile). Full modal standard: centered floating
// card, handle pill, accent top border, spring 0.85->1 + opacity in onShow, ToastRenderer
// inside the Modal, tap-outside dismiss, KeyboardAvoidingView. See SPEC_weight_history.md.
//
// All writes go through utils/weightHistory (read-then-merge; only .weight is touched). After
// any change we re-gather the history locally AND call onChange so the parent recomputes the
// card + runs the milestone check.

import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '../utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { ToastRenderer, useToast } from './Toast';
import { deleteWeightForDate, gatherWeightHistory, saveWeightForDate, startingWeighIn, WeighIn } from '../utils/weightHistory';
import { Type } from '../typography';
import ModalHeader from './ModalHeader';
import ButtonShine from './ButtonShine';
import GradientNumber from './GradientNumber';

interface Props {
  visible: boolean;
  onClose: () => void;
  styleMode: 'discipline' | 'balanced' | 'mindful' | string;
  goalWeight: number | null;
  onChange: () => void; // called after any successful save/delete so the parent recomputes
}

const pad = (n: number) => String(n).padStart(2, '0');
const keyFromDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function WeightHistoryModal({ visible, onClose, styleMode, goalWeight, onChange }: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isMindful = styleMode === 'mindful';

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const editAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [history, setHistory] = useState<WeighIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline edit overlay: which day is being edited (null = closed) + its input.
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editIsStarting, setEditIsStarting] = useState(false);

  // Add-past control.
  const [adding, setAdding] = useState(false);
  const [addDate, setAddDate] = useState<Date>(new Date());
  const [addValue, setAddValue] = useState('');

  // Inline delete confirm (which row's trash was tapped).
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null);

  const todayKey = keyFromDate(new Date());

  const loadHistory = async () => {
    setLoading(true);
    const h = await gatherWeightHistory();
    setHistory(h);
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      setEditingDate(null);
      setAdding(false);
      setAddValue('');
      setAddDate(new Date());
      setConfirmDeleteDate(null);
      loadHistory();
    }
  }, [visible]);

  const open = () => {
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 300 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const closeWithHaptic = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    close();
  };

  // ── Edit overlay open/close ────────────────────────────────────────────────
  const openEdit = (date: string, currentWeight: number, isStarting: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setConfirmDeleteDate(null);
    setEditingDate(date);
    setEditValue(String(currentWeight));
    setEditIsStarting(isStarting);
    editAnim.setValue(0);
    Animated.spring(editAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 280 }).start();
  };

  const closeEdit = () => {
    Animated.timing(editAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => setEditingDate(null));
  };

  const cleanWeight = (v: string) => {
    const stripped = v.replace(/[^0-9.]/g, '');
    const dot = stripped.indexOf('.');
    if (dot === -1) return stripped.slice(0, 4);
    const before = stripped.slice(0, dot).slice(0, 4);
    const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
    return before + '.' + after;
  };

  // ── Writers ────────────────────────────────────────────────────────────────
  const commitEdit = async () => {
    if (editingDate === null) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const res = await saveWeightForDate(editingDate, editValue, todayKey);
    if (!res.ok) {
      showToast(res.reason || 'Could not save', undefined, 'error');
      return;
    }
    await loadHistory();
    onChange();
    showToast('Weight saved', undefined, 'success');
    closeEdit();
  };

  const commitAdd = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const dateKey = keyFromDate(addDate);
    const res = await saveWeightForDate(dateKey, addValue, todayKey);
    if (!res.ok) {
      showToast(res.reason || 'Could not save', undefined, 'error');
      return;
    }
    await loadHistory();
    onChange();
    showToast('Weigh-in added', undefined, 'success');
    setAdding(false);
    setAddValue('');
    setAddDate(new Date());
  };

  const commitDelete = async (date: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    const res = await deleteWeightForDate(date);
    setConfirmDeleteDate(null);
    if (!res.ok) {
      showToast(res.reason || 'Could not delete', undefined, 'error');
      return;
    }
    await loadHistory();
    onChange();
    showToast('Weigh-in deleted', undefined, 'success');
  };

  // ── Formatting ─────────────────────────────────────────────────────────────
  const formatDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (dateKey === todayKey) return 'Today';
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    if (dateKey === keyFromDate(yd)) return 'Yesterday';
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const start = startingWeighIn(history);
  const valueColor = isMindful ? theme.textSecondary : theme.textPrimary;

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <ToastRenderer />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

        {/* Dim overlay */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]} pointerEvents="none" />
        {/* Tap-outside dismiss */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

        {/* Floating card */}
        <Animated.View
            style={{
              width: '88%',
              maxHeight: '80%',
              backgroundColor: theme.bgSheet,
              borderRadius: 20,
              borderWidth: 0.5,
              borderColor: theme.borderCard,
              borderTopWidth: 1.5,
              borderTopColor: theme.accentBlueRaw,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 28,
              elevation: 24,
              overflow: 'hidden',
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            }}
          >
            <ModalHeader title="Weight History" onClose={closeWithHaptic} />
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }} />

            <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>

              {/* STARTING WEIGHT block */}
              <View style={{ backgroundColor: theme.accentBlueBg, borderRadius: 12, borderWidth: 1, borderColor: theme.accentBlueBorder, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 8 }}>
                  Starting Weight
                </Text>
                {start ? (
                  <TouchableOpacity onPress={() => openEdit(start.date, start.weight, true)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <GradientNumber value={`${start.weight} lbs`} color={valueColor} style={{ fontSize: 26, fontFamily: Type.num, letterSpacing: 1 }} />
                      <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginTop: 2 }}>
                        {formatDate(start.date)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="pencil" size={14} color={theme.accentBlue} />
                      <Text style={{ fontSize: 12, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Edit</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ fontSize: 13, color: theme.textDim, fontFamily: Type.ui, lineHeight: 18 }}>
                    No weigh-ins yet. Log your weight on the home card, or add a past one below, to set your starting point.
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: Type.ui, marginTop: 10, lineHeight: 15 }}>
                  Your progress is measured from here.
                </Text>
              </View>

              {/* Disclaimer */}
              <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: Type.ui, marginBottom: 16, lineHeight: 14 }}>
                For informational purposes only. Not medical advice.
              </Text>

              {/* HISTORY list */}
              <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 6 }}>
                History
              </Text>
              {loading ? (
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui, textAlign: 'center', paddingVertical: 16 }}>Loading…</Text>
              ) : history.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui, textAlign: 'center', paddingVertical: 16 }}>No weigh-ins logged yet.</Text>
              ) : (
                history.map((w) => {
                  const confirming = confirmDeleteDate === w.date;
                  return (
                    <View key={w.date} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                      {confirming ? (
                        <>
                          <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.uiMedium, flex: 1 }}>Delete this weigh-in?</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setConfirmDeleteDate(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => commitDelete(w.date)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: theme.accentRed + '22' }}>
                              <Text style={{ fontSize: 13, color: theme.accentRed, fontFamily: Type.uiBold }}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiMedium, width: 110 }}>{formatDate(w.date)}</Text>
                          <View style={{ flex: 1 }}>
                            <GradientNumber value={`${w.weight} lbs`} color={valueColor} style={{ fontSize: 15, fontFamily: Type.uiSemibold }} />
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                            <TouchableOpacity onPress={() => openEdit(w.date, w.weight, start?.date === w.date)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <Ionicons name="pencil" size={15} color={theme.accentBlue} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setConfirmDeleteDate(w.date); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })
              )}

              {/* ADD A PAST WEIGH-IN */}
              {!adding ? (
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setConfirmDeleteDate(null); setAdding(true); setAddDate(new Date()); setAddValue(''); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.accentBlueBorder }}
                >
                  <Ionicons name="add" size={18} color={theme.accentBlue} />
                  <Text style={{ fontSize: 13, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Add a past weigh-in</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginTop: 16, backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14 }}>
                  <Text style={{ fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 10 }}>
                    Add a Past Weigh-in
                  </Text>
                  <View style={{ alignItems: 'center', marginBottom: 6 }}>
                    <DateTimePicker
                      mode="date"
                      value={addDate}
                      display="spinner"
                      maximumDate={new Date()}
                      textColor={theme.textPrimary}
                      onChange={(_, d) => { if (d) setAddDate(d); }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <TextInput
                      style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, fontFamily: Type.uiMedium, textAlign: 'center' }}
                      value={addValue}
                      onChangeText={v => setAddValue(cleanWeight(v))}
                      keyboardType="decimal-pad"
                      placeholder="Weight (lbs)"
                      placeholderTextColor={theme.textPlaceholder}
                    />
                    <TouchableOpacity
                      onPress={commitAdd}
                      disabled={!addValue.trim()}
                      style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, backgroundColor: addValue.trim() ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: addValue.trim() ? theme.accentBlueBorder : theme.borderInput, opacity: addValue.trim() ? 1 : 0.5 }}
                    >
                      {!!addValue.trim() && <ButtonShine radius={8} />}
                      <Text style={{ fontSize: 13, color: addValue.trim() ? theme.accentBlue : theme.textDim, fontFamily: Type.uiBold }}>Add</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setAdding(false); setAddValue(''); }} style={{ alignSelf: 'center', marginTop: 12, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: theme.accentRed, fontFamily: Type.uiSemibold }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* GOAL WEIGHT (read-only) */}
              {goalWeight != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 18 }}>
                  <Ionicons name="flag-outline" size={12} color={theme.textDim} />
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui }}>
                    Goal: {goalWeight} lbs · Change in Profile
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>

        {/* Inline EDIT overlay (layered above the modal) */}
        {editingDate !== null && (
          <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', opacity: editAnim }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeEdit} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }} pointerEvents="box-none">
              {/* Was a hand-rolled pill + a 9px CENTRED ALL-CAPS label as the title + a separate date line,
                  and no X. ModalHeader does the title, the subtitle, the pill and the X. Body padding moves
                  in so the header can own the top edge. */}
              <Animated.View style={{ width: '80%', backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw, overflow: 'hidden', paddingBottom: 18, transform: [{ scale: editAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
                <ModalHeader
                  title={editIsStarting ? 'Edit Starting Weight' : 'Edit Weigh-in'}
                  subtitle={formatDate(editingDate)}
                  onClose={closeEdit}
                />
                <View style={{ paddingHorizontal: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18, marginTop: 14 }}>
                  <TextInput
                    style={{ backgroundColor: theme.bgInput, borderWidth: 1.5, borderColor: theme.accentBlueBorder, borderRadius: 10, color: theme.textSecondary, paddingVertical: 12, paddingHorizontal: 16, fontSize: 26, fontFamily: Type.num, textAlign: 'center', minWidth: 160 }}
                    value={editValue}
                    onChangeText={v => setEditValue(cleanWeight(v))}
                    keyboardType="decimal-pad"
                    autoFocus
                    placeholder="lbs"
                    placeholderTextColor={theme.textPlaceholder}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeEdit(); }} style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, padding: 12, alignItems: 'center' }}>
                    <Text style={{ color: theme.textMuted, fontSize: 14, fontFamily: Type.uiSemibold }}>Cancel</Text>
                  </TouchableOpacity>
                  {/* Shine only when ENABLED -- a dim button must not read as a lit surface. */}
                  <TouchableOpacity onPress={commitEdit} disabled={!editValue.trim()} style={{ flex: 1, backgroundColor: editValue.trim() ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: editValue.trim() ? theme.accentBlueBorder : theme.borderInput, borderRadius: 8, padding: 12, alignItems: 'center', opacity: editValue.trim() ? 1 : 0.5 }}>
                    {!!editValue.trim() && <ButtonShine radius={8} />}
                    <Text style={{ color: editValue.trim() ? theme.accentBlue : theme.textDim, fontSize: 14, fontFamily: Type.uiBold }}>Save</Text>
                  </TouchableOpacity>
                </View>
                </View>
              </Animated.View>
            </KeyboardAvoidingView>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}
