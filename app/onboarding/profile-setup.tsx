import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { THEMES, mix } from '../../theme';
import { getModeAccentTints } from '../../utils/modeAccent';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { isOnboardingPreview, setOnboardingPreview } from '../../utils/onboardingPreview';
import { Type } from '../../typography';
import BackgroundLayers from '../../components/BackgroundLayers';
import PrimaryCTA from '../../components/PrimaryCTA';
import ButtonShine from '../../components/ButtonShine';
import GradientTitle from '../../components/GradientTitle';
import { BlurView } from 'expo-blur';

const theme = THEMES['light'];
// Steps 1-2 have no mode picked yet, so there's no REAL accent to show -- but the flow ends on Your
// Style, which recolors live to the mode's actual accent (Balanced's navy #1a44c2 by default, since
// that's the pre-quiz/no-answers starting recommendation). Steps 1-2 used to run the generic app blue
// (theme.accentBlueRaw, #2563eb) instead, which visibly did not match the moment Your Style loaded --
// Justin caught the mismatch on device. Pinned to Balanced here so the whole flow opens on one color.
const { accent: ACCENT, selected: ACCENT_SELECTED, bg: ACCENT_BG, border: ACCENT_BORDER } = getModeAccentTints('balanced', theme);



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

  // Birthday picker. TWO coordinated animations, per the app's expand/collapse standard: the container's
  // HEIGHT on the JS thread (height can never be native-driven), the contents' opacity + slide on the
  // native thread. 216 is the iOS spinner's fixed height; 66 is the button row + its gap.
  const PICKER_H = 216 + 66;
  const pickerHeight = useRef(new Animated.Value(0)).current;
  const pickerAnim   = useRef(new Animated.Value(0)).current;

  const openPicker = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setTempBirthday(birthday || new Date(1990, 0, 1));
    setShowPicker(true);
    Animated.parallel([
      Animated.timing(pickerHeight, { toValue: PICKER_H, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(pickerAnim,   { toValue: 1,        duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // Bring the spinner into view once it has opened -- it is the last thing on the form.
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 120);
  };

  // Animate OUT, then unmount. Setting showPicker=false first is what made it snap.
  const closePicker = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(pickerHeight, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: false }),
      Animated.timing(pickerAnim,   { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => { setShowPicker(false); setTempBirthday(null); });
  };

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
    <LinearGradient colors={[theme.gradientEnd, theme.gradientEnd]} style={{ flex: 1 }}>
      <BackgroundLayers glow={ACCENT} />

      {/* Progress bar. Frosted chrome, absolute, glued to the top -- content scrolls under it. It answers
          "how much more of this is there", the one thing worth permanent screen space here; the title and
          subtitle are read once and are free to scroll away. */}
      <View style={[styles.progressBar, { paddingTop: insets.top + 12, borderBottomColor: theme.borderCard }]}>
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); if (isOnboardingPreview()) setOnboardingPreview(false); router.back(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.backBtn, { backgroundColor: ACCENT_BG, borderColor: ACCENT_BORDER }]}
          >
            <Ionicons name="chevron-back" size={20} color={ACCENT} />
          </TouchableOpacity>
          <View style={[styles.progressTrack, { backgroundColor: theme.bgProgressTrack }]}>
            <View style={[styles.progressFill, { backgroundColor: ACCENT, width: '17%' }]} />
            {/* 17% = 1/6. Two counting bugs died here. (1) The bar was drawn on a 7-step scale while every
                label said "of 8" -- the 8 counted the sign-in screen, which has no bar and no label, so the
                flow opened 14% full before you had done anything. (2) Commitment was Discipline-ONLY, so
                Balanced and Mindful users jumped 3 -> 5 and never saw a step 4; it was cut 2026-07-16.
                Now: 6 real steps every user actually walks, and All Set is the payoff (full bar, no step
                label) rather than a step. */}
          </View>
        </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <Text style={[styles.screenLabel, { color: theme.textMuted }]}>STEP 1 OF 6</Text>
            <GradientTitle title="Let's get to know you" color={ACCENT} style={styles.title} />
            <Text style={[styles.subtitle,    { color: theme.textSecondary }]}>
              Just the basics, so every number in the app is built around you.
            </Text>

            {/* Name */}
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>YOUR NAME</Text>
            {/* "First and last", not "First name": the header AVATAR takes the first letter of up to TWO
                words, so a user who follows a "First name" instruction gets a one-letter avatar. The field
                and the avatar disagreed about what a name is. */}
            <TextInput
              style={[styles.input, { backgroundColor: theme.bgInput, borderColor: theme.borderInput, color: theme.textPrimary }]}
              placeholder="First and Last"
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
              onPress={openPicker}
            >
              <Text style={{ color: birthday ? theme.textPrimary : theme.textPlaceholder, fontFamily: Type.ui, fontSize: 16 }}>
                {birthday ? birthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select your birthday'}
              </Text>
            </TouchableOpacity>
            {/* INLINE, and it animates. It is not a card and it is not a panel -- it is this field's picker,
                so it wears no fill, no border and no shadow; it just opens in place.
                The height animates on the JS thread (useNativeDriver:false -- height cannot be native) while
                the contents fade + slide on the native thread. Easing.out opening, Easing.in closing, the
                app's standard. Content below slides rather than teleports, which is all that was ever wrong:
                Settings and Stats push content the same way and feel fine.
                Height is a known constant, not measured: the iOS spinner is a fixed 216 and the button row
                is fixed, so a ghost render would measure a number we already know. */}
            {showPicker && (
            <Animated.View style={{ height: pickerHeight, overflow: 'hidden' }}>
              <Animated.View
                style={{
                  opacity: pickerAnim,
                  transform: [{ translateY: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
                }}
              >
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
                {/* Real buttons: they were two bare 12px text links stranded in the form, smaller than
                    everything around them, and Confirm is a commit. */}
                <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    {/* Both halves are pinned to the SAME height rather than letting their text set it.
                        PrimaryCTA's label is either 17px or compact's 12.5px and is not settable, so with
                        identical padding the two buttons still came out different heights -- Confirm smaller
                        by the difference in text size. (Second time this bit: the sleep gear's Save/Cancel
                        had it too.) */}
                    <TouchableOpacity
                      onPress={closePicker}
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: Type.uiSemibold }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryCTA
                      label="Confirm"
                      compact
                      fill={ACCENT}
                      faceStyle={{ borderRadius: 10, height: 48, paddingVertical: 0 }}
                      onPress={() => { if (tempBirthday) setBirthday(tempBirthday); closePicker(); }}
                    />
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
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
                    // Opaque when selected: this row sits on the PAGE, and the page now glows accent -- a ~10%
                  // accent tint over accent light is the mud we hit on the faith pills and everywhere else.
                  sex === o.key && { backgroundColor: ACCENT_SELECTED, borderColor: ACCENT_BORDER },
                  ]}
                >
                  {sex === o.key ? <ButtonShine radius={10} /> : null}
                  <Text style={[
                    styles.segmentText,
                    { color: theme.textMuted },
                    sex === o.key && { color: ACCENT },
                  ]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue button. The footer is FROSTED CHROME (blur + chromeFill), like the tab bar and the tab
          headers -- not an opaque slab. It used to paint gradientEnd, which was invisible only because the
          whole page was that same flat colour; now the page GLOWS underneath and an opaque slab of ground
          colour reads as a random white rectangle bolted to the bottom (Justin). Frosted lets the glow
          through, so the footer floats on the page instead of covering it. */}
        <View style={[styles.footer, { paddingBottom: keyboardVisible ? 12 : insets.bottom + 16, borderTopColor: theme.borderCard, overflow: 'hidden' }]}>
          <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.chromeFill }]} pointerEvents="none" />
          {/* MOLDED, mixed case. Was a flat painted accent slab with "CONTINUE" in caps + letterSpacing --
              the last of them in the app, on the first screen a new user ever fills in. PrimaryCTA owns the
              dim state and the Medium haptic. */}
          <PrimaryCTA
            label="Continue"
            fill={ACCENT}
            disabled={!canContinue}
            faceStyle={{ borderRadius: 14, paddingVertical: 18 }}
            onPress={handleContinue}
          />
        </View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  progressBar:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, overflow: 'hidden' },
  progressTrack:    { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content:          { padding: 24, paddingTop: 16 },
  screenLabel:      { fontSize: 9,  fontFamily: Type.uiBold,   letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  // No textShadow. A drop shadow on a display title is a trick nothing else in the app uses -- it reads
  // dated, and Clash does not need help.
  title:            { fontSize: 36, fontFamily: Type.display, letterSpacing: 0.3, marginBottom: 6 },
  // VOICE, not interface. This line is not a label or a control -- it is the APP TALKING TO YOU, explaining
  // itself, which is exactly the voice role (Home's coach, Sleep's coaches, the summaries, Otto and Halo).
  // Onboarding is the app introducing itself: same speaker, earlier conversation.
  // It also fixes the RANKING, which was the real problem rather than the face being "plain": the screen ran
  // Clash for the title and Onest for everything else, so the title shouted and the rest mumbled. Three
  // roles now read at once -- Clash announces, voice speaks, Onest labels.
  // Also 13 -> 15 and off textMuted onto textSecondary (at the render site): it carries the screen's actual
  // promise and it was set at card-footnote size in the dimmest-but-one colour.
  subtitle:         { fontSize: 15, fontFamily: Type.voice, lineHeight: 22, marginBottom: 28 },
  // 9 -> 11. Nine is the app's CARD-LABEL size -- right for a label buried in a dashboard card, too small
  // when it is the only instruction on a form field.
  fieldLabel:       { fontSize: 11, fontFamily: Type.uiBold,   letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },
  // No shadows on any of these. An input is a WELL -- it should read as carved INTO the page, not hovering
  // above it -- and the same goes for a segment button and a unit tag. They all had a black drop shadow, so
  // every field on this screen floated. The border draws the edge (the same conclusion the Light theme's
  // bgInput round-trip reached: reach for the border, not the fill, and never for a shadow).
  input:            { borderWidth: 0.5, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: Type.ui },
  inputRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitTag:          { borderWidth: 0.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  unitTagText:      { fontSize: 14, fontFamily: Type.uiSemibold },
  segmentRow:       { flexDirection: 'row', gap: 8 },
  segmentBtn:       { flex: 1, borderWidth: 0.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  segmentText:      { fontSize: 12, fontFamily: Type.uiSemibold },
  
  // ABSOLUTE, so the form scrolls UNDER it and the frost has something to be frosted over. It used to sit
  // in normal layout flow, which meant nothing ever passed behind it -- glass in front of a wall. The tell
  // that it was always meant to float: the ScrollView already reserves paddingBottom insets.bottom + 100,
  // a hundred points of clearance for a bar that was not overlapping anything.
  footer:           { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 0.5 },
  continueBtn:      { borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  continueBtnText:  { fontSize: 18, fontFamily: Type.uiBold, letterSpacing: 1 },
});