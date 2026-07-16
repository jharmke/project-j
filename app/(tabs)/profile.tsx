import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useScrollToTop } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT, TAB_SCROLL_PAD } from '../../components/CustomTabBar';
import BackgroundLayers from '../../components/BackgroundLayers';
import { useToast } from '../../components/Toast';
import { saveToFirebase } from '../../firebaseConfig';
import { storageSet } from '../../utils/storage';
import { computeCalorieFloor } from '../../utils/calorieFloor';
import CalorieFloorModal from '../../components/CalorieFloorModal';
import { setFloatingBarHeight } from '../../utils/floatingBar';
import { useTheme } from '../../theme';
import { useMembership } from '../../MembershipContext';
import HeaderAvatar from '../../components/HeaderAvatar';
import HeaderIconButton from '../../components/HeaderIconButton';
import PrimaryCTA from '../../components/PrimaryCTA';
import SproutIcon from '../../components/SproutIcon';
import MembershipCard from '../../components/MembershipCard';
import { Type, DISPLAY_CAPS, DISPLAY_TRACKING, displaySize } from '../../typography';

interface Profile {
  name: string;
  birthday: string;
  heightFt: string;
  heightIn: string;
  sex: 'male' | 'female';
  lifestyleActivity: string;
  trainingFrequency: string;
  calTarget: string;
  weightGoal: string;
  goalWeight: string;
  waterPresets: [number, number, number];
  macroMode: 'ratio' | 'fixed';
  macroProteinPct: string;
  macroCarbsPct: string;
  macroFatPct: string;
  macroProteinG: string;
  macroCarbsG: string;
  macroFatG: string;
  sleepGoal: string;
  stepGoal: string;
  waterGoal: string;
  activeCalGoal: string;
  exerciseMinsGoal: string;
  useRecommendedCal: boolean;
}

const GOAL_DEFICITS: Record<string, number> = {
  lose_2: -1000,
  lose_1_5: -750,
  lose_1: -500,
  lose_0_75: -375,
  lose_0_5: -250,
  lose_0_25: -125,
  maintain: 0,
  gain_0_5: 250,
  gain_1: 500,
};

const GOAL_LABELS: Record<string, string> = {
  lose_2: 'Lose 2 lb / week',
  lose_1_5: 'Lose 1.5 lb / week',
  lose_1: 'Lose 1 lb / week',
  lose_0_75: 'Lose 0.75 lb / week',
  lose_0_5: 'Lose 0.5 lb / week',
  lose_0_25: 'Lose 0.25 lb / week',
  maintain: 'Maintain weight',
  gain_0_5: 'Gain 0.5 lb / week',
  gain_1: 'Gain 1 lb / week',
};

const LIFESTYLE_OPTIONS = [
  { key: 'sedentary',   label: 'Sedentary',      sub: 'Desk job, minimal movement outside of workouts',         multiplier: 1.2  },
  { key: 'light',       label: 'Lightly Active',  sub: 'Some walking, on your feet occasionally during the day', multiplier: 1.3  },
  { key: 'active',      label: 'Active',           sub: 'On your feet a lot -- server, teacher, retail, trades',  multiplier: 1.45 },
  { key: 'very_active', label: 'Very Active',      sub: 'Hard physical labor most of the day',                   multiplier: 1.6  },
];

const TRAINING_OPTIONS = [
  { key: 'none',  label: 'Not currently training',   sub: 'Little to no structured exercise',         dailyBonus: 0   },
  { key: '1x',    label: '1–2x / week',              sub: 'Light or occasional sessions',             dailyBonus: 100 },
  { key: '3x',    label: '3–4x / week',              sub: 'Consistent training most weeks',           dailyBonus: 200 },
  { key: '5x',    label: '5–6x / week',              sub: 'High frequency, serious commitment',       dailyBonus: 300 },
  { key: 'daily', label: 'Daily / twice daily',      sub: 'Elite or professional training volume',    dailyBonus: 400 },
];

