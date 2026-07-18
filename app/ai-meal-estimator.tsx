// app/ai-meal-estimator.tsx
// AI Meal Estimator screen. Single screen, two internal step states (input ->
// results) plus a loading state and inline error states. The brain lives in
// services/aiMealEstimator.ts; this file is all UI + the save-to-log flow.
//
// Spec: SPEC_ai_meal_estimator.md (source of truth).

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS, ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView,
  Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastRenderer, useToast } from '../components/Toast';
import GradientNumber from '../components/GradientNumber';
import { saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';
import PrimaryCTA from '../components/PrimaryCTA';
import ModalHeader from '../components/ModalHeader';
import ButtonShine from '../components/ButtonShine';
import { useMembership } from '../MembershipContext';
import { triggerHaptic } from '../utils/haptics';
import { DEFAULT_MEAL_SLOTS, MealSlot, getMealDisplayName, loadMealSlots } from '../utils/mealSlots';
import { storageSet } from '../utils/storage';
import {
  Confidence, EstimateResult, IMAGE_QUALITY, LineItem, computeTotals,
  generateMealEstimate, getRemainingUses, incrementQuota, limitFor, nextResetLabel,
} from '../services/aiMealEstimator';
import { Type } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import BackgroundLayers from '../components/BackgroundLayers';

// Fixed brand macro colors (design system). Same values used across the app.
const MACRO = { protein: '#0d9268', carbs: '#c47d1a', fat: '#a83232' };

const MULTIPLIERS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];

// TODO(monetization): wire to the real subscription entitlement when Pro ships.
// Until then everyone is on the free tier (3/month).

// Failsafe: every successful estimate is stashed here for the rest of the day so
// a user who loses the screen (phone call, app reload) can reopen it without
// burning another estimate. Auto-pruned to today only.
const TODAY_KEY = 'pj_ai_estimator_today';

interface TodayEstimate {
  id: string;
  mealName: string;
  result: EstimateResult;
  createdAt: number;
}

type Step = 'input' | 'loading' | 'results';
type ErrorKind = 'network' | 'malformed' | 'no_food' | 'no_key' | null;

interface Row {
  id: string;
  name: string;
  portion: string;
  // 1x baseline. The universal multiplier scales from here. A manual edit (or a
  // per-item scale) overwrites these, making that the new 1x baseline (per spec).
  baseCal: number;
  baseP: number;
  baseC: number;
  baseF: number;
  // The AI's untouched original values. Never change. The per-item portion
  // pills in the edit panel scale from these so "1.5x" always means 1.5x the
  // AI estimate, not 1.5x a previously edited value.
  origCal: number;
  origP: number;
  origC: number;
  origF: number;
  // The per-item portion pill last applied (0 = none / manually typed). Persisted
  // so reopening the editor re-highlights the multiplier that is in effect.
  itemMult: number;
  confidence: Confidence;
  edited: boolean;
  status: 'kept' | 'pending' | 'removed';
}

