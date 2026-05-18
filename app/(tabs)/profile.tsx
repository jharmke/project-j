import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ToggleSwitch from '../../components/ToggleSwitch';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/Toast';
import { saveToFirebase } from '../../firebaseConfig';
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

const HOUR_OPTIONS = ['5', '6', '7', '8', '9', '10'];
const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const ITEM_HEIGHT = 44;

function SleepGoalPicker({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: any }) {
  const currentGoal = parseFloat(value || '7');
  const currentHours = Math.floor(currentGoal);
  const currentMins = Math.round((currentGoal % 1) * 60);
  const currentHourStr = String(currentHours);
  const currentMinStr = String(currentMins).padStart(2, '0');

  const hourScrollRef = useRef<ScrollView>(null);
  const minScrollRef = useRef<ScrollView>(null);
  const hourIndex = HOUR_OPTIONS.indexOf(currentHourStr);
  const minIndex = MINUTE_OPTIONS.indexOf(currentMinStr);

  useEffect(() => {
    const validHourIndex = hourIndex >= 0 ? hourIndex : 2;
    const validMinIndex = minIndex >= 0 ? minIndex : 0;
    setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: validHourIndex * ITEM_HEIGHT, animated: false });
      minScrollRef.current?.scrollTo({ y: validMinIndex * ITEM_HEIGHT, animated: false });
    }, 100);
  }, []);

  const handleHourScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(HOUR_OPTIONS.length - 1, index));
    const mins = currentMins / 60;
    onChange(String(parseInt(HOUR_OPTIONS[clamped]) + mins));
  };

  const handleMinScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(MINUTE_OPTIONS.length - 1, index));
    const mins = parseInt(MINUTE_OPTIONS[clamped]) / 60;
    onChange(String(currentHours + mins));
  };

  const displayGoal = `${currentHours}h${currentMins > 0 ? ` ${currentMins}m` : ''}`;

  return (
    <View>
      <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 12 }}>
        How many hours of sleep are you aiming for each night?
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Hours</Text>
          <View style={{ height: ITEM_HEIGHT * 3, width: 80, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: theme.accentBlueBorder, zIndex: 1 }} pointerEvents="none" />
            <ScrollView
              ref={hourScrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
              onMomentumScrollEnd={handleHourScroll}
              onScrollEndDrag={handleHourScroll}
            >
              {HOUR_OPTIONS.map((h, i) => {
                const isSelected = h === currentHourStr;
                return (
                  <View key={h} style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: isSelected ? 30 : 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: isSelected ? theme.accentBlue : theme.textMuted, opacity: isSelected ? 1 : 0.4 }}>{h}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
        <Text style={{ fontSize: 30, color: theme.textMuted, fontFamily: 'BebasNeue_400Regular', marginTop: 20 }}>:</Text>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Minutes</Text>
          <View style={{ height: ITEM_HEIGHT * 3, width: 80, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: theme.accentBlueBorder, zIndex: 1 }} pointerEvents="none" />
            <ScrollView
              ref={minScrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
              onMomentumScrollEnd={handleMinScroll}
              onScrollEndDrag={handleMinScroll}
            >
              {MINUTE_OPTIONS.map((m) => {
                const isSelected = m === currentMinStr;
                return (
                  <View key={m} style={{ height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: isSelected ? 30 : 20, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: isSelected ? theme.accentBlue : theme.textMuted, opacity: isSelected ? 1 : 0.4 }}>{m}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontSize: 13, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>Goal: {displayGoal}</Text>
      </View>
    </View>
  );
}

function CollapsibleCard({ label, defaultOpen = false, children, theme }: { label: string, defaultOpen?: boolean, children: React.ReactNode, theme: any }) {
  const [open, setOpen] = useState(defaultOpen);
  const [visible, setVisible] = useState(defaultOpen);
  const fadeAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw }]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingVertical: 12, marginVertical: -12 }} onPress={toggle}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </TouchableOpacity>
      <Animated.View style={{ marginTop: 12, opacity: fadeAnim, display: visible ? 'flex' : 'none' }}>
        {children}
      </Animated.View>
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
    useRecommendedCal: true,
  });
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthday, setTempBirthday] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const goalWeightInputY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
          const parsed = { goalWeight: '', stepGoal: '10000', waterGoal: '128', ...JSON.parse(data) };
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
      const loadWeight = async () => {
        try {
          for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dk = d.toISOString().split('T')[0];
            const saved = await AsyncStorage.getItem(`pj_${dk}`);
            if (saved) {
              const data = JSON.parse(saved);
              if (data.weight) {
                setCurrentWeight(data.weight);
                return;
              }
            }
          }
        } catch (e) {
          console.log('Load weight error', e);
        }
      };
      loadWeight();
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

  const isMacroValid = () => {
    const kcalTarget = parseFloat(profile.calTarget) || suggested || 0;
    if (kcalTarget === 0) return true; // no target set yet, don't block
    if (profile.macroMode === 'ratio') {
      const total = (parseFloat(profile.macroProteinPct) || 0) + (parseFloat(profile.macroCarbsPct) || 0) + (parseFloat(profile.macroFatPct) || 0);
      return total === 100;
    } else {
      const totalKcal = ((parseFloat(profile.macroProteinG) || 0) * 4) + ((parseFloat(profile.macroCarbsG) || 0) * 4) + ((parseFloat(profile.macroFatG) || 0) * 9);
      return Math.abs(totalKcal - kcalTarget) <= 50;
    }
  };

  const saveProfile = async () => {
    try {
      const kcalTarget = profile.useRecommendedCal && suggested > 0 ? suggested : parseFloat(profile.calTarget) || suggested || 0;
      let synced = { ...profile, ...(profile.useRecommendedCal && suggested > 0 ? { calTarget: suggested.toString() } : {}) };

      if (profile.macroMode === 'ratio' && kcalTarget > 0) {
        synced.macroProteinG = String(Math.round(((parseFloat(profile.macroProteinPct) || 0) / 100) * kcalTarget / 4));
        synced.macroCarbsG   = String(Math.round(((parseFloat(profile.macroCarbsPct)   || 0) / 100) * kcalTarget / 4));
        synced.macroFatG     = String(Math.round(((parseFloat(profile.macroFatPct)     || 0) / 100) * kcalTarget / 9));
      } else if (profile.macroMode === 'fixed' && kcalTarget > 0) {
        const pKcal = (parseFloat(profile.macroProteinG) || 0) * 4;
        const cKcal = (parseFloat(profile.macroCarbsG)   || 0) * 4;
        const fKcal = (parseFloat(profile.macroFatG)     || 0) * 9;
        const totalKcal = pKcal + cKcal + fKcal;
        if (totalKcal > 0) {
          synced.macroProteinPct = String(Math.round((pKcal / totalKcal) * 100));
          synced.macroCarbsPct   = String(Math.round((cKcal / totalKcal) * 100));
          synced.macroFatPct     = String(Math.round((fKcal / totalKcal) * 100));
        }
      }

      setProfile(synced);
      await AsyncStorage.setItem('pj_profile', JSON.stringify(synced));
      await saveToFirebase('profile', 'data', synced);
      setSaved(true);
      setHasChanges(false);
      setSavedProfile(synced);
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
        setHasChanges(true);
        Animated.spring(floatAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
      } else if (!isDifferent && hasChanges) {
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
            onPress={() => router.push('/achievements' as any)}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trophy" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings" size={14} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>

        <CollapsibleCard label="Basic Info" defaultOpen={true} theme={theme}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Name</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.name} onChangeText={v => updateField('name', v)} placeholder="Your name" placeholderTextColor={theme.textPlaceholder} />

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Birthday</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: profile.birthday ? theme.textPrimary : theme.textPlaceholder, fontFamily: 'DMSans_400Regular', fontSize: 15 }}>
              {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : 'Select birthday...'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
                <TouchableOpacity onPress={() => { setShowDatePicker(false); setTempBirthday(null); }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
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
              <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.heightFt} onChangeText={v => updateField('heightFt', v)} keyboardType="number-pad" placeholder="5" placeholderTextColor={theme.textPlaceholder} />
              <Text style={[styles.heightUnit, { color: theme.textMuted }]}>ft</Text>
            </View>
            <View style={styles.heightField}>
              <TextInput style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]} value={profile.heightIn} onChangeText={v => updateField('heightIn', v)} keyboardType="number-pad" placeholder="9" placeholderTextColor={theme.textPlaceholder} />
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
              onPress={() => updateField('sex', 'male')}>
              <Text style={[styles.toggleBtnText, { color: theme.textMuted }, profile.sex === 'male' && { color: theme.accentBlue }]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                profile.sex === 'female' && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => updateField('sex', 'female')}>
              <Text style={[styles.toggleBtnText, { color: theme.textMuted }, profile.sex === 'female' && { color: theme.accentBlue }]}>Female</Text>
            </TouchableOpacity>
          </View>
        </CollapsibleCard>

        <CollapsibleCard label="Activity Level" theme={theme}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted, marginTop: 0 }]}>LIFESTYLE</Text>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', color: theme.textMuted, marginBottom: 8 }}>Your day-to-day movement, not counting workouts.</Text>
          {LIFESTYLE_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.key}
              style={[styles.activityBtn, { borderWidth: 0.5, borderColor: theme.borderInput, backgroundColor: theme.bgInput },
                profile.lifestyleActivity === o.key && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
              onPress={() => updateField('lifestyleActivity', o.key)}>
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
              onPress={() => updateField('trainingFrequency', o.key)}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim },
                profile.trainingFrequency === o.key && { backgroundColor: theme.accentBlue }]} />
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 13, fontFamily: 'DMSans_500Medium' }, { color: theme.textMuted },
                  profile.trainingFrequency === o.key && { color: theme.textPrimary }]}>{o.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans_400Regular', color: theme.textDim, marginTop: 1 }}>{o.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </CollapsibleCard>

        {bmr > 0 && (
          <CollapsibleCard label="Your Estimates" theme={theme}>
            <Text style={[styles.estimateNote, { color: theme.textMuted }]}>Based on Mifflin-St Jeor formula - estimates only, not exact values.</Text>
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
          </CollapsibleCard>
        )}

        <CollapsibleCard label="Weight Goal" theme={theme}>
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
              onPress={() => updateField('weightGoal', key)}>
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
              <View style={{ marginTop: 14, padding: 12, backgroundColor: theme.bgInset, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 3 }}>Projected</Text>
                  <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.accentBlue }}>{projected}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', color: theme.textMuted, marginBottom: 3 }}>To Go</Text>
                  <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, color: theme.textPrimary }}>{Math.round(lbsToGo * 10) / 10} lbs</Text>
                </View>
              </View>
            );
          })()}

          </CollapsibleCard>

        <CollapsibleCard label="Water Presets" theme={theme}>
          <Text style={[styles.estimateNote, { color: theme.textMuted }]}>Customize your quick-add water amounts (oz).</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([0, 1, 2] as const).map(i => (
              <View key={i} style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Preset {i + 1}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                  value={String((profile.waterPresets || [12, 16, 22])[i])}
                  onChangeText={v => {
                    const val = parseInt(v) || 0;
                    const updated: [number, number, number] = [...(profile.waterPresets || [12, 16, 22])] as [number, number, number];
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
        </CollapsibleCard>

        <CollapsibleCard label="Sleep Goal" theme={theme}>
          <SleepGoalPicker
            value={profile.sleepGoal || '7'}
            onChange={v => updateField('sleepGoal', v)}
            theme={theme}
          />
        </CollapsibleCard>

        <CollapsibleCard label="Step Goal" theme={theme}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
            value={profile.stepGoal || '10000'}
            onChangeText={v => updateField('stepGoal', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 10000"
            placeholderTextColor={theme.textPlaceholder}
          />
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 }}>Daily step target. Shows on your home screen progress bar.</Text>
        </CollapsibleCard>

        <CollapsibleCard label="Water Goal" theme={theme}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
            value={profile.waterGoal || '128'}
            onChangeText={v => updateField('waterGoal', v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 128"
            placeholderTextColor={theme.textPlaceholder}
          />
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 }}>Daily hydration target in oz. Progress bar fills to this amount.</Text>
        </CollapsibleCard>

        <CollapsibleCard label="Daily Calorie Target" theme={theme}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Use recommended value</Text>
            <ToggleSwitch
              value={profile.useRecommendedCal !== false}
              onValueChange={v => updateField('useRecommendedCal', v)}
            />
          </View>
          <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: -12, marginBottom: 12 }}>Based on your BMR, activity level, and weight goal.</Text>
          <TextInput
            style={[styles.input, { backgroundColor: profile.useRecommendedCal !== false ? theme.bgProgressTrack : theme.bgInput, borderColor: theme.borderInput, color: profile.useRecommendedCal !== false ? theme.textMuted : theme.textPrimary }]}
            value={profile.useRecommendedCal !== false ? (suggested > 0 ? suggested.toString() : 'Set stats above') : profile.calTarget}
            onChangeText={v => updateField('calTarget', v)}
            keyboardType="number-pad"
            placeholder="e.g. 1750"
            placeholderTextColor={theme.textPlaceholder}
            editable={profile.useRecommendedCal === false}
          />
          {profile.useRecommendedCal === false && (
            <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginTop: 4 }}>Enter a custom calorie target.</Text>
          )}
        </CollapsibleCard>

        <CollapsibleCard label="Macro Goals" theme={theme}>
          <Text style={[styles.estimateNote, { color: theme.textMuted }]}>
            {profile.macroMode === 'ratio'
              ? 'Set percentages - grams update automatically when your calorie target changes.'
              : 'Set grams directly. Percentages and kcal update live.'}
          </Text>

          {/* Mode toggle */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['ratio', 'fixed'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.toggleBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                  profile.macroMode === mode && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
                onPress={() => setProfile(prev => ({ ...prev, macroMode: mode }))}>
                <Text style={[styles.toggleBtnText, { color: theme.textMuted },
                  profile.macroMode === mode && { color: theme.accentBlue }]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {profile.macroMode === 'ratio' ? (
            <View>
              {/* Ratio inputs */}
              {[
                { label: 'Protein', pctKey: 'macroProteinPct' as keyof Profile, color: theme.macroProtein },
                { label: 'Carbs',   pctKey: 'macroCarbsPct'   as keyof Profile, color: theme.macroCarbs },
                { label: 'Fat',     pctKey: 'macroFatPct'     as keyof Profile, color: theme.macroFat },
              ].map(({ label, pctKey, color }) => {
                const pct = parseFloat(profile[pctKey] as string) || 0;
                const kcalTarget = parseFloat(profile.calTarget) || suggested || 0;
                const calsPerGram = label === 'Fat' ? 9 : 4;
                const kcal = Math.round((pct / 100) * kcalTarget);
                const grams = Math.round(kcal / calsPerGram);
                return (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color, flex: 1, marginBottom: 0, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular' }]}
                        value={profile[pctKey] as string}
                        onChangeText={v => updateField(pctKey, v)}
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholder="0"
                        placeholderTextColor={theme.textPlaceholder}
                      />
                      <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>%</Text>
                      <View style={{ flex: 2, backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                          <Text style={{ color, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{grams}</Text>
                          <Text style={{ color, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>g</Text>
                        </View>
                        <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', alignSelf: 'center' }}>{kcal} kcal</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Validation */}
              {(() => {
                const total = (parseFloat(profile.macroProteinPct) || 0) + (parseFloat(profile.macroCarbsPct) || 0) + (parseFloat(profile.macroFatPct) || 0);
                const color = total === 100 ? theme.accentGreen : theme.accentRed;
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: 10, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Total</Text>
                    <Text style={{ fontSize: 16, color, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                      {total}% {total === 100 ? '✓' : `- needs to equal 100%`}
                    </Text>
                  </View>
                );
              })()}
            </View>
          ) : (
            <View>
              {/* Fixed inputs */}
              {[
                { label: 'Protein', gKey: 'macroProteinG' as keyof Profile, color: theme.macroProtein, calsPerGram: 4 },
                { label: 'Carbs',   gKey: 'macroCarbsG'   as keyof Profile, color: theme.macroCarbs,   calsPerGram: 4 },
                { label: 'Fat',     gKey: 'macroFatG'     as keyof Profile, color: theme.macroFat,     calsPerGram: 9 },
              ].map(({ label, gKey, color, calsPerGram }) => {
                const grams = parseFloat(profile[gKey] as string) || 0;
                const kcal = Math.round(grams * calsPerGram);
                const kcalTarget = parseFloat(profile.calTarget) || suggested || 0;
                const pct = kcalTarget > 0 ? Math.round((kcal / kcalTarget) * 100) : 0;
                return (
                  <View key={label} style={{ marginBottom: 12 }}>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color, flex: 1, marginBottom: 0, textAlign: 'center', fontSize: 20, fontFamily: 'BebasNeue_400Regular' }]}
                        value={profile[gKey] as string}
                        onChangeText={v => updateField(gKey, v)}
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="0"
                        placeholderTextColor={theme.textPlaceholder}
                      />
                      <Text style={{ color: theme.textMuted, fontSize: 16, fontFamily: 'DMSans_400Regular' }}>g</Text>
                      <View style={{ flex: 2, backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{kcal} kcal</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_400Regular', alignSelf: 'center' }}>{pct}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Fixed mode total */}
              {(() => {
                const totalKcal = ((parseFloat(profile.macroProteinG) || 0) * 4) + ((parseFloat(profile.macroCarbsG) || 0) * 4) + ((parseFloat(profile.macroFatG) || 0) * 9);
                const kcalTarget = parseFloat(profile.calTarget) || suggested || 0;
                const diff = Math.round(totalKcal - kcalTarget);
                const color = Math.abs(diff) <= 50 ? theme.accentGreen : Math.abs(diff) <= 150 ? theme.accentAmber : theme.accentRed;
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: 10, backgroundColor: theme.bgInset, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_400Regular' }}>Total · {Math.round(totalKcal)} kcal</Text>
                    <Text style={{ fontSize: 13, color, fontFamily: 'DMSans_600SemiBold' }}>
                      {Math.abs(diff) <= 50 ? 'Matches target ✓' : diff > 0 ? `+${diff} kcal over · adjust to save` : `${Math.abs(diff)} kcal under · adjust to save`}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}
        </CollapsibleCard>

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
              Keyboard.dismiss();
              if (savedProfile) setProfile(savedProfile);
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
            onPress={saveProfile}
            disabled={!isMacroValid()}
            style={{
              flex: 1,
              backgroundColor: isMacroValid() ? theme.accentBlue : theme.bgInput,
              borderWidth: isMacroValid() ? 0 : 0.5,
              borderColor: theme.borderInput,
              borderRadius: 10,
              padding: 16,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: isMacroValid() ? theme.bgPrimary : theme.textMuted }}>
              {saved ? 'SAVED' : !isMacroValid() ? 'FIX MACROS TO SAVE' : 'SAVE PROFILE'}
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