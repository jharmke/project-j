import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { CardWash } from '../components/GradientCard';
import { storageSet } from '../utils/storage';
import { DEFAULT_MEAL_SLOTS, MealSlot, findSlotForMeal, loadMealSlots, getMealDisplayName } from '../utils/mealSlots';
import { calcSleepScore } from '../utils/sleepScore';

type SleepStages = { core: number; deep: number; rem: number; totalMs: number };

function fmtTime(val: string | null | undefined): string {
  if (!val) return '--';
  return val;
}

function fmtMs(ms: number): string {
  if (!ms) return '--';
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type JournalCategory = 'verse' | 'prayer' | 'study' | 'personal' | 'gratitude' | 'fitness';
interface JournalEntry { id: string; date: string; category: JournalCategory; title: string; notes: string; }
const CAT_META: Record<JournalCategory, { label: string; icon: string; color: string }> = {
  verse:     { label: 'Verse',     icon: 'book',       color: '#d4860a' },
  prayer:    { label: 'Prayer',    icon: 'hand-left',  color: '#8b5cf6' },
  study:     { label: 'Study',     icon: 'school',     color: '#3b82f6' },
  personal:  { label: 'Personal',  icon: 'person',     color: '#10b981' },
  gratitude: { label: 'Gratitude', icon: 'heart',      color: '#ec4899' },
  fitness:   { label: 'Fitness',   icon: 'barbell',    color: '#06b6d4' },
};

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bgSheet, paddingTop: insets.top }}>
      <DayDetailContent date={date ?? ''} onClose={() => router.back()} />
    </View>
  );
}