function rowsFromResult(r: EstimateResult): Row[] {
  return r.line_items.map((it: LineItem) => ({
    id: it.id,
    name: it.name,
    portion: it.portion_description,
    baseCal: it.calories,
    baseP: it.protein_g,
    baseC: it.carbs_g,
    baseF: it.fat_g,
    origCal: it.calories,
    origP: it.protein_g,
    origC: it.carbs_g,
    origF: it.fat_g,
    itemMult: 1,
    confidence: it.confidence,
    edited: false,
    status: it.confidence === 'low' ? 'pending' : 'kept',
  }));
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabelFromKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function AIMealEstimatorScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();

  // Slot/date context from the launching entry point. The Food Library FAB
  // passes neither, so we fall back to a picker (ambiguous = true).
  const launchMeal = typeof params.meal === 'string' && params.meal && params.meal !== 'browse' ? params.meal : null;
  const launchDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;

  const [mindful, setMindful] = useState(false);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  const [slotNameCache, setSlotNameCache] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  // Supporter status from RevenueCat (aliased to isPro). Drives the estimator quota tier.
  const { isSupporter: isPro } = useMembership();

  // Input state
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const descRef = useRef<TextInput>(null);

  // Flow state
  const [step, setStep] = useState<Step>('input');
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [slowLoad, setSlowLoad] = useState(false);

  // Results state
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [mealName, setMealName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  // mult = the per-item portion pill currently highlighted (0 = none / manually typed).
  const [draft, setDraft] = useState({ name: '', portion: '', cal: '', p: '', c: '', f: '', mult: 1 });

  // Modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [todayEstimates, setTodayEstimates] = useState<TodayEstimate[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Confirm-save target (seeded from launch context, editable when ambiguous)
  const [targetSlot, setTargetSlot] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_settings');
        if (raw) setMindful(JSON.parse(raw).styleMode === 'Mindful');
      } catch {}
      const { mealSlots: ms, slotNameCache: sc } = await loadMealSlots();
      setMealSlots(ms);
      setSlotNameCache(sc);
      setTargetSlot(launchMeal || ms[0]?.id || DEFAULT_MEAL_SLOTS[0].id);
      setTargetDate(launchDate || toDateKey(new Date()));
      // Recover today's stashed estimates (failsafe). Anything from a prior day
      // is ignored and overwritten on the next successful estimate.
      try {
        const tRaw = await AsyncStorage.getItem(TODAY_KEY);
        if (tRaw) {
          const d = JSON.parse(tRaw);
          if (d?.date === toDateKey(new Date()) && Array.isArray(d.estimates)) {
            setTodayEstimates(d.estimates);
          }
        }
      } catch {}
    })();
  }, []);

  // Remaining uses depend on the Supporter tier; recompute whenever the entitlement resolves/changes.
  useEffect(() => {
    getRemainingUses(isPro).then(setRemaining).catch(() => {});
  }, [isPro]);

  // ── Image ───────────────────────────────────────────────────────────────────

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Allow photo access in Settings to attach a meal photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: IMAGE_QUALITY, base64: true,
    });
    applyPicked(res);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take a meal photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images', quality: IMAGE_QUALITY, base64: true,
    });
    applyPicked(res);
  };

  const applyPicked = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setImageUri(a.uri);
    setImageBase64(a.base64 ?? null);
    setImageMime(a.mimeType || 'image/jpeg');
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  const choosePhoto = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
        (i) => { if (i === 0) takePhoto(); else if (i === 1) pickFromLibrary(); },
      );
    } else {
      Alert.alert('Add a photo', undefined, [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const removePhoto = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setImageUri(null);
    setImageBase64(null);
  };

  // ── Submit / estimate ─────────────────────────────────────────────────────────

  const canSubmit = description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    // Quota gate BEFORE any call (no-food and failures never reach here as a use).
    const rem = await getRemainingUses(isPro);
    setRemaining(rem);
    if (rem <= 0) {
      // Out of estimates: the inline out-of-estimates card (in place of the Estimate button) takes over. No popup.
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    descRef.current?.blur();
    setErrorKind(null);
    setSlowLoad(false);
    setStep('loading');
    const slowTimer = setTimeout(() => setSlowLoad(true), 10000);

    const outcome = await generateMealEstimate({
      description,
      imageBase64,
      imageMediaType: imageMime,
    });
    clearTimeout(slowTimer);

    if (!outcome.ok) {
      setErrorKind(outcome.kind);
      setStep('input');
      return;
    }

    // Success: this is the moment a use is counted (see service contract).
    const next = await incrementQuota();
    setRemaining(Math.max(0, limitFor(isPro) - next.usesThisMonth));

    setResult(outcome.result);
    setRows(rowsFromResult(outcome.result));
    setMealName(outcome.result.meal_name_suggestion);
    setMultiplier(1);
    setStep('results');
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    stashEstimate(outcome.result);
  };

  const handleResubmit = () => {
    // Return to input with photo + text retained. A fresh call counts as a new use.
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setStep('input');
    setErrorKind(null);
  };

  // Save a freshly generated estimate to today's failsafe stash.
  const stashEstimate = async (res: EstimateResult) => {
    const dayKey = toDateKey(new Date());
    const entry: TodayEstimate = {
      id: `est_${Date.now().toString(36)}`,
      mealName: res.meal_name_suggestion,
      result: res,
      createdAt: Date.now(),
    };
    try {
      const raw = await AsyncStorage.getItem(TODAY_KEY);
      let data = raw ? JSON.parse(raw) : null;
      if (!data || data.date !== dayKey || !Array.isArray(data.estimates)) data = { date: dayKey, estimates: [] };
      data.estimates = [entry, ...data.estimates].slice(0, 20);
      await storageSet(TODAY_KEY, JSON.stringify(data));
      setTodayEstimates(data.estimates);
    } catch {}
  };

  // Reopen a stashed estimate in the results view. Does NOT count a new use.
  const loadEstimate = (e: TodayEstimate) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setResult(e.result);
    setRows(rowsFromResult(e.result));
    setMealName(e.result.meal_name_suggestion);
    setMultiplier(1);
    setEditingId(null);
    setErrorKind(null);
    setShowRecent(false);
    setStep('results');
  };

  // ── Row math ──────────────────────────────────────────────────────────────────

  const scaled = (base: number) => Math.round(base * multiplier);

  const keptRows = rows.filter((r) => r.status === 'kept');
  const pendingRows = rows.filter((r) => r.status === 'pending');
  const hasPending = pendingRows.length > 0;

  const liveTotals = useMemo(() => {
    return keptRows.reduce(
      (acc, r) => ({
        calories: acc.calories + scaled(r.baseCal),
        protein_g: acc.protein_g + scaled(r.baseP),
        carbs_g: acc.carbs_g + scaled(r.baseC),
        fat_g: acc.fat_g + scaled(r.baseF),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
  }, [rows, multiplier]);

  const setRowStatus = (id: string, status: Row['status']) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const openEditor = (r: Row) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(r.id);
    setDraft({
      name: r.name,
      portion: r.portion,
      cal: String(r.baseCal),
      p: String(r.baseP),
      c: String(r.baseC),
      f: String(r.baseF),
      // Re-highlight whatever per-item multiplier is currently in effect.
      mult: r.itemMult,
    });
  };

  // Per-item portion pill: fill the macro fields with the AI original scaled by m.
  const applyItemMultiplier = (m: number) => {
    const row = rows.find((r) => r.id === editingId);
    if (!row) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setDraft((d) => ({
      ...d,
      cal: String(Math.round(row.origCal * m)),
      p: String(Math.round(row.origP * m)),
      c: String(Math.round(row.origC * m)),
      f: String(Math.round(row.origF * m)),
      mult: m,
    }));
  };

  const saveEditor = () => {
    if (!editingId) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const n = (v: string) => Math.max(0, Math.round(parseFloat(v) || 0));
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== editingId) return r;
        const nc = n(draft.cal), np = n(draft.p), ncar = n(draft.c), nf = n(draft.f);
        // Only "custom" if the numbers actually differ from the AI original.
        // Scaling back to 1x (or typing the originals) clears the CUSTOM tag.
        const isCustom = !(nc === r.origCal && np === r.origP && ncar === r.origC && nf === r.origF);
        return {
          ...r,
          name: draft.name.trim() || r.name,
          portion: draft.portion.trim(),
          baseCal: nc, baseP: np, baseC: ncar, baseF: nf,
          itemMult: draft.mult,
          edited: isCustom,
          status: 'kept', // editing a flagged item resolves it
        };
      }),
    );
    setEditingId(null);
  };

  // ── Save to log ────────────────────────────────────────────────────────────────

  const canAddToLog = mealName.trim().length > 0 && !hasPending;

  const openConfirm = () => {
    if (!canAddToLog) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const slotName = getMealDisplayName(targetSlot, mealSlots, slotNameCache);
    const totals = liveTotals;
    const todayKey = toDateKey(new Date());
    const ts = targetDate === todayKey
      ? Date.now()
      : (() => { const [y, m, d] = targetDate.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0).getTime(); })();

    const newEntry = {
      name: mealName.trim(),
      cal: totals.calories,
      meal: targetSlot,
      protein: totals.protein_g,
      carbs: totals.carbs_g,
      fat: totals.fat_g,
      labelCal: totals.calories,
      labelProtein: totals.protein_g,
      labelCarbs: totals.carbs_g,
      labelFat: totals.fat_g,
      loggedAmount: 1,
      loggedUnit: 'serving',
      timestamp: ts,
      fsId: null,
      myFoodId: null,
      isMyFood: false,
      brand: null,
      aiEstimated: true,
    };

    try {
      const saved = await AsyncStorage.getItem(`pj_${targetDate}`);
      const current = saved ? JSON.parse(saved) : {};
      const entries = Array.isArray(current.entries) ? current.entries : [];
      entries.push(newEntry);
      await storageSet(`pj_${targetDate}`, JSON.stringify({ ...current, entries }));
      saveToFirebase(targetDate, 'entries', entries).catch(() => {}); // fire-and-forget: don't block nav on the secondary write
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast(
        `${mealName.trim()} ${mindful ? 'recorded' : 'added'}`,
        `${totals.calories} kcal · ${slotName}`,
        'success',
      );
      setShowConfirm(false);
      router.replace('/(tabs)/log');
    } catch {
      showToast('Could not save, please try again', undefined, 'error');
    }
  };

  // ── Copy helpers ────────────────────────────────────────────────────────────────

  const disclaimerCopy = useMemo(() => {
    const q = result?.input_quality ?? 'text_only';
    if (mindful) {
      if (q === 'photo_only') return 'This is a rough sense of what you ate, read from the photo alone. A short description would sharpen it.';
      if (q === 'text_only') return 'This is a rough sense of what you ate, based on what you described.';
      return 'This is a rough sense of what you ate, read from your photo and your description together.';
    }
    if (q === 'photo_only') return 'Estimated from photo only. Portions are assumed standard and may be significantly off. Add a description for better accuracy.';
    if (q === 'text_only') return 'Estimated from your description. Accuracy depends on the detail you provided.';
    return 'Estimated from your photo and description. Closest result we can give without a nutrition label.';
  }, [result, mindful]);

  // ── Render ──────────────────────────────────────────────────────────────────────

  const cardLabel = { fontSize: 9, letterSpacing: 3, color: theme.textMuted, textTransform: 'uppercase' as const, fontFamily: Type.uiBold };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <BackgroundLayers />
      <ToastRenderer />
      <ScreenHeader title="AI Estimate" />

      {step === 'loading' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <ActivityIndicator size="large" color={theme.accentBlue} />
          <Text style={{ marginTop: 18, fontSize: 16, color: theme.textPrimary, fontFamily: Type.uiSemibold }}>Analyzing your meal...</Text>
          {slowLoad && (
            <Text style={{ marginTop: 8, fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center' }}>
              This can take a moment for complex meals.
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >

            {step === 'input' && (
              <>
                {/* Failsafe: reopen an estimate generated earlier today */}
                {todayEstimates.length > 0 && (
                  <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowRecent(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, borderRadius: 12, padding: 14, marginBottom: 16, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
                    <Ionicons name="time-outline" size={20} color={theme.accentBlue} />
                    <View style={{ flex: 1 }}>
                      <GradientNumber value="Recent Estimates Today" color={theme.textSecondary} style={{ fontSize: 14, fontFamily: Type.uiSemibold }} />
                      <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginTop: 2 }}>{todayEstimates.length} {todayEstimates.length === 1 ? 'estimate' : 'estimates'} saved earlier today</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                )}

                {/* Inline error (data retained) */}
                {errorKind && (
                  <View style={{ backgroundColor: theme.accentRedBg, borderWidth: 1, borderColor: theme.accentRedBorder, borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 10 }}>
                    <Ionicons name={errorKind === 'no_food' ? 'image-outline' : 'alert-circle'} size={20} color={theme.accentRed} />
                    <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, lineHeight: 19 }}>
                      {errorKind === 'no_food'
                        ? "We couldn't find any food in that photo. Try a clearer photo or describe your meal in the text field."
                        : errorKind === 'network'
                        ? "We couldn't reach the estimation service. Check your connection and try again."
                        : errorKind === 'no_key'
                        ? 'The estimator is not configured right now. Try again later.'
                        : 'Something went wrong processing your meal. Try adding more description and resubmitting.'}
                    </Text>
                  </View>
                )}

                {/* Photo field */}
                <Text style={[cardLabel, { marginBottom: 8 }]}>PHOTO (OPTIONAL)</Text>
                {imageUri ? (
                  <View style={{ marginBottom: 18 }}>
                    <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: theme.bgInput }} resizeMode="cover" />
                    <TouchableOpacity onPress={removePhoto} style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="close" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={choosePhoto} style={{ height: 96, borderRadius: 12, borderWidth: 1, borderColor: theme.borderInput, borderStyle: 'dashed', backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center', marginBottom: 18, gap: 6 }}>
                    <Ionicons name="camera-outline" size={26} color={theme.textMuted} />
                    <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiMedium }}>Add a photo</Text>
                  </TouchableOpacity>
                )}

                {/* Text description */}
                <Text style={[cardLabel, { marginBottom: 8 }]}>DESCRIPTION</Text>
                <View style={{ position: 'relative', marginBottom: 8 }}>
                  <TextInput
                    ref={descRef}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="The more detail you give, the better. Include portion size, cooking method, sauces, sides, oils, and anything you can see or guess."
                    placeholderTextColor={theme.textDim}
                    multiline
                    style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, padding: 14, minHeight: 120, fontSize: 14, color: theme.textPrimary, fontFamily: Type.ui, textAlignVertical: 'top' }}
                    onBlur={() => descRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
                  />
                </View>

                {/* Submit, or the calm inline "out of estimates" state (replaces the old popup) */}
                {remaining !== null && remaining <= 0 ? (
                  <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: `${theme.accentBlue}33`, backgroundColor: `${theme.accentBlue}12`, padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold, lineHeight: 21, textAlign: 'center' }}>
                      {isPro ? "You've used all your estimates this month." : "You've used all your free estimates this month."}
                    </Text>
                    <Text style={{ marginTop: 6, fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 19, textAlign: 'center' }}>
                      {isPro ? `They refresh on ${nextResetLabel()}.` : `Your free batch refreshes on ${nextResetLabel()}.`}
                    </Text>
                    {!isPro && (
                      <TouchableOpacity
                        onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push('/support'); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{ marginTop: 12, paddingVertical: 8 }}
                      >
                        <Text style={{ fontSize: 14, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Become a Supporter to keep going →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <>
                    {/* The screen's ONE primary action -> molded solid fill, not a flat painted slab. */}
                    <PrimaryCTA
                      label="Estimate My Meal"
                      icon={<Ionicons name="sparkles" size={18} color="#ffffff" />}
                      disabled={!canSubmit}
                      onPress={handleSubmit}
                      wrapperStyle={{ marginTop: 12 }}
                    />
                    <Text style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: theme.textMuted, fontFamily: Type.ui }}>
                      {remaining === null ? ' ' : `${remaining} ${remaining === 1 ? 'estimate' : 'estimates'} remaining this month`}
                    </Text>
                  </>
                )}
                <Text style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: theme.textDim, fontFamily: Type.ui }}>
                  For informational purposes only. Not medical advice.
                </Text>
              </>
            )}

            {step === 'results' && result && (
              <>
                {/* Disclaimer (always visible, amber) */}
                <View style={{ backgroundColor: 'rgba(212,134,10,0.09)', borderWidth: 1, borderColor: theme.accentAmber, borderRadius: 12, padding: 16, marginBottom: 18, alignItems: 'center' }}>
                  <Ionicons name="information-circle" size={22} color={theme.accentAmber} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 13, color: theme.textPrimary, fontFamily: Type.uiMedium, lineHeight: 20, textAlign: 'center' }}>{disclaimerCopy}</Text>
                </View>

                {/* Section 3: low-confidence flagged (hard gate). Surfaced near the top
                    because Add to Log stays dim until each is resolved. */}
                {hasPending && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={[cardLabel, { marginBottom: 6, color: theme.accentAmber }]}>NEEDS YOUR REVIEW</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 18, marginBottom: 12 }}>
                      These were harder to estimate. Confirm, adjust, or remove each one before logging.
                    </Text>
                    {pendingRows.map((r) => (
                      <View key={r.id} style={{ backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.accentAmber, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
                        <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 14, fontFamily: Type.uiSemibold }} />
                        {!!r.portion && <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginTop: 1 }}>{r.portion}</Text>}
                        <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginTop: 6 }}>
                          Best guess: {r.baseCal} kcal · {r.baseP}p · {r.baseC}c · {r.baseF}f
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                          {/* Confirm + Edit shine; REMOVE below deliberately does not -- it is destructive, and
                              shine says "press me". Same call as Duplicate/USE and Replace/Remove. Confirm is
                              green rather than accent but it is still a constructive tinted button, and the
                              gloss is white so it sits fine over either tint (Load Program does the same). */}
                          <TouchableOpacity onPress={() => setRowStatus(r.id, 'kept')} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8, backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder }}>
                            <ButtonShine radius={8} />
                            <Text style={{ fontSize: 12, color: theme.accentGreen, fontFamily: Type.uiSemibold }}>Confirm</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openEditor(r)} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
                            <ButtonShine radius={8} />
                            <Text style={{ fontSize: 12, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setRowStatus(r.id, 'removed')} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8, backgroundColor: theme.accentRedBg, borderWidth: 1, borderColor: theme.accentRedBorder }}>
                            <Text style={{ fontSize: 12, color: theme.accentRed, fontFamily: Type.uiSemibold }}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                        {editingId === r.id && renderEditor()}
                      </View>
                    ))}
                  </View>
                )}

                {/* Section 1: What we estimated (read-only, clean list) */}
                {keptRows.length > 0 && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={[cardLabel, { marginBottom: 10, fontSize: 10 }]}>WHAT WE ESTIMATED</Text>
                    {keptRows.map((r) => (
                      <View key={r.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 8 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.accentBlueRaw, marginTop: 7 }} />
                        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }}>
                          <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 14, lineHeight: 20, fontFamily: Type.uiSemibold }} />
                          {!!r.portion && <Text style={{ fontSize: 14, lineHeight: 20, fontFamily: Type.ui, color: theme.textMuted }}>{`   ${r.portion}`}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Portion multiplier */}
                <Text style={[cardLabel, { marginBottom: 8, fontSize: 10 }]}>PORTION SIZE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 18 }}>
                  {MULTIPLIERS.map((m) => {
                    const active = m === multiplier;
                    return (
                      /* OPAQUE both states. These chips sit on the PAGE, not on a card, and the page down
                         here is the accent glow: the selected chip was a ~10% accent wash OVER an accent
                         glow (mud) and the unselected ones leaned on bgInput, which is near-invisible
                         against the ground. Same fix as the Plans sort chips. */
                      <TouchableOpacity key={m} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setMultiplier(m); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? theme.accentBlueBgOpaque : theme.bgCard, borderWidth: 1, borderColor: active ? theme.accentBlueBorder : theme.borderInput }}>
                        {active && <ButtonShine radius={20} />}
                        <Text style={{ fontSize: 13, color: active ? theme.accentBlue : theme.textMuted, fontFamily: active ? Type.uiBold : Type.uiMedium }}>{m}x</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Editable line items */}
                {keptRows.map((r) => (
                  <View key={r.id} style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', borderLeftWidth: 3, borderLeftColor: theme.accentBlueRaw, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => { if (editingId === r.id) { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingId(null); } else openEditor(r); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <GradientNumber value={r.name} color={theme.textSecondary} style={{ fontSize: 14, fontFamily: Type.uiSemibold }} />
                          {r.edited && (
                            <View style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, letterSpacing: 1, color: theme.accentBlue, fontFamily: Type.uiBold }}>CUSTOM</Text>
                            </View>
                          )}
                        </View>
                        {!!r.portion && <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginTop: 2 }}>{r.portion}</Text>}
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                          <MacroDot color={MACRO.protein} value={scaled(r.baseP)} />
                          <MacroDot color={MACRO.carbs} value={scaled(r.baseC)} />
                          <MacroDot color={MACRO.fat} value={scaled(r.baseF)} />
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                        <GradientNumber value={String(scaled(r.baseCal))} color={mindful ? theme.textSecondary : theme.accentGreen} style={{ fontSize: 20, fontFamily: Type.num }} />
                        <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, marginTop: -2 }}>KCAL</Text>
                        {!r.edited && multiplier !== 1 ? (
                          <Text style={{ fontSize: 10, color: theme.textMuted, fontFamily: Type.uiMedium, marginTop: 3 }}>{multiplier}x</Text>
                        ) : null}
                      </View>
                      <Ionicons name={editingId === r.id ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                    {editingId === r.id && renderEditor()}
                  </View>
                ))}

                {/* Section 2: Possibly not included. ON A CARD now. It was the only naked content on a page
                    made of cards -- fine when the page was flat, but once the page glowed it was muted text
                    sitting in the strongest part of it and became unreadable. Darkening the text would have
                    treated the symptom: this is the AI telling you what it may have MISSED, which is the
                    thing you most need to read before logging the estimate. It earns a card. */}
                {result.hidden_items.length > 0 && (
                  <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 2.5, borderTopColor: theme.accentAmber, padding: 16, marginTop: 8, marginBottom: 18, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
                    <Text style={[cardLabel, { marginBottom: 10 }]}>POSSIBLY NOT INCLUDED</Text>
                    {result.hidden_items.map((h, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: i === result.hidden_items.length - 1 ? 0 : 6 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 13 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui, lineHeight: 19 }}>{h.charAt(0).toUpperCase() + h.slice(1)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Running totals */}
                <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 2.5, borderTopColor: theme.accentBlueRaw, padding: 16, marginTop: 8, marginBottom: 18, shadowColor: theme.cardShadow, shadowOpacity: theme.cardShadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 }}>
                  <Text style={cardLabel}>TOTAL</Text>
                  <View style={{ alignItems: 'center', marginTop: -2, marginBottom: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <GradientNumber value={String(liveTotals.calories)} color={mindful ? theme.textSecondary : theme.accentGreen} style={{ fontSize: 42, fontFamily: Type.num }} />
                      <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.uiMedium }}>KCAL</Text>
                    </View>
                  </View>
                  <View style={{ height: 1, backgroundColor: theme.borderCard, marginVertical: 12 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {[
                      { label: 'PROTEIN', value: liveTotals.protein_g, color: MACRO.protein },
                      { label: 'CARBS', value: liveTotals.carbs_g, color: MACRO.carbs },
                      { label: 'FAT', value: liveTotals.fat_g, color: MACRO.fat },
                    ].map((m, i) => (
                      <View key={m.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        {i > 0 && <View style={{ width: 1, height: 34, backgroundColor: theme.borderCard }} />}
                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <GradientNumber value={`${m.value}g`} color={m.color} style={{ fontSize: 19, fontFamily: Type.uiBold }} />
                          <Text style={[cardLabel, { marginTop: 3 }]}>{m.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Meal name */}
                <Text style={[cardLabel, { marginBottom: 8 }]}>MEAL NAME</Text>
                <TextInput
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Name this meal"
                  placeholderTextColor={theme.textDim}
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, padding: 14, fontSize: 15, color: theme.textPrimary, fontFamily: Type.uiMedium, marginBottom: 18 }}
                />

                {/* Primary + secondary actions. This is the results page's ONE primary action -> molded. */}
                <PrimaryCTA
                  label={mindful ? 'Record This Meal' : 'Add to Log'}
                  icon={<Ionicons name="checkmark-circle" size={18} color="#ffffff" />}
                  disabled={!canAddToLog}
                  onPress={openConfirm}
                />
                {hasPending && (
                  <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: theme.accentAmber, fontFamily: Type.uiMedium }}>Resolve the flagged items above first.</Text>
                )}

                <TouchableOpacity onPress={handleResubmit} style={{ marginTop: 18, alignItems: 'center', paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiMedium }}>Not right? Add more detail and resubmit.</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
      )}

      {renderConfirmModal()}
      {renderRecentModal()}
    </View>
  );

  function renderRecentModal() {
    return (
      <CenteredModal visible={showRecent} onClose={() => setShowRecent(false)} theme={theme} insets={insets} title="Recent Estimates Today">
        <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.ui, lineHeight: 20, marginBottom: 14 }}>
          Reopen one you generated earlier today. This does not use a new estimate. Cleared tomorrow.
        </Text>
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          {todayEstimates.map((e) => {
            const t = computeTotals(e.result.line_items);
            return (
              <TouchableOpacity key={e.id} onPress={() => loadEstimate(e)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <GradientNumber value={e.mealName} color={theme.textSecondary} style={{ fontSize: 14, fontFamily: Type.uiSemibold }} numberOfLines={1} />
                  <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, marginTop: 1 }}>{t.calories} kcal · {new Date(e.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowRecent(false); }} style={{ marginTop: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput }}>
          <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Close</Text>
        </TouchableOpacity>
      </CenteredModal>
    );
  }

  // ── Inline editor (shared by flagged + kept rows) ──────────────────────────────
  function renderEditor() {
    const field = (label: string, key: 'name' | 'portion' | 'cal' | 'p' | 'c' | 'f', numeric: boolean) => (
      <View style={{ flex: 1 }}>
        <Text style={[cardLabel, { marginBottom: 4 }]}>{label}</Text>
        <TextInput
          value={draft[key]}
          onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v, ...(numeric ? { mult: 0 } : {}) }))}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholderTextColor={theme.textDim}
          style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 10, fontSize: 14, color: theme.textPrimary, fontFamily: Type.ui }}
        />
      </View>
    );
    return (
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.borderCard, paddingTop: 12, gap: 10 }}>
        {/* Per-item portion: a quick way to scale just this item off the AI estimate */}
        <View>
          <Text style={[cardLabel, { marginBottom: 6 }]}>SCALE THIS ITEM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {MULTIPLIERS.map((m) => {
              const active = draft.mult === m;
              return (
                <TouchableOpacity key={m} onPress={() => applyItemMultiplier(m)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: active ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: active ? theme.accentBlueBorder : theme.borderInput }}>
                  {active && <ButtonShine radius={16} />}
                  <Text style={{ fontSize: 12, color: active ? theme.accentBlue : theme.textMuted, fontFamily: active ? Type.uiBold : Type.uiMedium }}>{m}x</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        {field('NAME', 'name', false)}
        {field('PORTION', 'portion', false)}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {field('CAL', 'cal', true)}
          {field('PROTEIN', 'p', true)}
          {field('CARBS', 'c', true)}
          {field('FAT', 'f', true)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setEditingId(null); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput }}>
            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Cancel</Text>
          </TouchableOpacity>
          {/* The per-INGREDIENT save, inside a result row's edit panel. faceStyle matches the Cancel beside
              it (paddingVertical 10 / radius 8). */}
          <PrimaryCTA
            wrapperStyle={{ flex: 1 }}
            faceStyle={{ paddingVertical: 10, borderRadius: 8 }}
            label="Save"
            onPress={saveEditor}
          />
        </View>
      </View>
    );
  }

  // ── Modals ────────────────────────────────────────────────────────────────────

  function renderConfirmModal() {
    const todayK = toDateKey(new Date());
    const atToday = targetDate >= todayK;
    const shiftDate = (delta: number) => {
      const [y, m, d] = targetDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + delta);
      const key = toDateKey(dt);
      if (delta > 0 && key > todayK) return; // no logging into the future
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      setTargetDate(key);
    };
    return (
      <CenteredModal visible={showConfirm} onClose={() => setShowConfirm(false)} theme={theme} insets={insets} title="Save This Meal">

        <Text style={[cardLabel, { marginBottom: 8 }]}>MEAL</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {mealSlots.map((s) => {
            const active = s.id === targetSlot;
            return (
              <TouchableOpacity key={s.id} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setTargetSlot(s.id); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: active ? theme.accentBlueBorder : theme.borderInput }}>
                <Text style={{ fontSize: 13, color: active ? theme.accentBlue : theme.textMuted, fontFamily: active ? Type.uiBold : Type.uiMedium }}>{s.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[cardLabel, { marginBottom: 8 }]}>DATE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, paddingHorizontal: 6, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => shiftDate(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlue} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 14, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>{dateLabelFromKey(targetDate)}</Text>
          <TouchableOpacity onPress={() => shiftDate(1)} disabled={atToday} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: atToday ? 0.3 : 1 }}>
            <Ionicons name="chevron-forward" size={20} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowConfirm(false); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput }}>
            <Text style={{ fontSize: 14, color: theme.textMuted, fontFamily: Type.uiSemibold }}>Cancel</Text>
          </TouchableOpacity>
          {/* The confirm side of a Cancel/Confirm pair is the primary -> molded. Cancel stays quiet.
              faceStyle matches Cancel's geometry exactly (13/10) so the pair is the same height. */}
          <PrimaryCTA
            label={mindful ? 'Record' : 'Add to Log'}
            compact
            onPress={handleConfirmSave}
            wrapperStyle={{ flex: 2 }}
            faceStyle={{ paddingVertical: 13, borderRadius: 10 }}
          />
        </View>
      </CenteredModal>
    );
  }

}

// ── Small presentational helpers ──────────────────────────────────────────────

function MacroDot({ color, value }: { color: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color, fontFamily: Type.uiSemibold }}>{value}g</Text>
    </View>
  );
}

// Centered floating modal: scale + opacity in on show, handle pill, full-screen
// tap-to-dismiss backdrop. Matches the app modal standard.
// `title` added 2026-07-15: this shell rendered a bare handle pill and then dumped children, so each caller
// hand-rolled its own 22px title and NEITHER had an X. ModalHeader owns the pill + title + X; the callers
// just pass the string now.
function CenteredModal({ visible, onClose, theme, title, children }: any) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const animateIn = () => {
    scale.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 250 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };
  const close = () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); onClose(); };
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close} onShow={animateIn}>
      <ToastRenderer />
      <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlayBg }} activeOpacity={1} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} pointerEvents="box-none">
        <Animated.View style={{ width: '100%', maxWidth: 420, backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderColor: theme.borderCard, borderTopWidth: 2.5, borderTopColor: theme.accentBlueRaw, overflow: 'hidden', paddingBottom: 20, transform: [{ scale }], opacity, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 14 }}>
          <ModalHeader title={title} onClose={close} />
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
