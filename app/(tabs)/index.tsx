import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import PressableButton from '../../components/PressableButton';
import { loadFromFirebase, saveToFirebase } from '../../firebaseConfig';
import { useHealthKit } from '../../useHealthKit';


const WATER_TARGET = 128;
const IF_METHODS: Record<string, { fast: number; eat: number }> = {
  '12:12': { fast: 12, eat: 12 },
  '14:10': { fast: 14, eat: 10 },
  '16:8': { fast: 16, eat: 8 },
  '18:6': { fast: 18, eat: 6 },
  '20:4': { fast: 20, eat: 4 },
  'Custom': { fast: 16, eat: 8 },
};

const PROGRAM: Record<string, any> = {
  Wed: { focus: 'Push', muscles: 'Chest · Shoulders · Triceps', color: '#3b82f6', type: 'lift' },
  Sat: { focus: 'Pull', muscles: 'Back · Biceps · Rear Delts', color: '#10b981', type: 'lift' },
  Sun: { focus: 'Legs + Core', muscles: 'Quads · Hamstrings · Glutes · Core', color: '#f59e0b', type: 'lift' },
  Mon: { focus: 'Cardio', type: 'cardio' },
  Tue: { focus: 'Cardio', type: 'cardio' },
  Thu: { focus: 'Cardio', type: 'cardio' },
  Fri: { focus: 'Cardio', type: 'cardio' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VERSES = [
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "Do you not know that your body is a temple of the Holy Spirit within you? You are not your own.", reference: "1 Corinthians 6:19" },
  { text: "For God gave us a spirit not of fear but of power and love and self-control.", reference: "2 Timothy 1:7" },
  { text: "Whatever you do, work heartily, as for the Lord and not for men.", reference: "Colossians 3:23" },
  { text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", reference: "Isaiah 40:31" },
  { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness.", reference: "Hebrews 12:11" },
  { text: "So whether you eat or drink or whatever you do, do it all for the glory of God.", reference: "1 Corinthians 10:31" },
  { text: "Train yourself to be godly. For physical training is of some value, but godliness has value for all things.", reference: "1 Timothy 4:7-8" },
  { text: "Commit your work to the Lord, and your plans will be established.", reference: "Proverbs 16:3" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", reference: "Joshua 1:9" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", reference: "Galatians 6:9" },
  { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", reference: "Hebrews 12:1-2" },
  { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", reference: "Psalm 28:7" },
  { text: "Create in me a clean heart, O God, and renew a right spirit within me.", reference: "Psalm 51:10" },
];

function MacroDonut({ protein, carbs, fat, calories }: { protein: number; carbs: number; fat: number; calories: number }) {
  const size = 120;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = protein + carbs + fat;

  if (total === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: '#333333', fontSize: 11, fontFamily: 'DMSans_400Regular' }}>no data</Text>
        </View>
      </View>
    );
  }

  const proteinPct = protein / total;
  const carbsPct = carbs / total;
  const fatPct = fat / total;

  const proteinDash = proteinPct * circumference;
  const carbsDash = carbsPct * circumference;
  const fatDash = fatPct * circumference;

  const proteinOffset = 0;
  const carbsOffset = -(proteinPct * circumference);
  const fatOffset = -((proteinPct + carbsPct) * circumference);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background */}
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#2a2a2a" strokeWidth={strokeWidth} fill="none" />
        {/* Protein - green */}
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#10b981" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${proteinDash} ${circumference}`}
          strokeDashoffset={proteinOffset}
          strokeLinecap="butt"
        />
        {/* Carbs - amber */}
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#f59e0b" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${carbsDash} ${circumference}`}
          strokeDashoffset={carbsOffset}
          strokeLinecap="butt"
        />
        {/* Fat - red */}
        <Circle cx={size/2} cy={size/2} r={radius} stroke="#ef4444" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${fatDash} ${circumference}`}
          strokeDashoffset={fatOffset}
          strokeLinecap="butt"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{calories}</Text>
        <Text style={{ color: '#888888', fontSize: 9, fontFamily: 'DMSans_400Regular' }}>kcal</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  const [ifStart, setIfStart] = useState<number | null>(null);
  const [ifMethod, setIfMethod] = useState<string>('16:8');
  const [ifEnd, setIfEnd] = useState<number | null>(null);
  const [ifCustomHours, setIfCustomHours] = useState<string>('16');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [water, setWater] = useState(0);
  const [weight, setWeight] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [totalCals, setTotalCals] = useState(0);
  const [calTarget, setCalTarget] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const { activeCalories, steps, distance, sleepHours, vo2Max, cardioRecovery } = useHealthKit();
 const [sleepOverride, setSleepOverride] = useState<number | null>(null);
  const [sleepStoredBed, setSleepStoredBed] = useState<string | null>(null);
  const [sleepStoredWake, setSleepStoredWake] = useState<string | null>(null);
  const [editingSleep, setEditingSleep] = useState(false);
  const [sleepBedTime, setSleepBedTime] = useState<Date | null>(null);
  const [sleepWakeTime, setSleepWakeTime] = useState<Date | null>(null);
  const [showBedTimePicker, setShowBedTimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [stepGoal, setStepGoal] = useState(10000);
  const [editingStepGoal, setEditingStepGoal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [pickerTime, setPrickerTime] = useState<Date | null>(null);
  const [dailyVerse, setDailyVerse] = useState<{text: string, reference: string} | null>(null);
  const [totalProtein, setTotalProtein] = useState(0);
const [totalCarbs, setTotalCarbs] = useState(0);
const [totalFat, setTotalFat] = useState(0);
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const hkCalories = activeCalories > 0 ? activeCalories : caloriesBurned;
const adjustedTarget = calTarget + hkCalories;
const displayedBurned = hkCalories;
const calPct = (totalCals / adjustedTarget) * 100;
  const calColor = calPct > 114 ? '#ef4444' : calPct > 106 ? '#f59e0b' : calPct >= 80 ? '#10b981' : calPct >= 63 ? '#f59e0b' : '#ef4444';
  const todayDay = DAY_NAMES[new Date().getDay()];
  const todayProgram = PROGRAM[todayDay];
  const isLift = todayProgram?.type === 'lift';
  const dayColor = isLift ? todayProgram.color : '#888888';
  const windowHours = ifMethod === 'Custom' ? (parseInt(ifCustomHours) || 16) : (IF_METHODS[ifMethod]?.eat || 8);
  const fastHours = ifMethod === 'Custom' ? (24 - (parseInt(ifCustomHours) || 16)) : (IF_METHODS[ifMethod]?.fast || 16);
  const windowEnd = ifStart ? ifStart + windowHours * 3600000 : null;
  const remaining = windowEnd && !ifEnd ? windowEnd - currentTime : null;
  const isOpen = remaining !== null && remaining > 0;
  const ifActualMs = ifEnd && ifStart ? ifEnd - ifStart : null;
  const ifTargetMs = windowHours * 3600000;
  const ifOverUnderMs = ifEnd && windowEnd ? ifEnd - windowEnd : null;
 const ifResultColor = ifOverUnderMs === null ? '#888888' : ifOverUnderMs <= 5 * 60000 ? '#10b981' : ifOverUnderMs <= 45 * 60000 ? '#f59e0b' : '#ef4444';
  const ifResultLabel = ifOverUnderMs === null ? '' : ifOverUnderMs <= 5 * 60000 ? `COMPLETE` : ifOverUnderMs <= 45 * 60000 ? `MISSED BY ${Math.round(ifOverUnderMs / 60000)}M` : `FAILED`;
  const formatHrMin = (ms: number) => {
    const h = Math.floor(Math.abs(ms) / 3600000);
    const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
    return `${h}:${String(m).padStart(2, '0')} hrs`;
  };


  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.water) setWater(data.water);
          if (data.weight) setWeight(data.weight);
          if (data.ifStart) setIfStart(data.ifStart);
          if (data.ifMethod) setIfMethod(data.ifMethod);
          if (data.ifEnd) setIfEnd(data.ifEnd);
          if (data.ifCustomHours) setIfCustomHours(data.ifCustomHours);
          if (data.dailyNote) setDailyNote(data.dailyNote);
        } else {
          const cloudData = await loadFromFirebase(todayKey);
          if (cloudData) {
            if (cloudData.water) setWater(cloudData.water);
            if (cloudData.weight) setWeight(cloudData.weight);
            if (cloudData.ifStart) setIfStart(cloudData.ifStart);
            if (cloudData.dailyNote) setDailyNote(cloudData.dailyNote);
            await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify(cloudData));
          }
        }
      } catch (e) {
        console.log('Load error', e);
      } finally {
        setLoaded(true);
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        setDailyVerse(VERSES[dayOfYear % VERSES.length]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try {
        const existing = await AsyncStorage.getItem(`pj_${todayKey}`);
        const current = existing ? JSON.parse(existing) : {};
        await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({
          ...current, water, weight, ifStart, ifMethod, ifEnd, ifCustomHours, dailyNote,
        }));
      } catch (e) {
        console.log('Save error', e);
      }
    };
    save();
  }, [water, weight, ifStart, dailyNote, loaded]);

  useFocusEffect(
    useCallback(() => {
      const loadCals = async () => {
        try {
          const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
          if (saved) {
            const data = JSON.parse(saved);
            if (data.entries && Array.isArray(data.entries)) {
  const total = data.entries.reduce((s: number, e: any) => s + e.cal, 0);
const protein = data.entries.reduce((s: number, e: any) => s + (e.protein || 0), 0);
const carbs = data.entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0);
const fat = data.entries.reduce((s: number, e: any) => s + (e.fat || 0), 0);
setTotalCals(total);
setTotalProtein(Math.round(protein * 10) / 10);
setTotalCarbs(Math.round(carbs * 10) / 10);
setTotalFat(Math.round(fat * 10) / 10);
}
setCaloriesBurned(parseInt(data.caloriesBurned) || 0);
if (data.sleepOverride) setSleepOverride(data.sleepOverride);
if (data.sleepBedTime) setSleepStoredBed(data.sleepBedTime);
if (data.sleepWakeTime) setSleepStoredWake(data.sleepWakeTime);
if (typeof data.water === 'number') setWater(data.water);
}
const profileData = await AsyncStorage.getItem('pj_profile');
if (profileData) {
  const p = JSON.parse(profileData);
  const GOAL_DEFICITS: Record<string, number> = {
    lose_2: -1000, lose_1_5: -750, lose_1: -500, lose_0_5: -250,
    maintain: 0, gain_0_5: 250, gain_1: 500,
  };
  if (p.stepGoal && parseInt(p.stepGoal) > 0) setStepGoal(parseInt(p.stepGoal));
          if (p.calTarget && parseInt(p.calTarget) > 0) {
            setCalTarget(parseInt(p.calTarget));
  } else if (p.activityLevel && p.weightGoal) {
    const ACTIVITY_MULTIPLIERS: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };
    const today2 = new Date();
    const weightKey = `${today2.getFullYear()}-${String(today2.getMonth() + 1).padStart(2, '0')}-${String(today2.getDate()).padStart(2, '0')}`;
    const dayData = await AsyncStorage.getItem(`pj_${weightKey}`);
    const weight = dayData ? JSON.parse(dayData)?.weight : null;
    if (weight && p.birthday && p.heightFt && p.heightIn) {
      const weightKg = weight * 0.453592;
      const heightCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
      const age = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
      const bmr = p.sex === 'male'
        ? Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5)
        : Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161);
      const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[p.activityLevel] || 1.55));
      const deficit = GOAL_DEFICITS[p.weightGoal] ?? -500;
      setCalTarget(tdee + deficit);
    }
  }
}
} catch (e) {
  console.log('Cal sync error', e);
}
};
loadCals();
}, [])
);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const logWeight = () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    setWeight(val);
    setWeightInput('');
    saveToFirebase(todayKey, 'weight', val);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + .5 }]}>

      <View style={styles.header}>
  <Text style={styles.headerLabel}>PROJECT J</Text>
  <Text style={styles.headerTitle}>
    {(() => {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning, Justin';
      if (h < 17) return 'Good afternoon, Justin';
      return 'Good evening, Justin';
    })()}
  </Text>
  <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular', marginTop: 2 }}>
    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
  </Text>
  <TouchableOpacity
    onPress={() => router.push({ pathname: '/day-detail', params: { date: todayKey } })}
    style={{ position: 'absolute', right: 0, bottom: 16, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
    <Text style={{ color: '#3b82f6', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>📅 History</Text>
  </TouchableOpacity>
</View>

      {dailyVerse && (
        <View style={styles.verseCard}>
          <Text style={styles.verseLabel}>TODAY'S VERSE</Text>
          <Text style={styles.verseText}>"{dailyVerse.text}"</Text>
          <Text style={styles.verseRef}>{dailyVerse.reference}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Intermittent Fast · {ifMethod}</Text>
          {ifStart && (
            <View style={{ backgroundColor: ifEnd ? `${ifResultColor}22` : isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: ifEnd ? `${ifResultColor}55` : isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: ifEnd ? ifResultColor : isOpen ? '#10b981' : '#ef4444' }}>
                {ifEnd ? ifResultLabel : isOpen ? 'OPEN' : 'CLOSED'}
              </Text>
            </View>
          )}
        </View>

        {/* Method selector */}
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
          {Object.keys(IF_METHODS).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => { setIfMethod(m); saveToFirebase(todayKey, 'ifMethod', m); }}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: ifMethod === m ? 'rgba(59,130,246,0.2)' : '#1e1e1e', borderWidth: 1, borderColor: ifMethod === m ? 'rgba(59,130,246,0.5)' : '#2a2a2a' }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: ifMethod === m ? '#3b82f6' : '#888888' }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom hours input */}
        {ifMethod === 'Custom' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#888888', fontFamily: 'DMSans_400Regular' }}>Eating window:</Text>
            <TextInput
              style={{ backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, color: '#ffffff', padding: 6, fontSize: 14, fontFamily: 'DMSans_600SemiBold', width: 50, textAlign: 'center' }}
              value={ifCustomHours}
              onChangeText={v => setIfCustomHours(v)}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={{ fontSize: 12, color: '#888888', fontFamily: 'DMSans_400Regular' }}>hrs</Text>
          </View>
        )}

        {!ifStart ? (
          <PressableButton style={styles.ifStartBtn} onPress={() => { setIfStart(Date.now()); setIfEnd(null); }} flex={0}>
            <Text style={styles.ifStartBtnText}>TAP WHEN YOU EAT YOUR FIRST MEAL</Text>
          </PressableButton>
        ) : ifEnd ? (
          <View>
            {/* Result card */}
            <View style={{ backgroundColor: `${ifResultColor}11`, borderWidth: 1, borderColor: `${ifResultColor}33`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular' }}>Target</Text>
                <Text style={{ fontSize: 13, color: ifResultColor, fontFamily: 'DMSans_600SemiBold' }}>{formatHrMin(ifTargetMs)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular' }}>Actual</Text>
                <Text style={{ fontSize: 13, color: '#ffffff', fontFamily: 'DMSans_600SemiBold' }}>{ifActualMs ? formatHrMin(ifActualMs) : '--'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular' }}>Window</Text>
                <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular' }}>
                  {new Date(ifStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} → {new Date(ifEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                <Text style={styles.ifReset}>Edit start</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                <Text style={styles.ifReset}>Edit end</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey, 'ifStart', null); saveToFirebase(todayKey, 'ifEnd', null); }}>
                <Text style={[styles.ifReset, { color: '#ef4444' }]}>Reset</Text>
              </TouchableOpacity>
            </View>
            {showEndTimePicker && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                    <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setShowEndTimePicker(false);
                    if (pickerTime) {
                      const now = new Date();
                      pickerTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                      const newEnd = pickerTime.getTime();
                      setIfEnd(newEnd);
                      saveToFirebase(todayKey, 'ifEnd', newEnd);
                    }
                  }}>
                    <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="time"
                  value={pickerTime || (ifEnd ? new Date(ifEnd) : new Date())}
                  display="spinner"
                  textColor="#ffffff"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setPrickerTime(selectedDate);
                  }}
                />
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.ifRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ifLabel, { marginBottom: 4 }]}>{isOpen ? 'Window closes in' : 'Window closed'}</Text>
                <Text style={[styles.ifCountdown, { fontSize: 48, lineHeight: 52 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {remaining ? formatTime(remaining) : 'CLOSED'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end', paddingLeft: 12 }}>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 9, color: '#999999', fontFamily: 'DMSans_500Medium', letterSpacing: 1, textTransform: 'uppercase' }}>Started</Text>
                    <Text style={{ fontSize: 16, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                      {new Date(ifStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {windowEnd && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9, color: '#999999', fontFamily: 'DMSans_500Medium', letterSpacing: 1, textTransform: 'uppercase' }}>Closes</Text>
                      <Text style={{ fontSize: 16, color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                        {new Date(windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => { const end = Date.now(); setIfEnd(end); saveToFirebase(todayKey, 'ifEnd', end); }}
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: '#ef4444', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Last Meal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                <Text style={styles.ifReset}>Reset window</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIfStart(null); setIfEnd(null); saveToFirebase(todayKey, 'ifStart', null); }}>
                <Text style={[styles.ifReset, { color: '#ef4444' }]}>Cancel fast</Text>
              </TouchableOpacity>
            </View>
            {showTimePicker && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setShowTimePicker(false);
                    if (pickerTime) {
                      const now = new Date();
                      pickerTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                      setIfStart(pickerTime.getTime());
                      saveToFirebase(todayKey, 'ifStart', pickerTime.getTime());
                    }
                  }}>
                    <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="time"
                  value={pickerTime || (ifStart ? new Date(ifStart) : new Date())}
                  display="spinner"
                  textColor="#ffffff"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setPrickerTime(selectedDate);
                  }}
                />
              </View>
            )}
            {showEndTimePicker && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={{ color: '#666666', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setShowTimePicker(false);
                    if (pickerTime) {
                      const now = new Date();
                      pickerTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                      setIfStart(pickerTime.getTime());
                      saveToFirebase(todayKey, 'ifStart', pickerTime.getTime());
                    }
                  }}>
                    <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="time"
                  value={pickerTime || (ifStart ? new Date(ifStart) : new Date())}
                  display="spinner"
                  textColor="#ffffff"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setPrickerTime(selectedDate);
                  }}
                />
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.cardLabel}>Calories Today</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/log')}
            activeOpacity={0.6}
            style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>+ Log</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calRow}>
          <Text style={[styles.calNumber, { color: calColor }]}>{totalCals}</Text>
          <Text style={styles.calTarget}>/ {adjustedTarget} kcal</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${calPct}%`, backgroundColor: calColor }]} />
        </View>
        <Text style={styles.calRemaining}>
          {(() => {
const adjustedTarget = calTarget + caloriesBurned;
const diff = adjustedTarget - totalCals;
return diff > 0 ? `${diff} kcal remaining (${displayedBurned} burned)` : `${Math.abs(diff)} kcal over target (${displayedBurned} burned)`;
})()}
        </Text>
      </View>

      {/* Macros Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Macros Today</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} calories={totalCals} />
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' }} />
              <Text style={{ color: '#888888', fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Protein</Text>
              <Text style={{ color: '#10b981', fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalProtein}g</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b' }} />
              <Text style={{ color: '#888888', fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Carbs</Text>
              <Text style={{ color: '#f59e0b', fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalCarbs}g</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
              <Text style={{ color: '#888888', fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>Fat</Text>
              <Text style={{ color: '#ef4444', fontSize: 16, fontFamily: 'BebasNeue_400Regular' }}>{totalFat}g</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Water · {water}oz / {WATER_TARGET}oz</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, (water / WATER_TARGET) * 100)}%`, backgroundColor: '#3b82f6' }]} />
        </View>
        <View style={styles.waterBtns}>
          <PressableButton style={styles.waterBtn} onPress={() => { const n = Math.min(WATER_TARGET, water + 12); setWater(n); saveToFirebase(todayKey, 'water', n); }}>
            <Text style={styles.waterBtnText}>+12 oz</Text>
          </PressableButton>
          <PressableButton style={styles.waterBtn} onPress={() => { const n = Math.min(WATER_TARGET, water + 16); setWater(n); saveToFirebase(todayKey, 'water', n); }}>
            <Text style={styles.waterBtnText}>+16 oz</Text>
          </PressableButton>
          <PressableButton style={styles.waterBtn} onPress={() => { const n = Math.min(WATER_TARGET, water + 22); setWater(n); saveToFirebase(todayKey, 'water', n); }}>
            <Text style={styles.waterBtnText}>+22 oz</Text>
          </PressableButton>
        </View>
        <View style={[styles.waterBtns, { marginTop: 8 }]}>
          <PressableButton style={styles.waterBtnRed} onPress={() => { const n = Math.max(0, water - 12); setWater(n); saveToFirebase(todayKey, 'water', n); }}>
            <Text style={styles.waterBtnRedText}>-12 oz</Text>
          </PressableButton>
          <PressableButton style={styles.waterBtnRed} onPress={() => { const n = Math.max(0, water - 16); setWater(n); saveToFirebase(todayKey, 'water', n); }}>
            <Text style={styles.waterBtnRedText}>-16 oz</Text>
          </PressableButton>
          <PressableButton style={styles.waterBtnRed} onPress={() => { const n = Math.max(0, water - 22); setWater(n); saveToFirebase(todayKey, 'water', n); }}>
            <Text style={styles.waterBtnRedText}>-22 oz</Text>
          </PressableButton>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Weight</Text>
        <View style={styles.weightRow}>
          <View style={styles.weightStat}>
            <Text style={styles.weightVal}>{weight ? `${weight} lbs` : '--'}</Text>
            <Text style={styles.weightLbl}>Today</Text>
          </View>
          <View style={styles.weightStat}>
            <Text style={styles.weightVal}>--</Text>
            <Text style={styles.weightLbl}>vs Yesterday</Text>
          </View>
          <View style={styles.weightStat}>
            <Text style={[styles.weightVal, { color: '#10b981' }]}>--</Text>
            <Text style={styles.weightLbl}>Total Lost</Text>
          </View>
        </View>
        <View style={styles.weightAdd}>
          <TextInput
            style={styles.weightInput}
            placeholder="Enter weight (lbs)"
            placeholderTextColor="#555555"
            keyboardType="decimal-pad"
            value={weightInput}
            onChangeText={setWeightInput}
          />
          <PressableButton style={styles.logBtn} onPress={logWeight}>
            <Text style={styles.logBtnText}>LOG</Text>
          </PressableButton>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today's Workout</Text>
        <View style={styles.workoutRow}>
          <View>
            <Text style={styles.workoutDay}>{todayDay} — {todayProgram?.focus || 'Rest'}</Text>
            <Text style={styles.workoutMuscles}>
              {isLift ? todayProgram.muscles : '60 min · 3.5mph · 5-6% incline'}
            </Text>
          </View>
          <View style={[styles.workoutPill, { backgroundColor: dayColor + '22', borderColor: dayColor + '44' }]}>
            <Text style={[styles.workoutPillText, { color: dayColor }]}>
              {todayProgram?.type?.toUpperCase() || 'REST'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Steps Today</Text>
          <TouchableOpacity
            onPress={() => setEditingStepGoal(true)}
            style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#3b82f6', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Goal: {stepGoal.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
        {editingStepGoal && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TextInput
              style={{ flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, color: '#ffffff', padding: 8, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
              value={String(stepGoal)}
              onChangeText={v => setStepGoal(parseInt(v) || 0)}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity
              onPress={async () => {
                setEditingStepGoal(false);
                const saved = await AsyncStorage.getItem('pj_profile');
                const p = saved ? JSON.parse(saved) : {};
                await AsyncStorage.setItem('pj_profile', JSON.stringify({ ...p, stepGoal: String(stepGoal) }));
                await saveToFirebase('profile', 'data', { ...p, stepGoal: String(stepGoal) });
              }}
              style={{ backgroundColor: '#10b981', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: '#000000', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
        {(() => {
          const pct = stepGoal > 0 ? steps / stepGoal : 0;
          const stepColor = pct >= 1 ? '#10b981' : pct >= 0.7 ? '#f59e0b' : '#ef4444';
          return (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 36, color: stepColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{steps.toLocaleString()}</Text>
                <Text style={{ fontSize: 13, color: '#888888', fontFamily: 'DMSans_400Regular' }}>/ {stepGoal.toLocaleString()} steps</Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#1e1e1e', borderRadius: 2, marginBottom: 8 }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: stepColor, width: `${Math.min(pct * 100, 100)}%` }} />
              </View>
              <Text style={{ fontSize: 11, color: '#888888', fontFamily: 'DMSans_400Regular' }}>{distance} mi walked today</Text>
            </>
          );
        })()}
      </View>

      {/* Sleep Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Sleep Last Night</Text>
          <TouchableOpacity
            onPress={() => { setEditingSleep(!editingSleep); }}
            style={{ backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#3b82f6', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>{sleepOverride ? 'Edited' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        {editingSleep && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setShowBedTimePicker(true)}
                style={{ flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular', marginBottom: 2 }}>Bed Time</Text>
                <Text style={{ fontSize: 16, color: sleepBedTime ? '#ffffff' : '#444444', fontFamily: 'DMSans_600SemiBold' }}>
                  {sleepBedTime ? sleepBedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowWakeTimePicker(true)}
                style={{ flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular', marginBottom: 2 }}>Wake Time</Text>
                <Text style={{ fontSize: 16, color: sleepWakeTime ? '#ffffff' : '#444444', fontFamily: 'DMSans_600SemiBold' }}>
                  {sleepWakeTime ? sleepWakeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
            </View>
            {sleepBedTime && sleepWakeTime && (
              <Text style={{ fontSize: 12, color: '#888888', fontFamily: 'DMSans_400Regular', textAlign: 'center', marginBottom: 8 }}>
                {(() => {
                  let diff = sleepWakeTime.getTime() - sleepBedTime.getTime();
                  if (diff < 0) diff += 24 * 3600000;
                  return `${Math.round(diff / 3600000 * 10) / 10} hrs of sleep`;
                })()}
              </Text>
            )}
            {showBedTimePicker && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setShowBedTimePicker(false)}>
                    <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowBedTimePicker(false)}>
                    <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker mode="time" value={sleepBedTime || new Date()} display="spinner" textColor="#ffffff"
                  onChange={(_, d) => { if (d) setSleepBedTime(d); }} />
              </View>
            )}
            {showWakeTimePicker && (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setShowWakeTimePicker(false)}>
                    <Text style={{ color: '#999999', fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowWakeTimePicker(false)}>
                    <Text style={{ color: '#10b981', fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker mode="time" value={sleepWakeTime || new Date()} display="spinner" textColor="#ffffff"
                  onChange={(_, d) => { if (d) setSleepWakeTime(d); }} />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  if (!sleepBedTime || !sleepWakeTime) return;
                  let diff = sleepWakeTime.getTime() - sleepBedTime.getTime();
                  if (diff < 0) diff += 24 * 3600000;
                  const val = Math.round(diff / 3600000 * 10) / 10;
                  setSleepOverride(val);
                  const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
                  const current = saved ? JSON.parse(saved) : {};
                  const bedStr = sleepBedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const wakeStr = sleepWakeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify({ ...current, sleepOverride: val, sleepBedTime: bedStr, sleepWakeTime: wakeStr }));
                  await saveToFirebase(todayKey, 'sleepOverride', val);
                  setSleepStoredBed(bedStr);
                  setSleepStoredWake(wakeStr);
                  setEditingSleep(false);
                }}
                style={{ flex: 1, backgroundColor: '#10b981', borderRadius: 6, padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#000000', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Save</Text>
              </TouchableOpacity>
              {sleepOverride && (
                <TouchableOpacity
                  onPress={async () => {
                    setSleepOverride(null);
                    const saved = await AsyncStorage.getItem(`pj_${todayKey}`);
                    const current = saved ? JSON.parse(saved) : {};
                    delete current.sleepOverride;
                    await AsyncStorage.setItem(`pj_${todayKey}`, JSON.stringify(current));
                    setEditingSleep(false);
                  }}
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 6, paddingHorizontal: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#ef4444', fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {(() => {
          const displaySleep = sleepOverride ?? sleepHours;
          if (displaySleep === null) return (
            <Text style={{ fontSize: 13, color: '#444444', fontFamily: 'DMSans_400Regular', fontStyle: 'italic' }}>No sleep data for last night</Text>
          );
          const sleepColor = displaySleep >= 7 ? '#10b981' : displaySleep >= 6 ? '#f59e0b' : '#ef4444';
          const sleepLabel = displaySleep >= 7 ? 'Well rested' : displaySleep >= 6 ? 'Could be better' : 'Need more sleep';
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 42, color: sleepColor, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
                  {displaySleep} <Text style={{ fontSize: 16, color: '#888888' }}>hrs</Text>
                </Text>
                <Text style={{ fontSize: 11, color: sleepColor, fontFamily: 'DMSans_500Medium' }}>
                  {sleepLabel}{sleepOverride ? ' (manual)' : ''}
                </Text>
                {sleepStoredBed && sleepStoredWake && (
                  <Text style={{ fontSize: 13, color: '#ffffff', fontFamily: 'DMSans_600SemiBold', marginTop: 6 }}>
                    {sleepStoredBed} → {sleepStoredWake}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[...Array(8)].map((_, i) => (
                    <View key={i} style={{ width: 8, height: 24, borderRadius: 2, backgroundColor: i < Math.floor(displaySleep) ? sleepColor : i < displaySleep ? sleepColor + '66' : '#1e1e1e' }} />
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_400Regular' }}>Goal: 8 hrs</Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* Fitness Metrics Card */}
      {(vo2Max !== null || cardioRecovery !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Fitness Metrics</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {vo2Max !== null && (
              <View style={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, color: '#3b82f6', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{vo2Max}</Text>
                <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_500Medium', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>VO2 Max</Text>
                <Text style={{ fontSize: 9, color: '#555555', fontFamily: 'DMSans_400Regular', marginTop: 2 }}>ml/kg/min</Text>
              </View>
            )}
            {cardioRecovery !== null && (
              <View style={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, color: '#10b981', fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{cardioRecovery}</Text>
                <Text style={{ fontSize: 10, color: '#888888', fontFamily: 'DMSans_500Medium', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Cardio Recovery</Text>
                <Text style={{ fontSize: 9, color: '#555555', fontFamily: 'DMSans_400Regular', marginTop: 2 }}>bpm drop / 1min</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily Note</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How did today go? Workout, diet, energy..."
          placeholderTextColor="#333333"
          multiline
          numberOfLines={4}
          value={dailyNote}
          onChangeText={setDailyNote}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={() => {}}>
          <Text style={styles.saveBtnText}>Save Note</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 16, paddingBottom: 80 },
  header: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#222222', marginBottom: 16 },
  headerLabel: { fontSize: 10, letterSpacing: 4, color: '#999999', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#ffffff', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  card: { backgroundColor: '#161616', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 9, letterSpacing: 3, color: '#999999', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_500Medium' },
  ifStartBtn: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 6, padding: 14, alignItems: 'center' },
  ifStartBtnText: { color: '#10b981', fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, fontSize: 16 },
  ifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ifLabel: { fontSize: 11, letterSpacing: 2, color: '#999999', textTransform: 'uppercase', fontFamily: 'DMSans_500Medium' },
  ifCountdown: { fontSize: 48, color: '#ffffff', lineHeight: 52, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  ifSub: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular' },
  ifBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  ifBadgeOpen: { backgroundColor: 'rgba(16,185,129,0.15)' },
  ifBadgeClosed: { backgroundColor: 'rgba(239,68,68,0.15)' },
  ifBadgeText: { fontSize: 10, letterSpacing: 2, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  ifReset: { color: '#999999', fontSize: 11, textDecorationLine: 'underline', marginTop: 8, fontFamily: 'DMSans_400Regular' },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  calNumber: { fontSize: 52, lineHeight: 56, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  calTarget: { fontSize: 14, color: '#999999', fontFamily: 'DMSans_400Regular' },
  progressBarBg: { height: 6, backgroundColor: '#2a2a2a', borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', borderRadius: 6 },
  calRemaining: { fontSize: 12, color: '#999999', fontFamily: 'DMSans_400Regular' },
  waterBtns: { flexDirection: 'row', gap: 8 },
  waterBtn: { flex: 1, padding: 10, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', borderRadius: 6, alignItems: 'center' },
  waterBtnText: { color: '#3b82f6', fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
  waterBtnRed: { flex: 1, padding: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', borderRadius: 6, alignItems: 'center' },
  waterBtnRedText: { color: '#ef4444', fontFamily: 'BebasNeue_400Regular', fontSize: 15, letterSpacing: 1 },
  weightRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  weightStat: { flex: 1 },
  weightVal: { fontSize: 28, color: '#ffffff', lineHeight: 32, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  weightLbl: { fontSize: 10, color: '#999999', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2, fontFamily: 'DMSans_500Medium' },
  weightAdd: { flexDirection: 'row', gap: 8 },
  weightInput: { flex: 1, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, color: '#ffffff', padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  logBtn: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 6, paddingHorizontal: 16, justifyContent: 'center' },
  logBtnText: { color: '#3b82f6', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
  workoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workoutDay: { fontSize: 22, color: '#ffffff', letterSpacing: 1, fontFamily: 'BebasNeue_400Regular' },
  workoutMuscles: { fontSize: 12, color: '#999999', marginTop: 2, fontFamily: 'DMSans_400Regular' },
  workoutPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  workoutPillText: { fontSize: 10, letterSpacing: 2, fontFamily: 'DMSans_600SemiBold' },
  notesInput: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 6, color: '#ffffff', padding: 10, fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginTop: 8, fontFamily: 'DMSans_400Regular' },
  saveBtn: { marginTop: 8, padding: 10, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#3a3a3a', borderRadius: 6, alignItems: 'center' },
  saveBtnText: { color: '#cccccc', fontSize: 12, fontFamily: 'DMSans_500Medium' },
  verseCard: { backgroundColor: '#0f1a14', borderWidth: 1, borderColor: '#1a3a25', borderRadius: 10, padding: 16, marginBottom: 12 },
  verseLabel: { fontSize: 9, letterSpacing: 3, color: '#4a9e6a', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'DMSans_500Medium' },
  verseText: { fontSize: 15, color: '#d4e8db', fontStyle: 'italic', lineHeight: 22, marginBottom: 8, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
  verseRef: { fontSize: 12, color: '#4a9e6a', fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
});