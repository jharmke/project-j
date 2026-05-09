import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../../firebaseConfig';
import { useTheme } from '../../theme';

interface Profile {
  name: string;
  birthday: string;
  heightFt: string;
  heightIn: string;
  sex: 'male' | 'female';
  activityLevel: string;
  calTarget: string;
  weightGoal: string;
  waterPresets: [number, number, number];
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

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very Active (physical job + exercise)',
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function CollapsibleCard({ label, defaultOpen = false, children, theme }: { label: string, defaultOpen?: boolean, children: React.ReactNode, theme: any }) {
  const [open, setOpen] = useState(defaultOpen);
  const animHeight = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const [measuredHeight, setMeasuredHeight] = useState(0);

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animHeight, {
      toValue,
      useNativeDriver: false,
      bounciness: 0,
      speed: 20,
    }).start();
    setOpen(o => !o);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop }]}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={toggle}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textMuted} />
      </TouchableOpacity>
      <Animated.View style={{
        overflow: 'hidden',
        height: measuredHeight > 0 ? animHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, measuredHeight + 12],
        }) : undefined,
        opacity: animHeight,
      }}>
        <View
          style={{ marginTop: 12 }}
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== measuredHeight) setMeasuredHeight(h);
          }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [profile, setProfile] = useState<Profile>({
    name: '',
    birthday: '',
    heightFt: '',
    heightIn: '',
    sex: 'male',
    activityLevel: 'moderate',
    calTarget: '',
    weightGoal: 'lose_1',
    waterPresets: [12, 16, 22],
  });
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthday, setTempBirthday] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await AsyncStorage.getItem('pj_profile');
        if (data) setProfile(JSON.parse(data));
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
    const age = Math.floor((Date.now() - new Date(profile.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
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
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
  };

  const calcGoalTarget = () => {
    const tdee = calcTDEE();
    if (!tdee) return 0;
    const deficit = GOAL_DEFICITS[profile.weightGoal] ?? -500;
    return tdee + deficit;
  };

  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('pj_profile', JSON.stringify(profile));
      await saveToFirebase('profile', 'data', profile);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.log('Save profile error', e);
    }
  };

  const updateField = (field: keyof Profile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const bmr = calcBMR();
  const tdee = calcTDEE();
  const suggested = calcGoalTarget();

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: theme.borderCard }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: theme.textMuted }]}>PROJECT J</Text>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Profile</Text>
          <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="settings-outline" size={14} color={theme.accentBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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
            <Text style={[styles.weightVal, { color: theme.textPrimary }]}>{currentWeight ? `${currentWeight} lbs` : '--'}</Text>
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
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.activityBtn, profile.activityLevel === key && { backgroundColor: theme.accentBlueBg }]}
              onPress={() => updateField('activityLevel', key)}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim }, profile.activityLevel === key && { backgroundColor: theme.accentBlue }]} />
              <Text style={[styles.activityLabel, { color: theme.textMuted }, profile.activityLevel === key && { color: theme.textPrimary }]}>{label}</Text>
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
          {Object.entries(GOAL_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.activityBtn, profile.weightGoal === key && { backgroundColor: theme.accentBlueBg }]}
              onPress={() => updateField('weightGoal', key)}>
              <View style={[styles.activityDot, { backgroundColor: theme.textDim }, profile.weightGoal === key && { backgroundColor: theme.accentBlue }]} />
              <Text style={[styles.activityLabel, { color: theme.textMuted }, profile.weightGoal === key && { color: theme.textPrimary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
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

        <CollapsibleCard label="Daily Calorie Target" theme={theme}>
          <Text style={[styles.estimateNote, { color: theme.textMuted }]}>Set manually or use the recommended value above.</Text>
          {suggested > 0 && (
            <TouchableOpacity style={[styles.useRecommended, { backgroundColor: theme.accentGreenBg, borderColor: theme.accentGreenBorder }]} onPress={() => updateField('calTarget', suggested.toString())}>
              <Text style={[styles.useRecommendedText, { color: theme.accentGreen }]}>Use recommended ({suggested} kcal)</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
            value={profile.calTarget}
            onChangeText={v => updateField('calTarget', v)}
            keyboardType="number-pad"
            placeholder="e.g. 1750"
            placeholderTextColor={theme.textPlaceholder}
          />
        </CollapsibleCard>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.accentBlue },
            saved && { backgroundColor: theme.accentGreen },
            !hasChanges && { backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput }]}
          onPress={saveProfile}
          disabled={!hasChanges}>
          <Text style={[styles.saveBtnText, { color: !hasChanges ? theme.textMuted : theme.bgPrimary }]}>{saved ? 'SAVED' : 'SAVE PROFILE'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  content:            { padding: 16, paddingBottom: 80 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, marginBottom: 16 },
  headerLabel:        { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle:        { fontSize: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card:               { borderWidth: 0.5, borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
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