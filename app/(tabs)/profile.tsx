import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveToFirebase } from '../../firebaseConfig';

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

function CollapsibleCard({ label, defaultOpen = false, children }: { label: string, defaultOpen?: boolean, children: React.ReactNode }) {
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
    <View style={styles.card}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={toggle}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#666680" />
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
    <View style={{ flex: 1, backgroundColor: '#0d0d0f', paddingTop: insets.top }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>PROJECT J</Text>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={{ fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', marginTop: 1, letterSpacing: 2, textTransform: 'uppercase' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="settings-outline" size={14} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        <CollapsibleCard label="Basic Info" defaultOpen={true}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.input} value={profile.name} onChangeText={v => updateField('name', v)} placeholder="Your name" placeholderTextColor="#444" />

          <Text style={styles.fieldLabel}>Birthday</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: profile.birthday ? '#e8e8f0' : '#444444', fontFamily: 'DMSans_400Regular', fontSize: 15 }}>
              {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : 'Select birthday...'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4 }}>
                <TouchableOpacity onPress={() => { setShowDatePicker(false); setTempBirthday(null); }}>
                  <Text style={{ color: '#666680', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setShowDatePicker(false);
                  if (tempBirthday) updateField('birthday', tempBirthday.toISOString());
                  setTempBirthday(null);
                }}>
                  <Text style={{ color: '#0d9268', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                mode="date"
                value={tempBirthday || (profile.birthday ? new Date(profile.birthday) : new Date(1996, 0, 1))}
                display="spinner"
                textColor="#ffffff"
                maximumDate={new Date()}
                onChange={(event, date) => {
                  if (date) setTempBirthday(date);
                }}
              />
            </View>
          )}

          <Text style={styles.fieldLabel}>Height</Text>
          <View style={styles.heightRow}>
            <View style={styles.heightField}>
              <TextInput style={styles.input} value={profile.heightFt} onChangeText={v => updateField('heightFt', v)} keyboardType="number-pad" placeholder="5" placeholderTextColor="#444" />
              <Text style={styles.heightUnit}>ft</Text>
            </View>
            <View style={styles.heightField}>
              <TextInput style={styles.input} value={profile.heightIn} onChangeText={v => updateField('heightIn', v)} keyboardType="number-pad" placeholder="9" placeholderTextColor="#444" />
              <Text style={styles.heightUnit}>in</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Current Weight</Text>
          <View style={styles.weightDisplay}>
            <Text style={styles.weightVal}>{currentWeight ? `${currentWeight} lbs` : '--'}</Text>
            <Text style={styles.weightSub}>Pulled from your daily log</Text>
          </View>

          <Text style={styles.fieldLabel}>Sex</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, profile.sex === 'male' && styles.toggleBtnActive]} onPress={() => updateField('sex', 'male')}>
              <Text style={[styles.toggleBtnText, profile.sex === 'male' && styles.toggleBtnTextActive]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, profile.sex === 'female' && styles.toggleBtnActive]} onPress={() => updateField('sex', 'female')}>
              <Text style={[styles.toggleBtnText, profile.sex === 'female' && styles.toggleBtnTextActive]}>Female</Text>
            </TouchableOpacity>
          </View>
        </CollapsibleCard>

        <CollapsibleCard label="Activity Level">
          {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.activityBtn, profile.activityLevel === key && styles.activityBtnActive]}
              onPress={() => updateField('activityLevel', key)}>
              <View style={[styles.activityDot, profile.activityLevel === key && styles.activityDotActive]} />
              <Text style={[styles.activityLabel, profile.activityLevel === key && styles.activityLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </CollapsibleCard>

        {bmr > 0 && (
          <CollapsibleCard label="Your Estimates">
            <Text style={styles.estimateNote}>Based on Mifflin-St Jeor formula -- estimates only, not exact values.</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{bmr}</Text>
                <Text style={styles.statLabel}>BMR</Text>
                <Text style={styles.statSub}>calories at rest</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{tdee}</Text>
                <Text style={styles.statLabel}>TDEE</Text>
                <Text style={styles.statSub}>maintenance</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: '#0d9268' }]}>{suggested}</Text>
                <Text style={styles.statLabel}>Target</Text>
                <Text style={styles.statSub}>{GOAL_LABELS[profile.weightGoal] || 'Goal based'}</Text>
              </View>
            </View>
          </CollapsibleCard>
        )}

        <CollapsibleCard label="Weight Goal">
          {Object.entries(GOAL_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.activityBtn, profile.weightGoal === key && styles.activityBtnActive]}
              onPress={() => updateField('weightGoal', key)}>
              <View style={[styles.activityDot, profile.weightGoal === key && styles.activityDotActive]} />
              <Text style={[styles.activityLabel, profile.weightGoal === key && styles.activityLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </CollapsibleCard>

        <CollapsibleCard label="Water Presets">
          <Text style={styles.estimateNote}>Customize your quick-add water amounts (oz).</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([0, 1, 2] as const).map(i => (
              <View key={i} style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Preset {i + 1}</Text>
                <TextInput
                  style={styles.input}
                  value={String((profile.waterPresets || [12, 16, 22])[i])}
                  onChangeText={v => {
                    const val = parseInt(v) || 0;
                    const updated: [number, number, number] = [...(profile.waterPresets || [12, 16, 22])] as [number, number, number];
                    updated[i] = val;
                    updateField('waterPresets', updated as any);
                  }}
                  keyboardType="number-pad"
                  placeholder="oz"
                  placeholderTextColor="#444"
                />
              </View>
            ))}
          </View>
        </CollapsibleCard>

        <CollapsibleCard label="Daily Calorie Target">
          <Text style={styles.estimateNote}>Set manually or use the recommended value above.</Text>
          {suggested > 0 && (
            <TouchableOpacity style={styles.useRecommended} onPress={() => updateField('calTarget', suggested.toString())}>
              <Text style={styles.useRecommendedText}>Use recommended ({suggested} kcal)</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={profile.calTarget}
            onChangeText={v => updateField('calTarget', v)}
            keyboardType="number-pad"
            placeholder="e.g. 1750"
            placeholderTextColor="#444"
          />
        </CollapsibleCard>

        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnDone, !hasChanges && styles.saveBtnDisabled]}
          onPress={saveProfile}
          disabled={!hasChanges}>
          <Text style={styles.saveBtnText}>{saved ? 'SAVED' : 'SAVE PROFILE'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0f' },
  content: { padding: 16, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  headerLabel: { fontSize: 9, letterSpacing: 2, color: '#666680', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_700Bold' },
  headerTitle: { fontSize: 32, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card: { backgroundColor: '#1a1a24', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.1)', borderTopWidth: 0.5, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#666680', textTransform: 'uppercase', marginBottom: 0, fontFamily: 'DMSans_700Bold' },
  fieldLabel: { fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, color: '#e8e8f0', padding: 10, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 4 },
  heightRow: { flexDirection: 'row', gap: 12 },
  heightField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heightUnit: { color: '#666680', fontSize: 13, fontFamily: 'DMSans_400Regular' },
  weightDisplay: { backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, marginBottom: 4 },
  weightVal: { fontSize: 20, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  weightSub: { fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggleBtn: { flex: 1, padding: 10, backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)' },
  toggleBtnText: { color: '#666680', fontSize: 14, fontFamily: 'DMSans_500Medium' },
  toggleBtnTextActive: { color: '#3b82f6' },
  activityBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, marginBottom: 4 },
  activityBtnActive: { backgroundColor: 'rgba(59,130,246,0.1)' },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2a3a' },
  activityDotActive: { backgroundColor: '#3b82f6' },
  activityLabel: { fontSize: 13, color: '#666680', fontFamily: 'DMSans_400Regular', flex: 1 },
  activityLabelActive: { color: '#e8e8f0' },
  estimateNote: { fontSize: 11, color: '#666680', fontFamily: 'DMSans_400Regular', fontStyle: 'italic', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: '#13131e', borderRadius: 8, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 24, color: '#e8e8f0', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  statLabel: { fontSize: 9, color: '#666680', fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  statSub: { fontSize: 9, color: '#666680', fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 2 },
  useRecommended: { backgroundColor: 'rgba(13,146,104,0.12)', borderWidth: 1, borderColor: 'rgba(13,146,104,0.3)', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 10 },
  useRecommendedText: { color: '#0d9268', fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  saveBtnDone: { backgroundColor: '#0d9268' },
  saveBtnText: { color: '#ffffff', fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  saveBtnDisabled: { backgroundColor: '#13131e', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
});