export function DayDetailContent({ date, onClose, todayBurned }: { date: string; onClose: () => void; todayBurned?: number }) {
  const { theme, themeId } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [excluded, setExcluded] = useState({ diet: false, water: false, exercise: false });
  const [workoutState, setWorkoutState] = useState<any>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(date);
  const [mealsOpen, setMealsOpen] = useState(true);
  const [workoutOpen, setWorkoutOpen] = useState(true);
  const [sleepOpen, setSleepOpen] = useState(true);
  const [advNutritionOpen, setAdvNutritionOpen] = useState(false);
  const [profileBmr, setProfileBmr] = useState(0);
  const [sleepGoal, setSleepGoal] = useState(7);
  const [burnAccuracyPct, setBurnAccuracyPct] = useState(100);
  const [showNetCarbs, setShowNetCarbs] = useState(false);
  const [workoutTags, setWorkoutTags] = useState<any[]>([]);
  const [calPickerVisible, setCalPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(0);
  const [pickerMonth, setPickerMonth] = useState(0);
  const [mealSlots, setMealSlots] = useState<MealSlot[]>(DEFAULT_MEAL_SLOTS);
  const [slotNameCache, setSlotNameCache] = useState<Record<string, string>>({});
  const calFadeAnim = useRef(new Animated.Value(0)).current;

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = currentDate === todayKey;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    loadMealSlots().then(({ mealSlots: slots, slotNameCache: cache }) => {
      setMealSlots(slots);
      setSlotNameCache(cache);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(`pj_${currentDate}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setExcluded(parsed.excluded ?? { diet: false, water: false, exercise: false });
        } else {
          setData({});
          setExcluded({ diet: false, water: false, exercise: false });
        }
        const ws = await AsyncStorage.getItem('pj_workout_state');
        if (ws) setWorkoutState(JSON.parse(ws));
        const jRaw = await AsyncStorage.getItem('pj_bible_reflections');
        if (jRaw) {
          const all: any[] = JSON.parse(jRaw);
          setJournalEntries(all.filter(e => e.date === currentDate && e.category));
        } else {
          setJournalEntries([]);
        }
        const settingsRaw = await AsyncStorage.getItem('pj_settings');
        if (settingsRaw) {
          const sd = JSON.parse(settingsRaw);
          if (sd.burnAccuracyPct !== undefined) setBurnAccuracyPct(sd.burnAccuracyPct);
          if (sd.workoutTags && Array.isArray(sd.workoutTags)) setWorkoutTags(sd.workoutTags);
          if (sd.showNetCarbs !== undefined) setShowNetCarbs(sd.showNetCarbs);
        }
        const profileRaw = await AsyncStorage.getItem('pj_profile');
        if (profileRaw) {
          const p = JSON.parse(profileRaw);
          if (p.sleepGoal) setSleepGoal(parseFloat(p.sleepGoal));
          let w: number | null = null;
          const dayRaw = await AsyncStorage.getItem(`pj_${currentDate}`);
          if (dayRaw) { const dp = JSON.parse(dayRaw); if (dp.weight) w = dp.weight; }
          if (!w) {
            for (let i = 1; i <= 30; i++) {
              const d = new Date(currentDate + 'T12:00:00'); d.setDate(d.getDate() - i);
              const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const ld = await AsyncStorage.getItem(`pj_${dk}`);
              if (ld) { const ldp = JSON.parse(ld); if (ldp.weight) { w = ldp.weight; break; } }
            }
          }
          if (w && p.birthday && p.heightFt && p.heightIn) {
            const wKg = w * 0.453592;
            const hCm = (parseFloat(p.heightFt) * 30.48) + (parseFloat(p.heightIn) * 2.54);
            const bparts = String(p.birthday).split('-');
            const age = Math.floor((Date.now() - new Date(parseInt(bparts[0]), parseInt(bparts[1]) - 1, parseInt(bparts[2])).getTime()) / (365.25 * 24 * 3600 * 1000));
            const bmr = p.sex === 'male' ? Math.round((10*wKg)+(6.25*hCm)-(5*age)+5) : Math.round((10*wKg)+(6.25*hCm)-(5*age)-161);
            setProfileBmr(bmr);
          }
        }
      } catch { setData({}); } finally { setLoaded(true); }
    };
    load();
  }, [currentDate]);

  const toggleExclude = async (key: 'diet' | 'water' | 'exercise') => {
    const updated = { ...excluded, [key]: !excluded[key] };
    setExcluded(updated);
    try {
      const saved = await AsyncStorage.getItem(`pj_${currentDate}`);
      const current = saved ? JSON.parse(saved) : {};
      await storageSet(`pj_${currentDate}`, JSON.stringify({ ...current, excluded: updated }));
    } catch {}
  };

  if (!loaded) return null;

  const entries = data?.entries || [];
  const totalCals = entries.reduce((s: number, e: any) => s + e.cal, 0);
  const totalProtein = Math.round(entries.reduce((s: number, e: any) => s + (e.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(entries.reduce((s: number, e: any) => s + (e.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(entries.reduce((s: number, e: any) => s + (e.fat || 0), 0) * 10) / 10;
  const water = data?.water || 0;
  const weight = data?.weight ?? null;
  const steps = data?.steps || 0;
  const caloriesBurned = isToday && todayBurned != null ? todayBurned : Math.round((data?.activeCalories || data?.caloriesBurned || 0) * burnAccuracyPct / 100);
  const now = new Date();
  const minutesToday = now.getHours() * 60 + now.getMinutes();
  const runningBmr = isToday && profileBmr > 0 ? Math.round((profileBmr / 1440) * minutesToday) : profileBmr;
  const netcals = totalCals - caloriesBurned - runningBmr;

  const getEntryNutrient = (name: string, round = 10) => Math.round(entries.reduce((s: number, e: any) => {
    const n = e.foodNutrients?.find((fn: any) => fn.nutrientName === name);
    if (!n) return s;
    const scale = e.fsId
      ? ((e.calPer100g && e.calPer100g > 0) ? (e.cal / e.calPer100g) : 0)
      : (() => { const sc = e.servingGrams && (e.calPer100g ?? 0) > 0 ? (e.calPer100g ?? 0) * e.servingGrams / 100 : 0; return sc > 0 ? e.cal / sc : 0; })();
    return s + (n.value || 0) * scale;
  }, 0) * round) / round;
  const totalFiber          = getEntryNutrient('Fiber, total dietary');
  const totalSodium         = Math.round(getEntryNutrient('Sodium, Na', 1));
  const totalSugar          = getEntryNutrient('Sugars, total including NLEA');
  const totalCholesterol    = Math.round(getEntryNutrient('Cholesterol', 1));
  const totalSatFat         = getEntryNutrient('Fatty acids, total saturated');
  const totalPolyFat        = getEntryNutrient('Polyunsaturated Fat');
  const totalMonoFat        = getEntryNutrient('Monounsaturated Fat');
  const totalPotassium      = Math.round(getEntryNutrient('Potassium, K', 1));
  const totalVitaminA       = Math.round(getEntryNutrient('Vitamin A', 1));
  const totalVitaminC       = Math.round(getEntryNutrient('Vitamin C', 1));
  const totalCalcium        = Math.round(getEntryNutrient('Calcium, Ca', 1));
  const totalIron           = getEntryNutrient('Iron, Fe');
  const totalSugarAlcohols  = getEntryNutrient('Sugar Alcohols');
  const totalNetCarbs = Math.max(0, Math.round((totalCarbs - totalFiber - totalSugarAlcohols) * 10) / 10);
  const totalAddedSugars   = getEntryNutrient('Added Sugars');
  const totalTransFat      = getEntryNutrient('Trans Fat');
  const totalVitaminD      = getEntryNutrient('Vitamin D');
  const totalVitaminE      = getEntryNutrient('Vitamin E');
  const totalVitaminK      = Math.round(getEntryNutrient('Vitamin K', 1));
  const totalVitaminB6     = getEntryNutrient('Vitamin B6');
  const totalFolate        = Math.round(getEntryNutrient('Folate', 1));
  const totalVitaminB12    = getEntryNutrient('Vitamin B12');
  const totalBiotin        = Math.round(getEntryNutrient('Biotin', 1));
  const totalMagnesium     = Math.round(getEntryNutrient('Magnesium, Mg', 1));
  const totalZinc          = getEntryNutrient('Zinc, Zn');
  const totalCopper        = getEntryNutrient('Copper, Cu');
  const totalCaffeine      = Math.round(getEntryNutrient('Caffeine', 1));

  const sleepHours: number = data?.sleepOverride ?? data?.sleepHours ?? 0;
  const sleepStages: SleepStages | null = data?.sleepStages ?? null;
  const sleepFeelRating: number = data?.sleepFeelRating ?? 0;
  const sleepBedTime: string | null = data?.sleepBedTime ?? null;
  const sleepWakeTime: string | null = data?.sleepWakeTime ?? null;
  const fmtSleep = (h: number) => { if (!h) return '--'; const hrs = Math.floor(h); const m = Math.round((h - hrs) * 60); return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`; };
  const sleepConsistencyPts: number = data?.sleepConsistencyPts ?? 0;
  const { score: sleepScore, hasStages } = calcSleepScore(sleepHours || null, sleepStages, sleepGoal, sleepFeelRating || null, !!data?.sleepOverride, sleepConsistencyPts);
  const sleepLabel = sleepScore !== null ? (sleepScore >= 85 ? 'Well Rested' : sleepScore >= 70 ? 'Could Be Better' : 'Poor Sleep') : null;
  const sleepScoreColor = sleepScore !== null ? (sleepScore >= 85 ? theme.accentGreen : sleepScore >= 70 ? '#d4860a' : theme.accentRed) : theme.textDim;

  const dayprogram = workoutState?.programs?.[currentDate];
  const daychecks = workoutState?.checks?.[currentDate] || {};
  const daycardiolog = workoutState?.cardiologs?.[currentDate] || {};
  const exercises = dayprogram?.exercises || [];
  const donecount = exercises.filter((ex: any) => daychecks[ex.id]).length;

  const navPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(currentDate + 'T12:00:00'); d.setDate(d.getDate() - 1);
    setCurrentDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  };
  const navNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(currentDate + 'T12:00:00'); d.setDate(d.getDate() + 1);
    const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (next <= todayKey) setCurrentDate(next);
  };

  const openCalPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const parts = currentDate.split('-');
    setPickerYear(parseInt(parts[0]));
    setPickerMonth(parseInt(parts[1]) - 1);
    calFadeAnim.setValue(0);
    setCalPickerVisible(true);
    Animated.timing(calFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };
  const closeCalPicker = () => {
    Animated.timing(calFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setCalPickerVisible(false));
  };
  const calPickerSelect = (dk: string) => {
    if (dk <= todayKey) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCurrentDate(dk); closeCalPicker(); }
  };
  const calPickerPrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y => y - 1); }
    else setPickerMonth(m => m - 1);
  };
  const calPickerNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nm = pickerMonth === 11 ? 0 : pickerMonth + 1;
    const ny = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
    if (`${ny}-${String(nm + 1).padStart(2, '0')}-01` <= todayKey) { setPickerMonth(nm); setPickerYear(ny); }
  };
  const calPickerCanGoNext = () => {
    const nm = pickerMonth === 11 ? 0 : pickerMonth + 1;
    const ny = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
    return `${ny}-${String(nm + 1).padStart(2, '0')}-01` <= todayKey;
  };

  const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const CAL_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const renderCalGrid = () => {
    const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity onPress={calPickerPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlueRaw} />
          </TouchableOpacity>
          <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>
            {CAL_MONTHS[pickerMonth]} {pickerYear}
          </Text>
          <TouchableOpacity onPress={calPickerNext} disabled={!calPickerCanGoNext()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={calPickerCanGoNext() ? theme.accentBlueRaw : theme.textDim} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          {CAL_DAYS.map(d => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>{d}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', marginBottom: 2 }}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={{ flex: 1 }} />;
              const dk = `${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel = dk === currentDate;
              const isFut = dk > todayKey;
              const isTod = dk === todayKey;
              return (
                <TouchableOpacity key={ci} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }} onPress={() => calPickerSelect(dk)} disabled={isFut} activeOpacity={0.7}>
                  <View style={{
                    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSel ? theme.accentBlueRaw : isTod ? `${theme.accentBlueRaw}26` : 'transparent',
                    borderWidth: isTod && !isSel ? 0.5 : 0, borderColor: theme.accentBlueRaw,
                  }}>
                    <Text style={{ fontSize: 13, fontFamily: isSel ? 'DMSans_700Bold' : 'DMSans_400Regular', color: isSel ? theme.bgPrimary : isFut ? theme.textDim : theme.textSecondary }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const styles = useStyles(theme, themeId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 }}>
          <View style={{ flex: 1 }} />
          <Text style={styles.headerTitle}>DAY DETAIL</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={openCalPicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="calendar" size={20} color={theme.accentBlueRaw} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={navPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={theme.accentBlueRaw} />
          </TouchableOpacity>
          <Text style={styles.headerDate}>{formatDate(currentDate)}</Text>
          <TouchableOpacity onPress={navNext} disabled={isToday} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={isToday ? theme.textDim : theme.accentBlueRaw} />
          </TouchableOpacity>
        </View>
        {!isToday && (
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>HISTORY</Text>
          </View>
        )}
      </View>

      <Modal visible={calPickerVisible} transparent animationType="none" onRequestClose={closeCalPicker}>
        <Animated.View style={{ flex: 1, opacity: calFadeAnim }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={closeCalPicker} activeOpacity={1} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
            <View style={{ backgroundColor: theme.bgSheet, borderRadius: 16, paddingHorizontal: 20, paddingBottom: 20, width: 310, borderWidth: 0.5, borderColor: theme.borderCard, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
              <TouchableOpacity onPress={closeCalPicker} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.sheetHandle }} />
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Jump to Date</Text>
              {calPickerVisible && renderCalGrid()}
              <TouchableOpacity
                onPress={closeCalPicker}
                style={{ marginTop: 16, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Day at a Glance */}
        <View style={styles.card}>
          <CardWash />
          <Ionicons name="flame" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
          <Text style={styles.cardLabel}>Day at a Glance</Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{totalCals || '--'}</Text>
              <Text style={styles.statLabel}>Consumed</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{caloriesBurned || '--'}</Text>
              <Text style={styles.statLabel}>Burned</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{totalCals > 0 ? `${netcals > 0 ? '+' : ''}${Math.round(netcals)}` : '--'}</Text>
              <Text style={styles.statLabel}>Net Cals</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: '#0d9268' }]}>{totalProtein}<Text style={styles.statUnit}>g</Text></Text>
              <Text style={styles.statLabel}>Protein</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: '#c47d1a' }]}>{showNetCarbs && totalFiber > 0 ? totalNetCarbs : totalCarbs}<Text style={styles.statUnit}>g</Text></Text>
              <Text style={styles.statLabel}>{showNetCarbs && totalFiber > 0 ? 'Net Carbs' : 'Carbs'}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: '#a83232' }]}>{totalFat}<Text style={styles.statUnit}>g</Text></Text>
              <Text style={styles.statLabel}>Fat</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{weight ?? '--'}</Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{water || '--'}</Text>
              <Text style={styles.statLabel}>Water (oz)</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{steps ? steps.toLocaleString() : '--'}</Text>
              <Text style={styles.statLabel}>Steps</Text>
            </View>
          </View>
        </View>

        {/* Sleep */}
        {sleepHours > 0 && (
          <View style={styles.card}>
          <CardWash />
            <Ionicons name="moon" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSleepOpen(!sleepOpen); }} style={styles.cardRow} activeOpacity={0.7}>
              <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Sleep</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {sleepScore !== null && (
                  <View style={[styles.scorePill, { backgroundColor: sleepScoreColor + '22', borderColor: sleepScoreColor + '66' }]}>
                    <Text style={[styles.scorePillText, { color: sleepScoreColor }]}>{sleepScore} · {sleepLabel}</Text>
                  </View>
                )}
                <Ionicons name={sleepOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} />
              </View>
            </TouchableOpacity>
            {sleepOpen && (
              <View style={{ marginTop: 12 }}>
                {/* Row 1: Duration + Bedtime + Wake */}
                <View style={styles.statRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>{fmtSleep(sleepHours)}</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>{fmtTime(sleepBedTime)}</Text>
                    <Text style={styles.statLabel}>Bedtime</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statVal}>{fmtTime(sleepWakeTime)}</Text>
                    <Text style={styles.statLabel}>Wake</Text>
                  </View>
                </View>
                {/* Row 2: Stages (Apple Health) */}
                {hasStages && sleepStages && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.statRow}>
                      <View style={styles.stat}>
                        <Text style={styles.statVal}>{fmtMs(sleepStages.deep)}</Text>
                        <Text style={styles.statLabel}>Deep</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statVal}>{fmtMs(sleepStages.rem)}</Text>
                        <Text style={styles.statLabel}>REM</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statVal}>{fmtMs(sleepStages.core)}</Text>
                        <Text style={styles.statLabel}>Core</Text>
                      </View>
                    </View>
                  </>
                )}
                {/* Feel rating */}
                {sleepFeelRating > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>How you felt</Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                        {({ 1:'Rough night', 2:'Very poor', 3:'Poor sleep', 4:'Below average', 5:'Okay', 6:'Decent', 7:'Pretty good', 8:'Good night', 9:'Great sleep', 10:'Slept amazing' } as Record<number,string>)[sleepFeelRating] ?? ''}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Workout */}
        <View style={styles.card}>
          <CardWash />
          <Ionicons name="barbell" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWorkoutOpen(!workoutOpen); }} style={styles.cardRow} activeOpacity={0.7}>
            <Text style={[styles.cardLabel, { marginBottom: 0 }]}>
              {dayprogram ? `Workout · ${donecount}/${exercises.length}` : 'Workout'}
            </Text>
            <Ionicons name={workoutOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} />
          </TouchableOpacity>
          {(() => {
            const dayTags = dayprogram?.tags || [];
            const tagObjs = dayTags.map((id: string) => workoutTags.find((t: any) => t.id === id)).filter(Boolean);
            return (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 4 }}>
                {tagObjs.length === 0 ? (
                  <View style={{ borderWidth: 1, borderColor: theme.borderSubtle, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: theme.textDim }}>UNASSIGNED</Text>
                  </View>
                ) : (
                  tagObjs.map((tag: any) => (
                    <View key={tag.id} style={{ backgroundColor: tag.color + '99', borderWidth: 1, borderColor: tag.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{tag.label.toUpperCase()}</Text>
                    </View>
                  ))
                )}
              </View>
            );
          })()}
          {workoutOpen && (
            <View style={{ marginTop: 10 }}>
              {exercises.length === 0 ? (
                <Text style={styles.emptyText}>No workout logged.</Text>
              ) : (
                exercises.map((ex: any) => (
                  <View key={ex.id} style={styles.exerciseRow}>
                    <View style={[styles.check, { backgroundColor: daychecks[ex.id] ? theme.accentGreen : 'transparent', borderColor: daychecks[ex.id] ? theme.accentGreen : theme.borderSubtle }]}>
                      {daychecks[ex.id] && <Text style={{ color: theme.bgPrimary, fontSize: 10, fontWeight: '700' }}>✓</Text>}
                    </View>
                    <Text style={[styles.exerciseName, { color: daychecks[ex.id] ? theme.textDim : theme.textSecondary }]} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    {ex.isCardio && (
                      <Text style={styles.cardioMeta}>
                        {[ex.duration ? `${ex.duration}m` : null, ex.distance ? `${ex.distance}mi` : null].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                ))
              )}
              {(daycardiolog.effortScore != null || daycardiolog.caloriesBurned) && exercises.length > 0 && (
                <View style={styles.divider} />
              )}
              {daycardiolog.effortScore != null && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Effort Score</Text>
                  <Text style={styles.metaVal}>{daycardiolog.effortScore} / 10</Text>
                </View>
              )}
              {!!daycardiolog.caloriesBurned && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Calories Burned</Text>
                  <Text style={[styles.metaVal, { color: theme.accentRed }]}>{daycardiolog.caloriesBurned} kcal</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Meals */}
        <View style={styles.card}>
          <CardWash />
          <Ionicons name="restaurant" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMealsOpen(!mealsOpen); }} style={styles.cardRow} activeOpacity={0.7}>
            <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Meals · {totalCals} kcal</Text>
            <Ionicons name={mealsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} />
          </TouchableOpacity>
          {mealsOpen && (
            <View style={{ marginTop: 10 }}>
              {entries.length === 0 ? (
                <Text style={styles.emptyText}>No food logged this day.</Text>
              ) : (
                (() => {
                  const allMealKeys: string[] = Array.from(new Set(entries.map((e: any) => String(e.meal))));
                  const orderedKeys: string[] = [
                    ...mealSlots.map(s => s.id).filter(id => allMealKeys.some(k => k === id || mealSlots.find(s => s.id === id)?.name === k)),
                    ...allMealKeys.filter(k => !mealSlots.find(s => s.id === k || s.name === k)),
                  ];
                  const seen = new Set<string>();
                  return orderedKeys.filter(k => { if (seen.has(k)) return false; seen.add(k); return true; }).map((mealKey: string) => {
                    const slot = findSlotForMeal(mealKey, mealSlots);
                    const displayName = slot ? slot.name : getMealDisplayName(mealKey, mealSlots, slotNameCache);
                    const mealEntries = entries.filter((e: any) => e.meal === mealKey || (slot && e.meal === slot.name));
                    if (mealEntries.length === 0) return null;
                    const mealTotal = mealEntries.reduce((s: number, e: any) => s + e.cal, 0);
                    return (
                      <View key={mealKey} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={styles.sectionLabel}>{displayName}</Text>
                          <Text style={{ fontSize: 12, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>{mealTotal} kcal</Text>
                        </View>
                        {mealEntries.map((entry: any, i: number) => (
                          <View key={i} style={styles.foodRow}>
                            <Text style={styles.foodName} numberOfLines={1}>{entry.name}</Text>
                            <Text style={styles.foodCal}>{entry.cal} kcal</Text>
                          </View>
                        ))}
                      </View>
                    );
                  });
                })()
              )}
            </View>
          )}
        </View>

        {/* Advanced Nutrition */}
        {(totalFiber > 0 || totalSodium > 0 || totalSugar > 0 || totalSatFat > 0 || totalPolyFat > 0 || totalMonoFat > 0 || totalCholesterol > 0 || totalPotassium > 0 || totalSugarAlcohols > 0 || totalVitaminA > 0 || totalVitaminC > 0 || totalCalcium > 0 || totalIron > 0) && (
          <View style={styles.card}>
          <CardWash />
            <Ionicons name="leaf" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAdvNutritionOpen(!advNutritionOpen); }} style={styles.cardRow} activeOpacity={0.7}>
              <Text style={[styles.cardLabel, { marginBottom: 0 }]}>Advanced Nutrition</Text>
              <Ionicons name={advNutritionOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textDim} />
            </TouchableOpacity>
            {advNutritionOpen && (
              <View style={{ marginTop: 10 }}>

                {/* Carb Breakdown */}
                {(totalFiber > 0 || totalAddedSugars > 0 || totalSugar > 0) && (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Carb Breakdown</Text>
                    {[
                      { label: 'Total Carbs',    value: `${totalCarbs}g`,           bold: false },
                      { label: 'Fiber',           value: `${totalFiber}g`,           bold: false },
                      ...(totalAddedSugars > 0 ? [{ label: 'Added Sugars', value: `${totalAddedSugars}g`, bold: false }] : []),
                      { label: 'Sugar',           value: `${totalSugar}g`,           bold: false },
                      ...(totalSugarAlcohols > 0 ? [{ label: 'Sugar Alcohols', value: `${totalSugarAlcohols}g`, bold: false }] : []),
                      { label: 'Net Carbs',       value: `${totalNetCarbs}g`,        bold: true  },
                    ].filter(r => parseFloat(r.value) > 0 || r.bold).map((row, i, arr) => (
                      <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                        <Text style={[styles.sectionLabel, row.bold && { fontFamily: 'DMSans_700Bold', color: theme.textPrimary }]}>{row.label}</Text>
                        <Text style={{ fontSize: 13, color: row.bold ? '#c47d1a' : theme.textMuted, fontFamily: row.bold ? 'DMSans_700Bold' : 'DMSans_600SemiBold' }}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Extended Fats */}
                {(totalSatFat > 0 || totalPolyFat > 0 || totalMonoFat > 0 || totalTransFat > 0) && (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Extended Fats</Text>
                    {[
                      { label: 'Saturated Fat',   value: totalSatFat,   unit: 'g' },
                      { label: 'Polyunsaturated', value: totalPolyFat,  unit: 'g' },
                      { label: 'Monounsaturated', value: totalMonoFat,  unit: 'g' },
                      { label: 'Trans Fat',        value: totalTransFat, unit: 'g' },
                    ].filter(n => n.value > 0).map((n, i, arr) => (
                      <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                        <Text style={styles.sectionLabel}>{n.label}</Text>
                        <Text style={{ fontSize: 13, color: '#a83232', fontFamily: 'DMSans_600SemiBold' }}>{n.value}{n.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Other Nutrients */}
                {(totalCholesterol > 0 || totalSodium > 0 || totalPotassium > 0 || totalCaffeine > 0) && (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Other Nutrients</Text>
                    {[
                      { label: 'Cholesterol', value: totalCholesterol, unit: 'mg', color: theme.textSecondary },
                      { label: 'Sodium',      value: totalSodium,      unit: 'mg', color: '#8b5cf6' },
                      { label: 'Potassium',   value: totalPotassium,   unit: 'mg', color: '#06b6d4' },
                      { label: 'Caffeine',    value: totalCaffeine,    unit: 'mg', color: theme.textSecondary },
                    ].filter(n => n.value > 0).map((n, i, arr) => (
                      <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                        <Text style={styles.sectionLabel}>{n.label}</Text>
                        <Text style={{ fontSize: 13, color: n.color, fontFamily: 'DMSans_600SemiBold' }}>{n.value}{n.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Vitamins */}
                {(totalVitaminA > 0 || totalVitaminC > 0 || totalVitaminD > 0 || totalVitaminE > 0 || totalVitaminK > 0) && (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Vitamins</Text>
                    {[
                      { label: 'Vitamin A', value: totalVitaminA, unit: 'mcg' },
                      { label: 'Vitamin C', value: totalVitaminC, unit: 'mg'  },
                      { label: 'Vitamin D', value: totalVitaminD, unit: 'mcg' },
                      { label: 'Vitamin E', value: totalVitaminE, unit: 'mg'  },
                      { label: 'Vitamin K', value: totalVitaminK, unit: 'mcg' },
                    ].filter(n => n.value > 0).map((n, i, arr) => (
                      <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                        <Text style={styles.sectionLabel}>{n.label}</Text>
                        <Text style={{ fontSize: 13, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>{n.value}{n.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* B Vitamins */}
                {(totalVitaminB6 > 0 || totalFolate > 0 || totalVitaminB12 > 0 || totalBiotin > 0) && (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>B Vitamins</Text>
                    {[
                      { label: 'Vitamin B6', value: totalVitaminB6,  unit: 'mg'  },
                      { label: 'Folate',     value: totalFolate,     unit: 'mcg' },
                      { label: 'Vitamin B12', value: totalVitaminB12, unit: 'mcg' },
                      { label: 'Biotin',     value: totalBiotin,     unit: 'mcg' },
                    ].filter(n => n.value > 0).map((n, i, arr) => (
                      <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                        <Text style={styles.sectionLabel}>{n.label}</Text>
                        <Text style={{ fontSize: 13, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>{n.value}{n.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Minerals */}
                {(totalCalcium > 0 || totalIron > 0 || totalMagnesium > 0 || totalZinc > 0 || totalCopper > 0) && (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 10, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Minerals</Text>
                    {[
                      { label: 'Calcium',   value: totalCalcium,   unit: 'mg' },
                      { label: 'Iron',      value: totalIron,      unit: 'mg' },
                      { label: 'Magnesium', value: totalMagnesium, unit: 'mg' },
                      { label: 'Zinc',      value: totalZinc,      unit: 'mg' },
                      { label: 'Copper',    value: totalCopper,    unit: 'mg' },
                    ].filter(n => n.value > 0).map((n, i, arr) => (
                      <View key={n.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderSubtle }}>
                        <Text style={styles.sectionLabel}>{n.label}</Text>
                        <Text style={{ fontSize: 13, color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold' }}>{n.value}{n.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}

              </View>
            )}
          </View>
        )}

        {/* Journal */}
        {journalEntries.length > 0 && (
          <View style={styles.card}>
          <CardWash />
            <Ionicons name="book" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
            <Text style={styles.cardLabel}>Journal</Text>
            {journalEntries.map((entry, i) => {
              const meta = CAT_META[entry.category] || CAT_META.personal;
              return (
                <TouchableOpacity
                  key={entry.id}
                  onPress={() => { onClose(); router.push(`/journal?expandDate=${entry.id}` as any); }}
                  style={[styles.journalEntry, i < journalEntries.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle }]}
                  activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.catPill, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                      <Ionicons name={meta.icon as any} size={10} color={meta.color} />
                      <Text style={[styles.catPillText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold' }} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Daily Note */}
        {!!data?.dailyNote && (
          <View style={styles.card}>
          <CardWash />
            <Ionicons name="create" size={130} color={theme.accentBlueRaw} style={styles.heroIcon} />
            <Text style={styles.cardLabel}>Daily Note</Text>
            <Text style={styles.noteText}>{data.dailyNote}</Text>
          </View>
        )}

        {/* Exclude from Stats */}
        <View style={styles.card}>
          <CardWash />
          <Text style={styles.cardLabel}>Exclude from Stats</Text>
          <Text style={styles.excludeSubtitle}>Excluded days are skipped in averages</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['diet', 'water', 'exercise'] as const).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleExclude(key)}
                style={[styles.excludeBtn, {
                  backgroundColor: excluded[key] ? theme.accentRedBg : theme.accentGreenBg,
                  borderColor: excluded[key] ? theme.accentRedBorder : theme.accentGreenBorder,
                }]}>
                <Text style={[styles.excludeBtnText, { color: excluded[key] ? theme.accentRed : theme.accentGreen }]}>
                  {excluded[key] ? `✕ ${key}` : `✓ ${key}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const useStyles = (theme: any, themeId: string) => {
  const shadowOpacity = ({ light: 0.35, dark: 0.14, slate: 0.28, warm: 0.30, blush: 0.30 } as Record<string, number>)[themeId] ?? 0.18;
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: theme.bgSheet },
    header:           { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard },
    headerTitle:      { fontSize: 10, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 3, textTransform: 'uppercase' },
    dateNav:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerDate:       { fontSize: 15, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, textAlign: 'center', flex: 1 },
    historyBadge:     { marginTop: 6, backgroundColor: `${theme.accentBlueRaw}26`, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
    historyBadgeText: { fontSize: 9, color: theme.accentBlueRaw, fontFamily: 'DMSans_700Bold', letterSpacing: 2 },
    content:          { padding: 14, paddingBottom: 80 },
    card: {
      backgroundColor: theme.bgCard,
      borderWidth: 0.5,
      borderColor: theme.borderCard,
      borderTopWidth: 0.5,
      borderTopColor: theme.borderCardTop,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity,
      shadowRadius: 6,
      elevation: 3,
      overflow: 'hidden',
    },
    heroIcon:       { position: 'absolute', right: -24, bottom: -28, opacity: 0.10 },
    cardLabel:      { fontSize: 9, letterSpacing: 3, color: theme.textDim, textTransform: 'uppercase', fontFamily: 'DMSans_700Bold', marginBottom: 10 },
    cardRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statRow:        { flexDirection: 'row' },
    stat:           { flex: 1, alignItems: 'center', paddingVertical: 2 },
    statVal:        { fontSize: 20, color: theme.textSecondary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
    statUnit:       { fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular' },
    statLabel:      { fontSize: 8, color: theme.textDim, fontFamily: 'DMSans_700Bold', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'center' },
    divider:        { height: 0.5, backgroundColor: theme.borderSubtle, marginVertical: 10 },
    scorePill:      { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5 },
    scorePillText:  { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 },
    exerciseRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle },
    check:          { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    exerciseName:   { flex: 1, fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
    cardioMeta:     { fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 1 },
    metaRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    metaLabel:      { fontSize: 9, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
    metaVal:        { fontSize: 18, color: theme.textPrimary, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
    sectionLabel:   { fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
    foodRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: theme.borderSubtle },
    foodName:       { fontSize: 13, color: theme.textSecondary, fontFamily: 'DMSans_600SemiBold', flex: 1, marginRight: 8 },
    foodCal:        { fontSize: 13, color: theme.textDim, fontFamily: 'DMSans_600SemiBold' },
    journalEntry:   { paddingVertical: 10 },
    catPill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 0.5 },
    catPillText:    { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 },
    emptyText:      { fontSize: 13, color: theme.textPlaceholder, fontFamily: 'DMSans_400Regular', fontStyle: 'italic' },
    noteText:       { fontSize: 13, color: theme.textMuted, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
    excludeSubtitle: { fontSize: 10, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
    excludeBtn:     { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 0.5 },
    excludeBtnText: { fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 },
    backBtn:        { padding: 16, alignItems: 'center' },
    backBtnText:    { color: theme.accentBlue, fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  });
};
