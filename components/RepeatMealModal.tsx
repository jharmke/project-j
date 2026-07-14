// Repeat a Meal modal -- pick a previous day's meal-slot items and re-log them into the
// day you launched from. Destination is ALWAYS the launch slot (locked rule); the SOURCE
// slot is switchable via the chip row. See SPEC_repeat_meal.md.
//
// Mirrors the app's canonical centered-card modal (NutritionGearModal): transparent Modal,
// animated dim overlay, tap-outside dismiss, spring+opacity entrance fired in onShow, handle
// pill, ToastRenderer INSIDE so the save toast shows above the modal. Adds an accent top border.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';
import { MealSlot } from '../utils/mealSlots';
import { getRepeatDays, logRepeatedItems, tidyFoodName, RepeatDay } from '../utils/repeatMeal';
import { Type, numLine } from '../typography';

// Macro dot colors, matched to the Log-tab mealtime cards (Protein / Carbs / Fat).
const MACRO = { protein: '#0d9268', carbs: '#c47d1a', fat: '#a83232' };

interface Props {
  visible: boolean;
  onClose: () => void;
  slots: MealSlot[];         // all meal slots (for the source chip row)
  launchSlot: MealSlot;      // the slot the pill was tapped on -- the fixed DESTINATION
  viewedKey: string;         // the day being logged into (activeDate, YYYY-MM-DD)
  onAdded: (mergedEntries: any[]) => void; // parent updates state + Firebase with the merged list
}

