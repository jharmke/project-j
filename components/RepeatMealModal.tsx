// Find a Meal modal (component name kept as RepeatMealModal, its original scope) -- two tabs:
// Recent, the original Repeat a Meal behavior (pick a previous day's meal-slot items, re-log
// them into the day you launched from), and Meal Catalog, the user's permanent named saved-meal
// list. Destination is ALWAYS the launch slot (locked rule); Recent's SOURCE slot is switchable
// via its chip row -- Meal Catalog has no source slot, a saved meal isn't tied to one. See
// SPEC_repeat_meal.md.
//
// Mirrors the app's canonical centered-card modal (NutritionGearModal): transparent Modal,
// animated dim overlay, tap-outside dismiss, spring+opacity entrance fired in onShow, handle
// pill, ToastRenderer INSIDE so the save toast shows above the modal. Adds an accent top border.

import { Ionicons } from '@/components/AppIcons';
import { Text, TextInput } from '@/components/AppText';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { useToast, ToastRenderer } from './Toast';
import { MealSlot } from '../utils/mealSlots';
import { getRepeatDays, logRepeatedItems, tidyFoodName, RepeatDay } from '../utils/repeatMeal';
import { loadSavedMeals, deleteSavedMeal, markSavedMealUsed, SavedMeal } from '../utils/savedMeals';
import { barFillGradient } from '../utils/barGradient';
import { Type, numLine } from '../typography';
import ModalHeader from './ModalHeader';
import PrimaryCTA from './PrimaryCTA';
import ButtonShine from './ButtonShine';
import KeyboardAwareCenter from './KeyboardAwareCenter';
import GradientTitle from './GradientTitle';
import GradientNumber from './GradientNumber';

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
  const sourceScrollRef = useRef<any>(null);
  const sourceChipX = useRef<Record<string, number>>({});
  const initialRef = useRef(true); // first load = spinner; later switches = fade, no collapse

  const [sourceSlotId, setSourceSlotId] = useState(launchSlot.id);
  const [days, setDays] = useState<RepeatDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean[]>>({});
  const [adding, setAdding] = useState(false);

  // Meal Catalog: a second tab alongside Recent (history). Recent is ephemeral/unnamed and ages
  // out after the window; the Catalog is the user's permanent, named saved-meal list -- kept as
  // a genuinely separate source rather than merged into one flat list. Rows behave IDENTICALLY
  // to Recent's day rows (expand -> per-item checklist -> Add button), same catalogExpanded/
  // catalogChecked shape as expanded/checked above, just keyed by meal id instead of date.
  const [activeTab, setActiveTab] = useState<'recent' | 'catalog'>('recent');
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogExpanded, setCatalogExpanded] = useState<Record<string, boolean>>({});
  const [catalogChecked, setCatalogChecked] = useState<Record<string, boolean[]>>({});
  const [catalogAdding, setCatalogAdding] = useState(false);
  // Catalog search + sort. A saved-meal list is fine unsorted at five and unusable at thirty.
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSort, setCatalogSort] = useState<'recent' | 'az' | 'newest'>('recent');

  // Search matches the meal's NAME and the names of the foods inside it, so "chicken" finds a meal
  // called "Post Workout" that happens to contain chicken. That's the search people actually mean.
  const visibleSavedMeals = (() => {
    const q = catalogQuery.trim().toLowerCase();
    const filtered = q
      ? savedMeals.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.items.some((it: any) => String(it?.name ?? '').toLowerCase().includes(q))
        )
      : savedMeals;
    const sorted = [...filtered];
    if (catalogSort === 'az') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (catalogSort === 'newest') {
      sorted.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } else {
      // Never-used meals have no lastUsedAt at all. They sort BELOW everything you've actually used,
      // then among themselves by newest, rather than being lumped in at the epoch in random order.
      sorted.sort((a, b) => {
        const au = a.lastUsedAt ?? 0, bu = b.lastUsedAt ?? 0;
        if (au !== bu) return bu - au;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
    }
    return sorted;
  })();

  // Hidden until the list is big enough to need it -- a search box over three meals is clutter.
  const showCatalogTools = savedMeals.length >= 6;

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

  // Reset the source chip back to the launch slot each time the modal opens fresh, and scroll
  // the chip row to reveal it -- a launch slot near the end of a long slot list (e.g. a freshly
  // created custom meal) otherwise opens off-screen with no visual hint it's even selected.
  // Chip x-positions are captured via onLayout as they render; a short delay lets that layout
  // pass complete before scrolling to it.
  useEffect(() => {
    if (!visible) return;
    setSourceSlotId(launchSlot.id);
    const t = setTimeout(() => {
      const x = sourceChipX.current[launchSlot.id];
      if (x !== undefined) sourceScrollRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [visible, launchSlot.id]);

  // Reset to the Recent tab and (re)load the Meal Catalog each time the modal opens fresh --
  // loaded up front so switching tabs never shows a loading flicker. Items are all checked by
  // default so an expanded meal is ready to add.
  // NOTHING is pre-expanded. This used to open index 0 of the raw stored list, which is the OLDEST
  // saved meal, so the least likely one sat open pushing the rest down. Now that the list can be
  // sorted and searched, auto-opening anything fights the order the user just chose.
  useEffect(() => {
    if (!visible) return;
    setActiveTab('recent');
    setCatalogQuery('');
    setCatalogLoading(true);
    loadSavedMeals().then(list => {
      setSavedMeals(list);
      const exp: Record<string, boolean> = {};
      const chk: Record<string, boolean[]> = {};
      list.forEach(m => {
        exp[m.id] = false;
        chk[m.id] = m.items.map(() => true);
      });
      setCatalogExpanded(exp);
      setCatalogChecked(chk);
      setCatalogLoading(false);
    });
  }, [visible]);

  const toggleCatalogExpand = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCatalogExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCatalogItem = (id: string, idx: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCatalogChecked(prev => {
      const row = [...(prev[id] || [])];
      row[idx] = !row[idx];
      return { ...prev, [id]: row };
    });
  };

  // Live selection for a saved meal: items + kcal, reflecting exactly what's checked.
  const catalogSelectedFor = (meal: SavedMeal) => {
    const row = catalogChecked[meal.id] || [];
    const items = meal.items.filter((_, i) => row[i]);
    const kcal = Math.round(items.reduce((s, it) => s + (it.cal || 0), 0));
    return { items, kcal };
  };

  const addSavedMealSelection = async (meal: SavedMeal) => {
    if (catalogAdding) return;
    const { items, kcal } = catalogSelectedFor(meal);
    if (items.length === 0) return;
    setCatalogAdding(true);
    try {
      const asRepeatItems = items.map(entry => ({ entry, name: entry.name, cal: entry.cal || 0, protein: entry.protein || 0, carbs: entry.carbs || 0, fat: entry.fat || 0 }));
      const merged = await logRepeatedItems(viewedKey, launchSlot.id, asRepeatItems);
      // Stamped only once the food is actually logged, so the Recent sort reflects meals you reached
      // for rather than ones you opened and thought better of. Deliberately not awaited: sorting
      // metadata must never delay the thing the user asked for.
      markSavedMealUsed(meal.id);
      onAdded(merged);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast(`${launchSlot.name} added`, `${items.length} ${items.length === 1 ? 'item' : 'items'} · ${kcal} kcal`, 'success');
      close();
    } catch {
      showToast('Could not add', 'Please try again', 'error');
    } finally {
      setCatalogAdding(false);
    }
  };

  const removeSavedMeal = (meal: SavedMeal) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Delete Meal',
      `Remove "${meal.name}" from your Meal Catalog? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          const updated = await deleteSavedMeal(meal.id);
          setSavedMeals(updated);
          showToast('Meal deleted', meal.name, 'success');
        }},
      ]
    );
  };

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

      {/* Dimming and tap-outside sit OUTSIDE the keyboard-aware box: inside it they'd shrink with the
          card and leave the strip behind the keyboard undimmed and untappable. */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: opacityAnim }]}
        pointerEvents="none"
      />
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeWithHaptic} />

      {/* Keyboard-aware because the Catalog tab has a search field. The card's height is a percentage
          of THIS box, so padding it shrinks the card, which shortens the list and lets it scroll clear
          of the keyboard. Without it the card kept its full height and its lower rows sat behind the
          keys, unreachable by scrolling. */}
      <KeyboardAwareCenter style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">

        {/* Floating card */}
        <Animated.View
          style={{
            width: '88%',
            // Fixed height, not maxHeight -- switching between Recent and Meal Catalog (very
            // different amounts of content) made the whole card visibly grow/shrink. A constant
            // footprint means a short tab just leaves empty space below instead of resizing.
            height: '78%',
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
          {/* Renamed from "Repeat a Meal" once this modal grew a Meal Catalog tab alongside Recent --
              the old name only described history, not the catalog too. The 'Adds to <slot>' line
              keeps its inline bold, so it stays below the header rather than becoming ModalHeader's
              plain subtitle. */}
          <ModalHeader title="Find a Meal" onClose={closeWithHaptic} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui }}>
              Adds to <Text style={{ color: theme.textMuted, fontFamily: Type.uiSemibold }}>{launchSlot.name}</Text>
            </Text>
          </View>

          {/* Recent / Meal Catalog tabs -- Recent is the existing ~14-day history, ephemeral and
              unnamed; Meal Catalog is the permanent, named saved-meal list. Kept as genuinely
              separate sources rather than one flat list (a history row has no name, a saved meal
              does -- mixing them reads as inconsistent). */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
            {(['recent', 'catalog'] as const).map(tab => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => { if (tab !== activeTab) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); } }}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8, borderWidth: 1,
                    backgroundColor: active ? theme.accentBlueBg : theme.bgCard,
                    borderColor: active ? theme.accentBlueBorder : theme.borderCard,
                  }}>
                  {active && <ButtonShine radius={8} />}
                  <Text style={{ fontSize: 13, fontFamily: active ? Type.uiBold : Type.uiMedium, color: active ? theme.accentBlue : theme.textSecondary }}>
                    {tab === 'recent' ? 'Recent' : 'Meal Catalog'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Source-slot chip row -- only meaningful for Recent (history is per-slot); a saved
              meal in the Catalog isn't tied to any particular source slot. */}
          {activeTab === 'recent' && (
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: theme.borderCard, paddingBottom: 12 }}>
            <ScrollView
              ref={sourceScrollRef}
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
                    onLayout={(e) => { sourceChipX.current[s.id] = e.nativeEvent.layout.x; }}
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
                    {active && <ButtonShine radius={8} />}
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
          )}

          {/* Recent body -- flex:1 on every branch so it fills the card's now-fixed height
              instead of sitting at content-size with dead space below. */}
          {activeTab === 'recent' && (loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={theme.accentBlue} />
            </View>
          ) : days.length === 0 ? (
            <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
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
              style={{ flex: 1, opacity: bodyOpacity }}
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
                      // Same 3pt accent edge every Food Library row carries. These two lists do the
                      // same job -- food you're about to add -- so they get the same treatment rather
                      // than a third one, and it's what stops a column of white cards reading as a
                      // flat slab.
                      borderLeftWidth: 3,
                      borderLeftColor: theme.accentBlueRaw,
                      marginBottom: 10,
                      // NO overflow: 'hidden' here. On iOS a shadow is drawn outside the layer bounds,
                      // so clipping the layer clips the shadow away entirely -- these cards weren't
                      // showing a faint shadow, they were showing none at all. The background still
                      // respects borderRadius without it; only a child painting to the very edge would
                      // need clipping, and none here do.
                      // Deeper and softer than it was, too: a tight 8pt shadow at 0.14 vanishes on the
                      // light themes, where a white card sits on a white sheet. Spread does more work
                      // than darkness, so the radius grows more than the opacity.
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 5 },
                      shadowOpacity: 0.18,
                      shadowRadius: 14,
                      elevation: 7,
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
                          <GradientTitle
                            title={`${day.relativeLabel}  ·  ${day.dateLabel}`}
                            color={theme.textSecondary}
                            style={{ fontSize: 14, fontFamily: Type.uiBold }}
                            numberOfLines={1}
                          />
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
                        {/* Green, matching every Food Library row's calorie figure. It also stops the
                            number being one more grey element, and sits naturally with the green,
                            amber and red macro dots beside it. */}
                        <GradientNumber value={String(selKcal)} color={theme.accentGreen} style={{ fontSize: 20, fontFamily: Type.num, lineHeight: numLine(20) }} />
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
                                width: 20, height: 20, borderRadius: 5, overflow: 'hidden',
                                borderWidth: on ? 0 : 1.5,
                                alignItems: 'center', justifyContent: 'center',
                                backgroundColor: on ? undefined : 'transparent',
                                borderColor: theme.borderInput,
                              }}>
                                {on && (
                                  <>
                                    <LinearGradient colors={barFillGradient(theme.accentBlue)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
                                    <Ionicons name="checkmark" size={13} color={theme.bgPrimary} />
                                  </>
                                )}
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

                        {/* Add button -- was a flat painted fill, now the real molded PrimaryCTA
                            everywhere else in the app uses. Dim/inactive-when-empty, full accent
                            when ready is PrimaryCTA's own built-in disabled state. */}
                        <PrimaryCTA
                          label={sel.length === 0 ? 'Select at least one item' : `Add ${sel.length} ${sel.length === 1 ? 'item' : 'items'} · ${selKcal} kcal`}
                          onPress={() => handleAdd(day)}
                          disabled={sel.length === 0 || adding}
                          busy={adding}
                          compact
                          wrapperStyle={{ marginTop: 10 }}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </Animated.ScrollView>
          ))}

          {/* Meal Catalog body -- rows behave identically to Recent's day rows: tap to expand,
              see every item on its own line with a checkbox, then Add. No more truncated
              one-line preview + instant add-everything. */}
          {activeTab === 'catalog' && (catalogLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={theme.accentBlue} />
            </View>
          ) : savedMeals.length === 0 ? (
            <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bookmark-outline" size={30} color={theme.textDim} />
              <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold, marginTop: 10, textAlign: 'center' }}>
                No saved meals yet
              </Text>
              <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui, marginTop: 4, textAlign: 'center', lineHeight: 17 }}>
                Log a meal, then tap Save as Meal to see it here.
              </Text>
            </View>
          ) : (
            // paddingTop trimmed to 2: the tab row above already carries 12 of its own, and stacking
            // that on the old 14 left a visible dead band above the search field.
            // "handled", so a tap on empty space still dismisses the keyboard -- the only way most
            // people close one. This was briefly "always" to stop a drag from dismissing mid-scroll,
            // but that turned out to be the Log page's ScrollView reacting from underneath, and this
            // modal has since moved outside it. With the real cause gone, "handled" behaves.
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 2, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {showCatalogTools && (
                <View style={{ marginBottom: 12, gap: 8 }}>
                  <TextInput
                    value={catalogQuery}
                    onChangeText={setCatalogQuery}
                    placeholder="Search saved meals..."
                    placeholderTextColor={theme.textPlaceholder}
                    style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiMedium }}
                  />
                  {/* Chips rather than a sort button: a second RN Modal will not display over an
                      already-open one (see the Workout Library's rename overlay), so the Food
                      Library's button-opens-a-sort-modal pattern can't be reused inside this modal.
                      Three options also read better always-visible than hidden behind a tap. Same
                      shape as the Saved Verses sort in Bible. */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {([['recent', 'Recent'], ['az', 'A-Z'], ['newest', 'Newest']] as const).map(([val, label]) => {
                      const on = catalogSort === val;
                      return (
                        // Shine + card fill on the active chip, matching the Recent / Meal Catalog tabs
                        // directly above. Without it these read as flat painted boxes sitting under a
                        // pair of properly molded ones.
                        <TouchableOpacity
                          key={val}
                          activeOpacity={0.85}
                          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setCatalogSort(val); }}
                          style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, overflow: 'hidden', backgroundColor: on ? theme.accentBlueBg : theme.bgCard, borderColor: on ? theme.accentBlueBorder : theme.borderCard }}>
                          {on && <ButtonShine radius={8} />}
                          <Text style={{ fontSize: 12, fontFamily: on ? Type.uiSemibold : Type.uiMedium, color: on ? theme.accentBlue : theme.textMuted }}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              {visibleSavedMeals.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 28, gap: 6 }}>
                  <Ionicons name="search" size={24} color={theme.textDim} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: Type.uiSemibold }}>No meals match</Text>
                  <Text style={{ fontSize: 12, color: theme.textDim, fontFamily: Type.ui, textAlign: 'center' }}>
                    Try a different word, or search a food inside the meal.
                  </Text>
                </View>
              ) : visibleSavedMeals.map(meal => {
                const isOpen = catalogExpanded[meal.id];
                const { items: sel, kcal: selKcal } = catalogSelectedFor(meal);
                const preview = meal.items.map(it => tidyFoodName(it.name)).join(', ');
                return (
                  <View
                    key={meal.id}
                    style={{
                      backgroundColor: isOpen ? theme.accentBlueBg : theme.bgCard,
                      borderRadius: 12,
                      borderWidth: isOpen ? 1.5 : 1,
                      borderColor: isOpen ? theme.accentBlueBorder : theme.borderCardTop,
                      // Same 3pt accent edge every Food Library row carries. These two lists do the
                      // same job -- food you're about to add -- so they get the same treatment rather
                      // than a third one, and it's what stops a column of white cards reading as a
                      // flat slab.
                      borderLeftWidth: 3,
                      borderLeftColor: theme.accentBlueRaw,
                      marginBottom: 10,
                      // NO overflow: 'hidden' here. On iOS a shadow is drawn outside the layer bounds,
                      // so clipping the layer clips the shadow away entirely -- these cards weren't
                      // showing a faint shadow, they were showing none at all. The background still
                      // respects borderRadius without it; only a child painting to the very edge would
                      // need clipping, and none here do.
                      // Deeper and softer than it was, too: a tight 8pt shadow at 0.14 vanishes on the
                      // light themes, where a white card sits on a white sheet. Spread does more work
                      // than darkness, so the radius grows more than the opacity.
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 5 },
                      shadowOpacity: 0.18,
                      shadowRadius: 14,
                      elevation: 7,
                    }}
                  >
                    {/* Header row (tap to expand/collapse) */}
                    <TouchableOpacity
                      onPress={() => toggleCatalogExpand(meal.id)}
                      activeOpacity={0.7}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
                    >
                      <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={theme.textMuted} />
                      <View style={{ flex: 1 }}>
                        <GradientTitle
                          title={meal.name}
                          color={theme.textSecondary}
                          style={{ fontSize: 14, fontFamily: Type.uiBold }}
                          numberOfLines={1}
                        />
                        {!isOpen && (
                          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginTop: 4 }}>
                            {preview}
                          </Text>
                        )}
                      </View>
                      {/* Total sits alone in the corner now -- no icon crowding it -- so it reads
                          unambiguously as the sum of what's below, not just another line item. */}
                      <View style={{ alignItems: 'flex-end' }}>
                        {/* Green, matching every Food Library row's calorie figure. It also stops the
                            number being one more grey element, and sits naturally with the green,
                            amber and red macro dots beside it. */}
                        <GradientNumber value={String(selKcal)} color={theme.accentGreen} style={{ fontSize: 20, fontFamily: Type.num, lineHeight: numLine(20) }} />
                        <Text style={{ color: theme.textDim, fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 1.5 }}>KCAL</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded checklist */}
                    {isOpen && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                        {meal.items.map((it, i) => {
                          const on = (catalogChecked[meal.id] || [])[i];
                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => toggleCatalogItem(meal.id, i)}
                              activeOpacity={0.7}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}
                            >
                              <View style={{
                                width: 20, height: 20, borderRadius: 5, overflow: 'hidden',
                                borderWidth: on ? 0 : 1.5,
                                alignItems: 'center', justifyContent: 'center',
                                backgroundColor: on ? undefined : 'transparent',
                                borderColor: theme.borderInput,
                              }}>
                                {on && (
                                  <>
                                    <LinearGradient colors={barFillGradient(theme.accentBlue)} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
                                    <Ionicons name="checkmark" size={13} color={theme.bgPrimary} />
                                  </>
                                )}
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

                        {/* Trash moved down here from the header -- bottom-right, beside Add,
                            instead of crowding the total up top. */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                          <View style={{ flex: 1 }}>
                            <PrimaryCTA
                              label={sel.length === 0 ? 'Select at least one item' : `Add ${sel.length} ${sel.length === 1 ? 'item' : 'items'} · ${selKcal} kcal`}
                              onPress={() => addSavedMealSelection(meal)}
                              disabled={sel.length === 0 || catalogAdding}
                              busy={catalogAdding}
                              compact
                            />
                          </View>
                          <TouchableOpacity
                            onPress={() => removeSavedMeal(meal)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ padding: 6 }}>
                            <Ionicons name="trash-outline" size={18} color={theme.accentRed} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          ))}
        </Animated.View>
      </KeyboardAwareCenter>
    </Modal>
  );
}
