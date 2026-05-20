import { useEffect, useRef, useState } from 'react';
import {
  Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { THEMES } from '../../theme';

const theme = THEMES['light'];



const SEX_OPTIONS = [
  { key: 'male',   label: 'Male'   },
  { key: 'female', label: 'Female' },
  { key: 'other',  label: 'Prefer not to say' },
];



export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();

  const [name,          setName]          = useState('');
  const [heightFt,      setHeightFt]      = useState('');
  const [heightIn,      setHeightIn]      = useState('');
  const [birthday,      setBirthday]      = useState<Date | null>(null);
  const [showPicker,    setShowPicker]    = useState(false);
  const [tempBirthday,  setTempBirthday]  = useState<Date | null>(null);
  const [sex,           setSex]           = useState('male');
  

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const canContinue =
    name.trim().length > 0 &&
    parseFloat(heightFt) > 0 &&
    birthday !== null;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleContinue = async () => {
    if (!canContinue) return;
    try {
      const existing = await AsyncStorage.getItem('pj_profile');
      const current  = existing ? JSON.parse(existing) : {};
      const totalInches = (parseFloat(heightFt) * 12) + (parseFloat(heightIn) || 0);
      await storageSet('pj_profile', JSON.stringify({
        ...current,
        name:     name.trim(),
        height:   String(totalInches),
        birthday: birthday ? birthday.toISOString() : '',
        sex:      sex,
      }));

      router.push('/onboarding/style-survey');
    } catch (e) {
      console.log('Profile setup save error', e);
    }
  };

  return (
    <LinearGradient colors={[theme.gradientStart, theme.gradientEnd]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Progress bar */}
        <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.accentBlueRaw, width: '14%' }]} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 2 OF 7</Text>
            <Text style={[styles.title,       { color: theme.accentBlueRaw }]}>Let's get to know you</Text>
            <Text style={[styles.subtitle,    { color: theme.textMuted }]}>
              This helps us calculate your real calorie target.
            </Text>

            {/* Name */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>YOUR NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
              placeholder="First name"
              placeholderTextColor={theme.textPlaceholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            

            

            {/* Height */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>HEIGHT</Text>
            <View style={styles.inputRow}>
              <View style={[styles.inputRow, { flex: 1, gap: 8 }]}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                  placeholder="5"
                  placeholderTextColor={theme.textPlaceholder}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <View style={[styles.unitTag, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
                  <Text style={[styles.unitTagText, { color: theme.textMuted }]}>ft</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
                  placeholder="10"
                  placeholderTextColor={theme.textPlaceholder}
                  value={heightIn}
                  onChangeText={v => setHeightIn(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <View style={[styles.unitTag, { backgroundColor: theme.bgCard, borderColor: theme.borderCard }]}>
                  <Text style={[styles.unitTagText, { color: theme.textMuted }]}>in</Text>
                </View>
              </View>
            </View>

            {/* Birthday */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>DATE OF BIRTH</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, justifyContent: 'center' }]}
              onPress={() => { setTempBirthday(birthday || new Date(1990, 0, 1)); setShowPicker(true); }}
            >
              <Text style={{ color: birthday ? theme.textPrimary : theme.textPlaceholder, fontFamily: 'DMSans_400Regular', fontSize: 16 }}>
                {birthday ? birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select your birthday'}
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <View>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => { setShowPicker(false); setTempBirthday(null); }}
                  style={{ position: 'absolute', top: -1000, bottom: 0, left: -24, right: -24, zIndex: 0 }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 4, zIndex: 1 }}>
                  <TouchableOpacity onPress={() => { setShowPicker(false); setTempBirthday(null); }} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { if (tempBirthday) setBirthday(tempBirthday); setShowPicker(false); }} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={{ color: theme.accentBlueRaw, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode="date"
                  value={tempBirthday || new Date(1990, 0, 1)}
                  display="spinner"
                  textColor={theme.textPrimary}
                  maximumDate={new Date()}
                  onChange={(_, date) => { if (date) setTempBirthday(date); }}
                />
              </View>
            )}

            {/* Sex */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>BIOLOGICAL SEX</Text>
            <View style={styles.segmentRow}>
              {SEX_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => setSex(o.key)}
                  style={[
                    styles.segmentBtn,
                    { backgroundColor: theme.bgInput, borderColor: theme.borderInput },
                    sex === o.key && { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: theme.textMuted },
                    sex === o.key && { color: theme.accentBlue },
                  ]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            

          </Animated.View>
        </ScrollView>

        {/* Continue button */}
        <View style={[styles.footer, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 16, borderTopColor: theme.borderCard, backgroundColor: theme.gradientEnd }]}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              {
                backgroundColor: canContinue ? theme.accentBlueRaw : theme.bgInput,
                borderWidth:     canContinue ? 0 : 0.5,
                borderColor:     theme.borderInput,
              }
            ]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            <Text style={[styles.continueBtnText, { color: canContinue ? '#ffffff' : theme.textDim }]}>
              CONTINUE
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:      { paddingHorizontal: 24, paddingBottom: 8 },
  progressTrack:    { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },
  content:          { padding: 24, paddingTop: 16 },
  screenLabel:      { fontSize: 9,  fontFamily: 'DMSans_700Bold',   letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  title:            { fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 6 },
  subtitle:         { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 28 },
  fieldLabel:       { fontSize: 9,  fontFamily: 'DMSans_700Bold',   letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },
  input:            { borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: 'DMSans_400Regular' },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitTag:          { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  unitTagText:      { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  segmentRow:       { flexDirection: 'row', gap: 8 },
  segmentBtn:       { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  segmentText:      { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  
  footer:           { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  continueBtn:      { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  continueBtnText:  { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3 },
});