export default function RepeatMealModal({ visible, onClose, slots, launchSlot, viewedKey, onAdded }: Props) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bodyOpacity = useRef(new Animated.Value(1)).current; // crossfades the body on source-chip switch
  const scrollRef = useRef<any>(null);
  const initialRef = useRef(true); // first load = spinner; later switches = fade, no collapse

  const [sourceSlotId, setSourceSlotId] = useState(launchSlot.id);
  const [days, setDays] = useState<RepeatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean[]>>({});
  const [adding, setAdding] = useState(false);

  const sourceSlot = slots.find(s => s.id === sourceSlotId) || launchSlot;

  // (Re)load the accordion whenever the modal opens or the source slot changes. First load shows a
  // spinner; a later source-chip SWITCH keeps the current list mounted and crossfades the body (so the
  // card never collapses/re-centers), then resets scroll to the top for the newly chosen meal.
  useEffect(() => {
    if (!visible) { initialRef.current = true; return; }
    let alive = true;
    const first = initialRef.current;
    initialRef.current = false;
    if (first) setLoading(true);

    getRepeatDays(sourceSlot, viewedKey).then(result => {
      if (!alive) return;
      const apply = () => {
        setDays(result);
        // Newest matching day pre-expanded; all items checked by default.
        const exp: Record<string, boolean> = {};
        const chk: Record<string, boolean[]> = {};
        result.forEach((d, i) => {
          exp[d.dateKey] = i === 0;
          chk[d.dateKey] = d.items.map(() => true);
        });
        setExpanded(exp);
        setChecked(chk);
      };
      if (first) {
        apply();
        setLoading(false);
        return;
      }
      // Source-chip switch: crossfade. AsyncStorage resolves in a few ms, so we deliberately run the
      // fade-out to COMPLETION first, then swap the data + reset scroll (while invisible), then fade back
      // in -- otherwise the fade-in races the fade-out and you see an instant swap with no animation.
      Animated.timing(bodyOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => {
        if (!alive) return;
        apply();
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        if (finished) {
          Animated.timing(bodyOpacity, { toValue: 1, duration: 190, useNativeDriver: true }).start();
        } else {
          bodyOpacity.setValue(1);
        }
      });
    });
    return () => { alive = false; };
  }, [visible, sourceSlotId, viewedKey]);

  // Reset the source chip back to the launch slot each time the modal opens fresh.
  useEffect(() => {
    if (visible) setSourceSlotId(launchSlot.id);
  }, [visible, launchSlot.id]);

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

  const switchSource = (id: string) => {
    if (id === sourceSlotId) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSourceSlotId(id);
  };

  const toggleExpand = (dateKey: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const toggleItem = (dateKey: string, idx: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setChecked(prev => {
      const row = [...(prev[dateKey] || [])];
      row[idx] = !row[idx];
      return { ...prev, [dateKey]: row };
    });
  };

  // Live selection for a day: items + kcal + macros, all reflecting exactly what's checked.
  // Sum raw then round (matches the Log tab's mealtime totals).
  const selectedFor = (day: RepeatDay) => {
    const row = checked[day.dateKey] || [];
    const items = day.items.filter((_, i) => row[i]);
    const sum = (f: (it: RepeatDay['items'][number]) => number) => Math.round(items.reduce((s, it) => s + f(it), 0));
    return { items, kcal: sum(it => it.cal), p: sum(it => it.protein), c: sum(it => it.carbs), f: sum(it => it.fat) };
  };

  const handleAdd = async (day: RepeatDay) => {
    if (adding) return;
    const { items, kcal } = selectedFor(day);
    if (items.length === 0) return;
    setAdding(true);
    try {
      const merged = await logRepeatedItems(viewedKey, launchSlot.id, items);
      onAdded(merged);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast(`${launchSlot.name} added`, `${items.length} ${items.length === 1 ? 'item' : 'items'} · ${kcal} kcal`, 'success');
      close();
    } catch {
      showToast('Could not add', 'Please try again', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onShow={open} onRequestClose={closeWithHaptic}>
      <ToastRenderer />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">

        {/* Animated dim overlay */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]}
          pointerEvents="none"
        />
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
            borderTopWidth: 2.5,
            borderTopColor: theme.accentBlue,
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
          {/* Handle */}
          <TouchableOpacity
            onPress={closeWithHaptic}
            style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 60, right: 60 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }}>
            <Text style={{ fontSize: 18, color: theme.accentBlue, fontFamily: Type.num, letterSpacing: 2 }}>
              REPEAT A MEAL
            </Text>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginTop: 2 }}>
              Adds to <Text style={{ color: theme.textMuted, fontFamily: Type.uiSemibold }}>{launchSlot.name}</Text>
            </Text>
          </View>

          {/* Source-slot chip row */}
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: theme.borderCard, paddingBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {slots.map(s => {
                const active = s.id === sourceSlotId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => switchSource(s.id)}
                    activeOpacity={0.85}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 8,
                      borderWidth: 1,
                      backgroundColor: active ? theme.accentBlueBg : theme.bgCard,
                      borderColor: active ? theme.accentBlueBorder : theme.borderCard,
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontFamily: active ? Type.uiBold : Type.uiMedium,
                      color: active ? theme.accentBlue : theme.textSecondary,
                    }}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Body */}
          {loading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator color={theme.accentBlue} />
            </View>
          ) : days.length === 0 ? (
            <View style={{ paddingVertical: 44, paddingHorizontal: 24, alignItems: 'center' }}>
              <Ionicons name="time-outline" size={30} color={theme.textDim} />
              <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold, marginTop: 10, textAlign: 'center' }}>
                Nothing to repeat yet
              </Text>
              <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui, marginTop: 4, textAlign: 'center', lineHeight: 17 }}>
                No {sourceSlot.name} logged in the last 14 days. Try another meal above.
              </Text>
            </View>
          ) : (
            <Animated.ScrollView
              ref={scrollRef}
              style={{ opacity: bodyOpacity }}
              contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {days.map(day => {
                const isOpen = expanded[day.dateKey];
                const { items: sel, kcal: selKcal, p: selP, c: selC, f: selF } = selectedFor(day);
                const preview = day.items.map(it => tidyFoodName(it.name)).join(', ');
                const macros: [string, number][] = [[MACRO.protein, selP], [MACRO.carbs, selC], [MACRO.fat, selF]];
                return (
                  <View
                    key={day.dateKey}
                    style={{
                      backgroundColor: isOpen ? theme.accentBlueBg : theme.bgCard,
                      borderRadius: 12,
                      borderWidth: isOpen ? 1.5 : 1,
                      borderColor: isOpen ? theme.accentBlueBorder : theme.borderCardTop,
                      marginBottom: 10,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.14,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    {/* Header row (tap to expand/collapse) */}
                    <TouchableOpacity
                      onPress={() => toggleExpand(day.dateKey)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
                    >
                      <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={theme.textMuted} />
                      <View style={{ flex: 1 }}>
                        {/* Day name + date */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiBold }}>
                            {day.relativeLabel}
                          </Text>
                          <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiBold }}>
                            {'  ·  '}{day.dateLabel}
                          </Text>
                        </View>
                        {/* Live macro dots (reflect what's checked) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          {macros.map(([color, val], mi) => (
                            <View key={mi} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
                              <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.ui }}>{val}g</Text>
                            </View>
                          ))}
                        </View>
                        {/* Food preview (collapsed only) */}
                        {!isOpen && (
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginTop: 4 }}
                          >
                            {preview}
                          </Text>
                        )}
                      </View>
                      {/* Live kcal (reflects what's checked) */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 20, fontFamily: Type.num, lineHeight: numLine(20) }}>{selKcal}</Text>
                        <Text style={{ color: theme.textDim, fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 1.5 }}>KCAL</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded checklist */}
                    {isOpen && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                        {day.items.map((it, i) => {
                          const on = (checked[day.dateKey] || [])[i];
                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => toggleItem(day.dateKey, i)}
                              activeOpacity={0.7}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}
                            >
                              <View style={{
                                width: 20, height: 20, borderRadius: 5,
                                borderWidth: 1.5,
                                alignItems: 'center', justifyContent: 'center',
                                backgroundColor: on ? theme.accentBlue : 'transparent',
                                borderColor: on ? theme.accentBlue : theme.borderInput,
                              }}>
                                {on && <Ionicons name="checkmark" size={13} color={theme.bgPrimary} />}
                              </View>
                              <Text
                                numberOfLines={1}
                                style={{ flex: 1, fontSize: 13, fontFamily: Type.uiMedium, color: on ? theme.textSecondary : theme.textDim }}
                              >
                                {tidyFoodName(it.name)}
                              </Text>
                              <Text style={{ fontSize: 12, fontFamily: Type.uiSemibold, color: on ? theme.textMuted : theme.textDim }}>
                                {Math.round(it.cal)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}

                        {/* Add button -- dim when nothing selected, full accent when ready */}
                        <TouchableOpacity
                          onPress={() => handleAdd(day)}
                          disabled={sel.length === 0 || adding}
                          activeOpacity={0.85}
                          style={{
                            marginTop: 10,
                            borderRadius: 10,
                            paddingVertical: 12,
                            alignItems: 'center',
                            backgroundColor: sel.length === 0 ? theme.bgInput : theme.accentBlue,
                            opacity: sel.length === 0 ? 0.6 : 1,
                          }}
                        >
                          <Text style={{
                            fontSize: 13,
                            fontFamily: Type.uiBold,
                            color: sel.length === 0 ? theme.textDim : theme.bgPrimary,
                          }}>
                            {sel.length === 0
                              ? 'Select at least one item'
                              : `Add ${sel.length} ${sel.length === 1 ? 'item' : 'items'} · ${selKcal} kcal`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </Animated.ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