function ProfileSection({ label, subtitle, defaultOpen = false, children, theme, first = false }: {
  label: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode; theme: any; first?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setVisible(false));
    }
  };

  return (
    <View style={{ marginTop: first ? 4 : 20 }}>
      <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggle(); }} activeOpacity={0.7} style={{ paddingVertical: 6, minHeight: 44, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: Type.uiBold, color: theme.textSecondary }}>
            {label}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.textMuted + '55' }} />
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlueRaw} />
        </View>
        {!open && subtitle && (
          <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textMuted, marginTop: 4 }}>
            {subtitle}
          </Text>
        )}
      </TouchableOpacity>
      {visible && (
        <Animated.View style={{ opacity: fadeAnim, paddingBottom: 8 }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [headerH, setHeaderH] = useState(104);
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile>({
    name: '',
    birthday: '',
    heightFt: '',
    heightIn: '',
    sex: 'male',
    lifestyleActivity: 'sedentary',
    trainingFrequency: 'none',
    calTarget: '',
    weightGoal: 'lose_1',
    goalWeight: '',
    waterPresets: [8, 12, 16],
    macroMode: 'ratio',
    macroProteinPct: '35',
    macroCarbsPct: '40',
    macroFatPct: '25',
    macroProteinG: '',
    macroCarbsG: '',
    macroFatG: '',
    sleepGoal: '7',
    stepGoal: '10000',
    waterGoal: '128',
    activeCalGoal: '500',
    exerciseMinsGoal: '30',
    useRecommendedCal: true,
  });
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthday, setTempBirthday] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);
  // Supporter status drives the Membership section's subtitle; the card itself reads the entitlement.
  const { isSupporter } = useMembership();
  const SAVE_BAR_HEIGHT = 76;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const scrollOffset = useRef(0);
  const goalWeightInputY = useRef(0);
  const activityLevelY = useRef(0);
  const [floorModal, setFloorModal] = useState<{ modalCase: 1 | 2 | 3 | 4; target: number; modalLine: number } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const hasChangesRef = useRef(false);

  // Tell the global Otto FAB to lift above this floating save bar while it's showing. Reports the
  // bar's raw content height only -- AssistantOverlay's own resting position already accounts for
  // insets.bottom/tab-bar height, so it does the final gap math once, correctly, for every screen.
  useEffect(() => {
    setFloatingBarHeight(hasChanges ? SAVE_BAR_HEIGHT : 0);
    return () => { if (hasChanges) setFloatingBarHeight(0); };
  }, [hasChanges]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => { setKeyboardHeight(e.endCoordinates.height); });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await AsyncStorage.getItem('pj_profile');
        if (data) {
          const parsed = { goalWeight: '', stepGoal: '10000', waterGoal: '128', activeCalGoal: '500', exerciseMinsGoal: '30', ...JSON.parse(data) };
          setProfile(parsed);
          setSavedProfile(parsed);
        }
      } catch (e) {
        console.log('Load profile error', e);
      }
    };
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadOnFocus = async () => {
        try {
          for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dk = d.toISOString().split('T')[0];
            const s = await AsyncStorage.getItem(`pj_${dk}`);
            if (s) {
              const data = JSON.parse(s);
              if (data.weight) { setCurrentWeight(data.weight); break; }
            }
          }
          // Reload profile on focus to pick up goal changes saved from Settings
          if (!hasChangesRef.current) {
            const data = await AsyncStorage.getItem('pj_profile');
            if (data) {
              const parsed = { goalWeight: '', stepGoal: '10000', waterGoal: '128', activeCalGoal: '500', exerciseMinsGoal: '30', ...JSON.parse(data) };
              setProfile(parsed);
              setSavedProfile(parsed);
            }
          }
        } catch (e) {
          console.log('Load on focus error', e);
        }
      };
      loadOnFocus();
    }, [])
  );

  const calcBMR = () => {
    const weightKg = (currentWeight || 0) * 0.453592;
    const heightCm = (parseFloat(profile.heightFt) * 30.48) + (parseFloat(profile.heightIn) * 2.54);
    if (!profile.birthday) return 0;
    // Safe date parse -- handles both ISO (1997-09-05) and M/D/YYYY (9/5/1997) formats
    const parts = profile.birthday.split(/[-\/T]/);
    const isISO = parts[0].length === 4;
    const birthDate = isISO
      ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      : new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (!weightKg || !heightCm || !age) return 0;
    if (profile.sex === 'male') {
      return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5);
    } else {
      return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
    }
  };

  const calcTDEE = () => {
    const bmr = calcBMR();
    if (!bmr) return 0;
    const lifestyleOpt = LIFESTYLE_OPTIONS.find(o => o.key === profile.lifestyleActivity) || LIFESTYLE_OPTIONS[0];
    const trainingOpt  = TRAINING_OPTIONS.find(o => o.key === profile.trainingFrequency)  || TRAINING_OPTIONS[0];
    return Math.round((bmr * lifestyleOpt.multiplier) + trainingOpt.dailyBonus);
  };

  const calcGoalTarget = () => {
    const tdee = calcTDEE();
    if (!tdee) return 0;
    const deficit = GOAL_DEFICITS[profile.weightGoal] ?? -500;
    return tdee + deficit;
  };

  const calcProjectedDate = (): string | null => {
    const gw = parseFloat(profile.goalWeight);
    if (!gw || !currentWeight) return null;
    const deficit = GOAL_DEFICITS[profile.weightGoal];
    if (!deficit || deficit === 0) return null; // maintain/gain -- no projection
    const lbsPerWeek = Math.abs(deficit) / 500;
    const lbsToGo = currentWeight - gw;
    // Direction check -- goal must make sense for pace
    if (deficit < 0 && lbsToGo <= 0) return null; // losing but already at/below goal
    if (deficit > 0 && lbsToGo >= 0) return null; // gaining but already at/above goal
    const weeksToGoal = Math.abs(lbsToGo) / lbsPerWeek;
    const projDate = new Date();
    projDate.setDate(projDate.getDate() + Math.round(weeksToGoal * 7));
    return projDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const saveProfile = async () => {
    try {
      await storageSet('pj_profile', JSON.stringify(profile));
      await saveToFirebase('profile', 'data', profile);
      setSaved(true);
      hasChangesRef.current = false;
      setHasChanges(false);
      setSavedProfile(profile);
      Animated.timing(floatAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setTimeout(() => setSaved(false), 2000);
      Keyboard.dismiss();
      showToast('Profile saved', undefined, 'success');
    } catch (e) {
      console.log('Save profile error', e);
    }
  };

  const updateField = (field: keyof Profile, value: any) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value };
      const isDifferent = JSON.stringify(updated) !== JSON.stringify(savedProfile);
      if (isDifferent && !hasChanges) {
        hasChangesRef.current = true;
        setHasChanges(true);
        Animated.spring(floatAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
      } else if (!isDifferent && hasChanges) {
        hasChangesRef.current = false;
        setHasChanges(false);
        Animated.timing(floatAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }
      return updated;
    });
  };

  const bmr = calcBMR();
  const tdee = calcTDEE();
  const suggested = calcGoalTarget();
  // Low-target safeguard (SPEC_calorie_floor.md): classify the SHOWN target so the card can
  // caution when it's low. Pure + never clamps -- the number above stays as-is.
  const calorieFloor = computeCalorieFloor({
    calTarget: suggested,
    sex: profile.sex,
    weightGoal: profile.weightGoal,
    lifestyleActivity: profile.lifestyleActivity,
    trainingFrequency: profile.trainingFrequency,
  });

  // Fire the low-target modal when a newly-picked pace lands the target in the modal zone,
  // unless the user already acknowledged a target this low or lower (only re-ask if it drops
  // further -- SPEC_calorie_floor.md persistence). Never blocks: it's warn + consent.
  const maybeShowFloorModal = async (newGoal: string) => {
    const tdee = calcTDEE();
    if (!tdee) return;
    const newTarget = tdee + (GOAL_DEFICITS[newGoal] ?? -500);
    const fl = computeCalorieFloor({
      calTarget: newTarget, sex: profile.sex, weightGoal: newGoal,
      lifestyleActivity: profile.lifestyleActivity, trainingFrequency: profile.trainingFrequency,
    });
    if (fl.zone !== 'modal' || !fl.modalCase) return;
    try {
      const raw = await AsyncStorage.getItem('pj_calorie_warning_acknowledged');
      const ack = raw ? JSON.parse(raw) : null;
      if (ack && typeof ack.target === 'number' && newTarget >= ack.target) return; // same or safer, no nag
    } catch {}
    setFloorModal({ modalCase: fl.modalCase, target: newTarget, modalLine: fl.modalLine });
  };

  // "Choose a slower pace": jump to the FASTEST loss pace whose target clears the modal line
  // (least slowdown that's still safe), or the gentlest available if none clear.
  const floorSlowerPace = () => {
    const tdee = calcTDEE();
    const order = ['lose_2', 'lose_1_5', 'lose_1', 'lose_0_75', 'lose_0_5', 'lose_0_25'];
    let pick = 'lose_0_25';
    if (floorModal) {
      for (const p of order) {
        if (tdee + (GOAL_DEFICITS[p] ?? 0) >= floorModal.modalLine) { pick = p; break; }
      }
    }
    updateField('weightGoal', pick);
    setFloorModal(null);
  };

  const floorAdjustActivity = () => {
    setFloorModal(null);
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, activityLevelY.current - 12), animated: true }), 160);
  };

  const floorSetMaintenance = () => {
    updateField('weightGoal', 'maintain');
    setFloorModal(null);
  };

  const floorContinue = async () => {
    if (floorModal) {
      try { await storageSet('pj_calorie_warning_acknowledged', JSON.stringify({ target: floorModal.target, date: new Date().toISOString() })); } catch {}
    }
    setFloorModal(null);
  };

  return (
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1 }}>
      <BackgroundLayers />
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)} style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: theme.borderCard }]}>
        <BlurView intensity={theme.id === 'dark' ? 34 : 28} tint={theme.id === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {/* Frosted chrome fill -- matches the tab bar (theme.chromeFill). 'transparent' on pure-blur themes. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <HeaderAvatar inert />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Profile</Text>
            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <HeaderIconButton icon="trophy" onPress={() => { router.push('/achievements' as any); }} />
          <HeaderIconButton icon="settings" onPress={() => { router.push('/settings'); }} />
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={[styles.content, { paddingTop: headerH + 16, paddingBottom: insets.bottom + TAB_SCROLL_PAD }]} automaticallyAdjustKeyboardInsets={true} onScroll={e => { scrollOffset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>

        <ProfileSection label="Basic Info" subtitle="Name, height, birthday, sex" defaultOpen={true} theme={theme} first={true}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Name</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.name} onChangeText={v => updateField('name', v)} placeholder="Your name" placeholderTextColor={theme.textPlaceholder} />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Birthday</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowDatePicker(true); }}>
            <Text style={{ color: profile.birthday ? theme.textPrimary : theme.textPlaceholder, fontFamily: Type.ui, fontSize: 15 }}>
              {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : 'Select birthday...'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
                <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowDatePicker(false); setTempBirthday(null); }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: Type.uiMedium }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  setShowDatePicker(false);
                  if (tempBirthday) updateField('birthday', tempBirthday.toISOString());
                  setTempBirthday(null);
                }}>
                  <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: Type.uiSemibold }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                mode="date"
                value={tempBirthday || (profile.birthday ? new Date(profile.birthday) : new Date(1996, 0, 1))}
                display="spinner"
                textColor={theme.textPrimary}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  if (date) setTempBirthday(date);
                }}
              />
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Height</Text>
          <View style={styles.heightRow}>
            <View style={styles.heightField}>
              <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.heightFt} onChangeText={v => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); updateField('heightFt', isNaN(n) ? '' : String(Math.min(8, Math.max(1, n)))); }} keyboardType="number-pad" placeholder="5" placeholderTextColor={theme.textPlaceholder} maxLength={1} />
              <Text style={[styles.heightUnit, { color: theme.textMuted }]}>ft</Text>
            </View>
            <View style={styles.heightField}>
              <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.heightIn} onChangeText={v => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); updateField('heightIn', isNaN(n) ? '' : String(Math.min(11, Math.max(0, n)))); }} keyboardType="number-pad" placeholder="9" placeholderTextColor={theme.textPlaceholder} maxLength={2} />
              <Text style={[styles.heightUnit, { color: theme.textMuted }]}>in</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Current Weight</Text>
          <View style={[styles.weightDisplay, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}>
            <Text style={[styles.weightVal, { color: theme.accentBlue }]}>{currentWeight ? `${currentWeight} lbs` : '--'}</Text>
            <Text style={[styles.weightSub, { color: theme.textMuted }]}>Pulled from your daily log</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Sex</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                profile.sex === 'male' && { backgroundColor: theme.bgSelected, borderColor: theme.accentBlue }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateField('sex', 'male'); }}>
              <Text style={[styles.toggleBtnText, { color: theme.textMuted }, profile.sex === 'male' && { color: theme.accentBlue }]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                profile.sex === 'female' && { backgroundColor: theme.bgSelected, borderColor: theme.accentBlue }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateField('sex', 'female'); }}>
              <Text style={[styles.toggleBtnText, { color: theme.textMuted }, profile.sex === 'female' && { color: theme.accentBlue }]}>Female</Text>
            </TouchableOpacity>
          </View>
        </ProfileSection>

        {/* Shared with Settings > Membership (components/MembershipCard) so the two can never drift. */}
        <ProfileSection label="Membership" subtitle={isSupporter ? 'Supporter' : 'Support the Mission'} defaultOpen={true} theme={theme}>
          <View style={{ marginTop: 2 }}>
            <MembershipCard />
          </View>
        </ProfileSection>

        <View onLayout={e => { activityLevelY.current = e.nativeEvent.layout.y; }} />
        <ProfileSection label="Activity Level" subtitle="Lifestyle & training frequency" theme={theme}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>LIFESTYLE</Text>
          <Text style={{ fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', color: theme.textMuted, marginBottom: 8 }}>Your day-to-day movement, not counting workouts.</Text>
          {LIFESTYLE_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[styles.activityBtn, { borderWidth: 0.5, borderColor: theme.borderInput, backgroundColor: theme.bgInput },
                profile.lifestyleActivity === o.key && { backgroundColor: theme.bgSelected, borderColor: theme.accentBlue }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateField('lifestyleActivity', o.key); }}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim },
                profile.lifestyleActivity === o.key && { backgroundColor: theme.accentBlue }]} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontFamily: Type.uiMedium }, { color: theme.textMuted },
                  profile.lifestyleActivity === o.key && { color: theme.textPrimary }]}>{o.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textDim, marginTop: 1 }}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 12, marginBottom: 12 }} />

          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>TRAINING FREQUENCY</Text>
          <Text style={{ fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', color: theme.textMuted, marginBottom: 8 }}>How often you do structured workouts.</Text>
          {TRAINING_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[styles.activityBtn, { borderWidth: 0.5, borderColor: theme.borderInput, backgroundColor: theme.bgInput },
                profile.trainingFrequency === o.key && { backgroundColor: theme.bgSelected, borderColor: theme.accentBlue }]}
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateField('trainingFrequency', o.key); }}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim },
                profile.trainingFrequency === o.key && { backgroundColor: theme.accentBlue }]} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontFamily: Type.uiMedium }, { color: theme.textMuted },
                  profile.trainingFrequency === o.key && { color: theme.textPrimary }]}>{o.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: Type.ui, color: theme.textDim, marginTop: 1 }}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ProfileSection>

        {bmr > 0 && (
          <ProfileSection label="Your Estimates" subtitle="BMR, TDEE, and calorie target" theme={theme}>
            <Text style={[styles.estimateNote, { color: theme.textMuted }]}>Based on Mifflin-St Jeor formula - estimates only, not exact values.</Text>
            <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: Type.ui, fontStyle: 'italic', marginBottom: 10 }}>For informational purposes only. Not medical advice.</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: theme.bgInset }]}>
                <Text style={[styles.statVal, { color: theme.textPrimary }]}>{bmr}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>BMR</Text>
                <Text style={[styles.statSub, { color: theme.textMuted }]}>calories at rest</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.bgInset }]}>
                <Text style={[styles.statVal, { color: theme.textPrimary }]}>{tdee}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>TDEE</Text>
                <Text style={[styles.statSub, { color: theme.textMuted }]}>maintenance</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.bgInset }]}>
                <Text style={[styles.statVal, { color: theme.macroProtein }]}>{suggested}</Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Target</Text>
                <Text style={[styles.statSub, { color: theme.textMuted }]}>{GOAL_LABELS[profile.weightGoal] || 'Goal based'}</Text>
              </View>
            </View>
            {calorieFloor.zone !== 'green' && (
              <Text style={{ fontSize: 12, color: theme.statusWarn, fontFamily: Type.uiMedium, marginTop: 10, lineHeight: 17 }}>
                This target is on the low side. Prioritize protein and nutrient-dense foods to fuel and recover well.
              </Text>
            )}
          </ProfileSection>
        )}

        <ProfileSection label="Weight Goal" subtitle="Goal weight & weekly pace" theme={theme}>
          {/* Goal weight input -- lives above pace so the story reads top to bottom */}
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>Goal Weight (optional)</Text>
          <Text style={{ fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', color: theme.textMuted, marginBottom: 10 }}>
            Skip this if you're focused on general health rather than a specific number.
          </Text>
          <View
            onLayout={e => { goalWeightInputY.current = e.nativeEvent.layout.y; }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary, flex: 1, marginBottom: 0 }]}
                value={profile.goalWeight}
                onChangeText={v => {
                  const stripped = v.replace(/[^0-9.]/g, '');
                  const dot = stripped.indexOf('.');
                  if (dot === -1) { updateField('goalWeight', stripped); }
                  else {
                    const before = stripped.slice(0, dot);
                    const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
                    updateField('goalWeight', before + '.' + after);
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 185"
                placeholderTextColor={theme.textPlaceholder}
                maxLength={6}
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: goalWeightInputY.current + 300, animated: true });
                  }, 150);
                }}
              />
              <Text style={{ color: theme.textMuted, fontSize: 14, fontFamily: Type.ui }}>lbs</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 14, marginBottom: 10 }} />
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0, marginBottom: 8 }]}>Weekly Pace (lb / week)</Text>

          {/* Wrapping pill grid -- keeps 9 options compact instead of a long column. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(GOAL_LABELS).map(([key, label]) => {
              const selected = profile.weightGoal === key;
              const short = label.replace(' lb / week', '').replace('Maintain weight', 'Maintain');
              return (
                <TouchableOpacity
                  key={key}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); updateField('weightGoal', key); maybeShowFloorModal(key); }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, borderWidth: 1,
                    backgroundColor: selected ? theme.accentBlueBg : theme.bgInset,
                    borderColor: selected ? theme.accentBlue : theme.borderCard,
                  }}>
                  <Text style={{
                    fontSize: 13,
                    fontFamily: selected ? Type.uiBold : Type.uiSemibold,
                    color: selected ? theme.accentBlue : theme.textSecondary,
                  }}>{short}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Low-target caution at the point of action (mirrors the Your Estimates card) so it's
              seen the moment an aggressive pace is picked, even if Estimates is collapsed. */}
          {calorieFloor.zone !== 'green' && (
            <Text style={{ fontSize: 12, color: theme.statusWarn, fontFamily: Type.uiMedium, marginTop: 12, lineHeight: 17 }}>
              This target is on the low side. Prioritize protein and nutrient-dense foods to fuel and recover well.
            </Text>
          )}

          {(() => {
            const projected = calcProjectedDate();
            const gw = parseFloat(profile.goalWeight);
            const deficit = GOAL_DEFICITS[profile.weightGoal];
            if (!profile.goalWeight) return null;
            if (!currentWeight) return (
              <View style={{ marginTop: 14, padding: 12, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, fontStyle: 'italic' }}>
                  Log your weight today to see a projected date.
                </Text>
              </View>
            );
            if (!projected) return (
              <View style={{ marginTop: 14, padding: 12, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, fontStyle: 'italic' }}>
                  {deficit === 0 ? 'Set a loss or gain pace above to see a projected date.' : 'Your goal weight is already met at your current pace.'}
                </Text>
              </View>
            );
            const lbsToGo = Math.abs(currentWeight - gw);
            return (
              <View style={{ marginTop: 14 }}>
                <View style={{ padding: 12, backgroundColor: theme.bgInset, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 3 }}>Projected</Text>
                    <Text style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1, color: theme.accentBlue }}>{projected}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 3 }}>To Go</Text>
                    <Text style={{ fontSize: 22, fontFamily: Type.num, letterSpacing: 1, color: theme.textPrimary }}>{Math.round(lbsToGo * 10) / 10} lbs</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: Type.ui, fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>For informational purposes only. Not medical advice.</Text>
              </View>
            );
          })()}

          </ProfileSection>

        <ProfileSection label="Water Presets" subtitle="Quick-add water amounts" theme={theme}>
          <Text style={[styles.estimateNote, { color: theme.textMuted }]}>Customize your quick-add water amounts (oz).</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([0, 1, 2] as const).map(i => (
              <View key={i} style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Preset {i + 1}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                  value={String((profile.waterPresets || [8, 12, 16])[i])}
                  onChangeText={v => {
                    const val = parseInt(v) || 0;
                    const updated: [number, number, number] = [...(profile.waterPresets || [8, 12, 16])] as [number, number, number];
                    updated[i] = val;
                    updateField('waterPresets', updated as any);
                  }}
                  keyboardType="number-pad"
                  placeholder="oz"
                  placeholderTextColor={theme.textPlaceholder}
                />
              </View>
            ))}
          </View>
        </ProfileSection>


        <View style={{ height: 100 }} />

      </ScrollView>
    {/* Floating save bar.
        bottom is TAB_BAR_HEIGHT + inset, not 0. The tab bar is absolutely positioned, so this screen's
        box now runs all the way to the device edge -- at bottom:0 the save bar would sit UNDERNEATH the
        tab bar and be unreachable. */}
      <KeyboardAvoidingView behavior="padding" style={{ position: 'absolute', bottom: TAB_BAR_HEIGHT + insets.bottom, left: 0, right: 0, display: hasChanges ? 'flex' : 'none' }}>
      <Animated.View
        style={{
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: keyboardHeight > 0 ? 12 : 16,
        // GLASS, not a white slab. This is floating chrome, exactly like the header and the tab bar, and
        // it should behave like them: content passes under it, you can see it through. A solid bgSheet
        // panel dropped in front of a translucent, glowing page reads as a foreign object.
        borderTopWidth: 0.5,
        borderTopColor: theme.borderCard,
        overflow: 'hidden',
        transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }],
      }}>
        <BlurView
          intensity={theme.id === 'dark' ? 40 : 34}
          tint={theme.id === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* The frost, matching the tab bar + all 6 tab headers. This bar had the BLUR but not the FILL, and
            theme.tsx's own note on chromeFill describes the result exactly: a blur alone over the page's
            accent glow "turns into a COLOURED WINDOW". Down here the glow is at its strongest, so the bar
            came out teal while every other piece of chrome in the app is near-white frost. chromeFill is
            'transparent' on Dark/Warm/Blush by design, so this only changes Light + Slate. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              Keyboard.dismiss();
              if (savedProfile) setProfile(savedProfile);
              hasChangesRef.current = false;
              setHasChanges(false);
              Animated.timing(floatAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
            }}
            style={{
              backgroundColor: theme.bgInput,
              borderWidth: 0.5,
              borderColor: theme.borderInput,
              // 13 = PrimaryCTA's radius, not the 10 that was hand-typed here. Two buttons sharing a row
              // must share their corners. Fixed on THIS side rather than via PrimaryCTA's faceStyle: the
              // shared component carries the house value, so the local one-off is what should move.
              borderRadius: 13,
              paddingVertical: 16,
              // Was a FIXED width: 90 with padding: 16 -- i.e. 58px of usable space, which "CANCEL" at 18px
              // + letterSpacing 2 does not fit into, so it wrapped to "CANC / EL". Hugging its own label
              // cannot wrap at any font size; the fixed width was the bug, not the label.
              paddingHorizontal: 20,
              alignItems: 'center',
            }}>
            {/* Type.num was the NUMBER face (Rajdhani -- condensed, TABULAR, built for values) on a button
                LABEL. A button label is INTERFACE copy. This is the roadmap's "non-modal number-face
                stragglers" quick win; Cancel keeps its neutral fill (it is the passive half of the pair). */}
            <Text numberOfLines={1} style={{ fontSize: 17, fontFamily: Type.uiBold, letterSpacing: 0.2, color: theme.textMuted }}>
              Cancel
            </Text>
          </TouchableOpacity>
          {/* MOLDED, the same button as "Estimate My Meal": a real vertical gradient + an accent glow, so it
              reads as a physical object instead of a flat painted rectangle. It was hand-built here and got
              neither. PrimaryCTA also owns the label face + the disabled state, which is why the Rajdhani
              bug above cannot come back on this one. Mixed case to match the CTA it now matches. */}
          <PrimaryCTA
            wrapperStyle={{ flex: 1 }}
            label={saved ? 'Saved' : 'Save Profile'}
            onPress={saveProfile}
          />
        </View>
      </Animated.View>
      </KeyboardAvoidingView>

      {floorModal && (
        <CalorieFloorModal
          theme={theme}
          modalCase={floorModal.modalCase}
          target={floorModal.target}
          onSlowerPace={floorSlowerPace}
          onAdjustActivity={floorAdjustActivity}
          onSetMaintenance={floorSetMaintenance}
          onContinue={floorContinue}
        />
      )}

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  content:            { padding: 16 },
  header:             { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 0.5 },
  headerLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: Type.uiBold },
  headerTitle:        { fontSize: displaySize(27), fontFamily: Type.display, letterSpacing: DISPLAY_TRACKING, ...(DISPLAY_CAPS ? { textTransform: 'uppercase' as const } : {}) },
  card:               { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:          { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 0, fontFamily: Type.uiBold },
  fieldLabel:         { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input:              { borderWidth: 0.5, borderRadius: 8, padding: 10, fontSize: 15, fontFamily: Type.ui, marginBottom: 4 },
  heightRow:          { flexDirection: 'row', gap: 12 },
  heightField:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heightUnit:         { fontSize: 13, fontFamily: Type.ui },
  weightDisplay:      { borderWidth: 0.5, borderRadius: 8, padding: 10, marginBottom: 4 },
  weightVal:          { fontSize: 20, fontFamily: Type.num, letterSpacing: 1 },
  weightSub:          { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  toggleRow:          { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn:          { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive:    { },
  toggleBtnText:      { fontSize: 14, fontFamily: Type.uiMedium },
  toggleBtnTextActive:{ },
  activityBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, marginBottom: 4 },
  activityBtnActive:  { },
  activityDot:        { width: 8, height: 8, borderRadius: 4 },
  activityDotActive:  { },
  activityLabel:      { fontSize: 13, fontFamily: Type.ui, flex: 1 },
  activityLabelActive:{ },
  estimateNote:       { fontSize: 11, fontFamily: Type.ui, fontStyle: 'italic', marginBottom: 12 },
  statsRow:           { flexDirection: 'row', gap: 8 },
  statBox:            { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  statVal:            { fontSize: 24, fontFamily: Type.num, letterSpacing: 1 },
  statLabel:          { fontSize: 9, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  statSub:            { fontSize: 9, fontFamily: Type.ui, textAlign: 'center', marginTop: 2 },
  useRecommended:     { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 10 },
  useRecommendedText: { fontSize: 13, fontFamily: Type.uiSemibold },
  saveBtn:            { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  saveBtnDone:        { },
  saveBtnText:        { fontSize: 18, fontFamily: Type.num, letterSpacing: 2 },
  saveBtnDisabled:    { borderWidth: 0.5 },
});