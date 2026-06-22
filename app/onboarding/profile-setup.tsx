import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { THEMES } from '../../theme';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { isOnboardingPreview, setOnboardingPreview } from '../../utils/onboardingPreview';

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
  

  const scrollViewRef = useRef<ScrollView>(null);
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
    isOnboardingPreview() || (
      name.trim().length > 0 &&
      parseFloat(heightFt) > 0 &&
      birthday !== null
    );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleContinue = async () => {
    if (isOnboardingPreview()) { triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding/style-survey'); return; }
    if (!canContinue) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const ageYears = (Date.now() - birthday!.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 13) {
      Alert.alert('Age Requirement', 'Project J is designed for users 13 and older.');
      return;
    }
    try {
      const existing = await AsyncStorage.getItem('pj_profile');
      const current  = existing ? JSON.parse(existing) : {};
      const totalInches = (parseFloat(heightFt) * 12) + (parseFloat(heightIn) || 0);
      await storageSet('pj_profile', JSON.stringify({
        ...current,
        name:     name.trim(),
        height:   String(totalInches),
        heightFt: heightFt,
        heightIn: heightIn || '0',
        birthday: birthday ? birthday.toISOString() : '',
        sex:      sex,
      }));

      router.push('/onboarding/style-survey');
    } catch (e) {
      console.log('Profile setup save error', e);
    }
  };

  return (
    <LinearGradient colors={['#c4c8e8', '#dadcef', '#f0f0f5']} style={{ flex: 1 }}>

      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); if (isOnboardingPreview()) setOnboardingPreview(false); router.back(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.backBtn, { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.accentBlue} />
          </TouchableOpacity>
          <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.accentBlueRaw, width: '14%' }]} />
          </View>
        </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 2 OF 7</Text>
            <Text style={[styles.title,       { color: theme.accentBlueRaw }]}>Let's get to know you</Text>
            <Text style={[styles.subtitle,    { color: theme.textMuted }]}>
              Just the basics, so every number in the app is built around you.
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
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setTempBirthday(birthday || new Date(1990, 0, 1));
                setShowPicker(true);
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
              }}
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
                  <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setShowPicker(false); setTempBirthday(null); }} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); if (tempBirthday) setBirthday(tempBirthday); setShowPicker(false); }} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
                    <Text style={{ color: theme.accentBlueRaw, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center', width: '100%' }}>
                  <DateTimePicker
                    mode="date"
                    value={tempBirthday || new Date(1990, 0, 1)}
                    display="spinner"
                    textColor={theme.textPrimary}
                    maximumDate={new Date()}
                    onChange={(_, date) => { if (date) setTempBirthday(date); }}
                  />
                </View>
              </View>
            )}

            {/* Sex */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>BIOLOGICAL SEX</Text>
            <View style={styles.segmentRow}>
              {SEX_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setSex(o.key); }}
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
      </KeyboardAvoidingView>

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

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:      { paddingHorizontal: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  progressTrack:    { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content:          { padding: 24, paddingTop: 16 },
  screenLabel:      { fontSize: 9,  fontFamily: 'DMSans_700Bold',   letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  title:            { fontSize: 36, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, marginBottom: 6,
                      textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  subtitle:         { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 20, marginBottom: 28 },
  fieldLabel:       { fontSize: 9,  fontFamily: 'DMSans_700Bold',   letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },
  input:            { borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: 'DMSans_400Regular',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitTag:          { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  unitTagText:      { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  segmentRow:       { flexDirection: 'row', gap: 8 },
  segmentBtn:       { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  segmentText:      { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  
  footer:           { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  continueBtn:      { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  continueBtnText:  { fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 3 },
});