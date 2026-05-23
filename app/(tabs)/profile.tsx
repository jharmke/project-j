import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import { saveToFirebase } from '../../firebaseConfig';
import { storageSet } from '../../utils/storage';
import { useTheme } from '../../theme';

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
  lose_0_5: -250,
  maintain: 0,
  gain_0_5: 250,
  gain_1: 500,
};

const GOAL_LABELS: Record<string, string> = {
  lose_2: 'Lose 2 lb / week',
  lose_1_5: 'Lose 1.5 lb / week',
  lose_1: 'Lose 1 lb / week',
  lose_0_5: 'Lose 0.5 lb / week',
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
      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggle(); }} activeOpacity={0.7} style={{ paddingVertical: 6, minHeight: 44, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', color: theme.accentBlueRaw }}>
            {label}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.accentBlueBorder }} />
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlueRaw} />
        </View>
        {!open && subtitle && (
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 4 }}>
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
  const SAVE_BAR_HEIGHT = 76;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const goalWeightInputY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const hasChangesRef = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => { console.log('KB HEIGHT:', e.endCoordinates.height); setKeyboardHeight(e.endCoordinates.height); });
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
        if (keyboardHeight > 0) {
          scrollRef.current?.scrollTo({ y: scrollOffset.current + SAVE_BAR_HEIGHT, animated: true });
        }
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

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.accentBlueRaw }]}>Profile</Text>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/achievements' as any); }}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trophy" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} automaticallyAdjustKeyboardInsets={true} onScroll={e => { scrollOffset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>

        <ProfileSection label="Basic Info" subtitle="Name, height, birthday, sex" defaultOpen={true} theme={theme} first={true}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Name</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.name} onChangeText={v => updateField('name', v)} placeholder="Your name" placeholderTextColor={theme.textPlaceholder} />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Birthday</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDatePicker(true); }}>
            <Text style={{ color: profile.birthday ? theme.textPrimary : theme.textPlaceholder, fontFamily: 'DMSans_400Regular', fontSize: 15 }}>
              {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : 'Select birthday...'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDatePicker(false); setTempBirthday(null); }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDatePicker(false);
                  if (tempBirthday) updateField('birthday', tempBirthday.toISOString());
                  setTempBirthday(null);
                }}>
                  <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
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
                profile.sex === 'male' && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateField('sex', 'male'); }}>
              <Text style={[styles.toggleBtnText, { color: theme.textMuted }, profile.sex === 'male' && { color: theme.accentBlue }]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                profile.sex === 'female' && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateField('sex', 'female'); }}>
              <Text style={[styles.toggleBtnText, { color: theme.textMuted }, profile.sex === 'female' && { color: theme.accentBlue }]}>Female</Text>
            </TouchableOpacity>
          </View>
        </ProfileSection>

        <ProfileSection label="Activity Level" subtitle="Lifestyle & training frequency" theme={theme}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>LIFESTYLE</Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 8 }}>Your day-to-day movement, not counting workouts.</Text>
          {LIFESTYLE_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[styles.activityBtn, { borderWidth: 0.5, borderColor: theme.borderInput, backgroundColor: theme.bgInput },
                profile.lifestyleActivity === o.key && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateField('lifestyleActivity', o.key); }}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim },
                profile.lifestyleActivity === o.key && { backgroundColor: theme.accentBlue }]} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontFamily: 'DMSans_500Medium' }, { color: theme.textMuted },
                  profile.lifestyleActivity === o.key && { color: theme.textPrimary }]}>{o.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 1 }}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 12, marginBottom: 12 }} />

          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>TRAINING FREQUENCY</Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 8 }}>How often you do structured workouts.</Text>
          {TRAINING_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[styles.activityBtn, { borderWidth: 0.5, borderColor: theme.borderInput, backgroundColor: theme.bgInput },
                profile.trainingFrequency === o.key && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateField('trainingFrequency', o.key); }}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim },
                profile.trainingFrequency === o.key && { backgroundColor: theme.accentBlue }]} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontFamily: 'DMSans_500Medium' }, { color: theme.textMuted },
                  profile.trainingFrequency === o.key && { color: theme.textPrimary }]}>{o.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 1 }}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ProfileSection>

        {bmr > 0 && (
          <ProfileSection label="Your Estimates" subtitle="BMR, TDEE, and calorie target" theme={theme}>
            <Text style={[styles.estimateNote, { color: theme.textMuted }]}>Based on Mifflin-St Jeor formula - estimates only, not exact values.</Text>
            <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginBottom: 10 }}>For informational purposes only. Not medical advice.</Text>
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
          </ProfileSection>
        )}

        <ProfileSection label="Weight Goal" subtitle="Goal weight & weekly pace" theme={theme}>
          {/* Goal weight input -- lives above pace so the story reads top to bottom */}
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>Goal Weight (optional)</Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 10 }}>
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
              <Text style={{ color: theme.textMuted, fontSize: 14, fontFamily: 'DMSans_400Regular' }}>lbs</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 0.5, borderTopColor: theme.borderCard, marginTop: 14, marginBottom: 10 }} />
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0, marginBottom: 6 }]}>Weekly Pace</Text>

          {Object.entries(GOAL_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.activityBtn, profile.weightGoal === key && { backgroundColor: theme.accentBlueBg }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateField('weightGoal', key); }}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim }, profile.weightGoal === key && { backgroundColor: theme.accentBlue }]} />
              <Text style={[styles.activityLabel, { color: theme.textMuted }, profile.weightGoal === key && { color: theme.textPrimary }]}>{label}</Text>
            </TouchableOpacity>
          ))}

          {(() => {
            const projected = calcProjectedDate();
            const gw = parseFloat(profile.goalWeight);
            const deficit = GOAL_DEFICITS[profile.weightGoal];
            if (!profile.goalWeight) return null;
            if (!currentWeight) return (
              <View style={{ marginTop: 14, padding: 12, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>
                  Log your weight today to see a projected date.
                </Text>
              </View>
            );
            if (!projected) return (
              <View style={{ marginTop: 14, padding: 12, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>
                  {deficit === 0 ? 'Set a loss or gain pace above to see a projected date.' : 'Your goal weight is already met at your current pace.'}
                </Text>
              </View>
            );
            const lbsToGo = Math.abs(currentWeight - gw);
            return (
              <View style={{ marginTop: 14 }}>
                <View style={{ padding: 12, backgroundColor: theme.bgInset, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 3 }}>Projected</Text>
                    <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.accentBlue }}>{projected}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 3 }}>To Go</Text>
                    <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.textPrimary }}>{Math.round(lbsToGo * 10) / 10} lbs</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', textAlign: 'center', marginTop: 6 }}>For informational purposes only. Not medical advice.</Text>
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
    {/* Floating save bar */}
      <KeyboardAvoidingView behavior="padding" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: hasChanges ? 'flex' : 'none' }}>
      <Animated.View style={{
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: keyboardHeight > 0 ? 12 : 16,
        backgroundColor: theme.bgSheet,
        borderTopWidth: 0.5,
        borderTopColor: theme.borderCard,
        transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) }],
      }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              borderRadius: 10,
              padding: 16,
              alignItems: 'center',
              width: 90,
            }}>
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.textMuted }}>
              CANCEL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveProfile(); }}
            style={{ flex: 1, backgroundColor: theme.accentBlue, borderRadius: 10, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.bgPrimary }}>
              {saved ? 'SAVED' : 'SAVE PROFILE'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </KeyboardAvoidingView>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  content:            { padding: 16, paddingBottom: 80 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:        { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card:               { borderWidth: 0.5, borderTopWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardLabel:          { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 0, fontFamily: 'DMSans_700Bold' },
  fieldLabel:         { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input:              { borderWidth: 0.5, borderRadius: 8, padding: 10, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  heightRow:          { flexDirection: 'row', gap: 12 },
  heightField:        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heightUnit:         { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  weightDisplay:      { borderWidth: 0.5, borderRadius: 8, padding: 10, marginBottom: 4 },
  weightVal:          { fontSize: 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  weightSub:          { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  toggleRow:          { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn:          { flex: 1, padding: 10, borderWidth: 0.5, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive:    { },
  toggleBtnText:      { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  toggleBtnTextActive:{ },
  activityBtn:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, marginBottom: 4 },
  activityBtnActive:  { },
  activityDot:        { width: 8, height: 8, borderRadius: 4 },
  activityDotActive:  { },
  activityLabel:      { fontSize: 13, fontFamily: 'DMSans_400Regular', flex: 1 },
  activityLabelActive:{ },
  estimateNote:       { fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginBottom: 12 },
  statsRow:           { flexDirection: 'row', gap: 8 },
  statBox:            { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  statVal:            { fontSize: 24, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  statLabel:          { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  statSub:            { fontSize: 9, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 2 },
  useRecommended:     { borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 10 },
  useRecommendedText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  saveBtn:            { borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  saveBtnDone:        { },
  saveBtnText:        { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  saveBtnDisabled:    { borderWidth: 0.5 },
});