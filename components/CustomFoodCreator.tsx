import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import * as ImagePicker from 'expo-image-picker';
import { saveToFirebase } from '../firebaseConfig';
import { useTheme } from '../theme';
import { useToast } from './Toast';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';

interface CustomFoodCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (food: any) => void;
  title?: string;
  tutorialMode?: boolean;
  prefill?: {
    name?: string;
    brand?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
    saturatedFat?: number;
    polyunsaturatedFat?: number;
    monounsaturatedFat?: number;
    potassium?: number;
    vitaminA?: number;
    vitaminC?: number;
    calcium?: number;
    iron?: number;
    sugarAlcohols?: number;
    addedSugars?: number;
    transFat?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    vitaminB6?: number;
    folate?: number;
    vitaminB12?: number;
    biotin?: number;
    magnesium?: number;
    zinc?: number;
    copper?: number;
    caffeine?: number;
    servingGrams?: number;
    servingLabel?: string;
    servingUnitType?: string;
    type?: 'supplement' | 'food';
  };
}

const SERVING_UNITS = ['g', 'ml', 'fl oz', 'oz', 'container', 'serving', 'tbsp', 'tsp', 'cup', 'pill', 'capsule', 'tablet', 'softgel', 'gummy'];

export default function CustomFoodCreator({ visible, onClose, onSaved, title, tutorialMode, prefill }: CustomFoodCreatorProps) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { registerScrollView, unregisterScrollView, registerTutorialAction, unregisterTutorialAction } = useTutorial();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  // Tutorial target refs -- always declared (hooks rule).
  // Active when tutorialMode=true; dormant in normal Modal use.
  const cardRef              = useTutorialTarget('create_food_card');
  const nameInputRef         = useTutorialTarget('create_food_name');
  const caloriesInputRef     = useTutorialTarget('create_food_calories');
  const caloriesSectionRef   = useTutorialTarget('create_food_calories_section');
  const optionalToggleRef    = useTutorialTarget('create_food_optional');
  const macrosSectionRef     = useTutorialTarget('create_food_macros_section');
  const saveBtnRef           = useTutorialTarget('create_food_save');
  const scrollViewRef        = useRef<ScrollView>(null);

  // Controls mounting of the inline (non-Modal) view in tutorialMode.
  // Stays true during the close animation so we don't unmount mid-fade.
  const [inlineMounted, setInlineMounted] = useState(false);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [brand, setBrand] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [polyunsaturatedFat, setPolyunsaturatedFat] = useState('');
  const [monounsaturatedFat, setMonounsaturatedFat] = useState('');
  const [potassium, setPotassium] = useState('');
  const [vitaminA, setVitaminA] = useState('');
  const [vitaminC, setVitaminC] = useState('');
  const [calcium, setCalcium] = useState('');
  const [iron, setIron] = useState('');
  const [sugarAlcohols, setSugarAlcohols] = useState('');
  const [addedSugars, setAddedSugars] = useState('');
  const [transFat, setTransFat] = useState('');
  const [vitaminD, setVitaminD] = useState('');
  const [vitaminE, setVitaminE] = useState('');
  const [vitaminK, setVitaminK] = useState('');
  const [vitaminB6, setVitaminB6] = useState('');
  const [folate, setFolate] = useState('');
  const [vitaminB12, setVitaminB12] = useState('');
  const [biotin, setBiotin] = useState('');
  const [magnesium, setMagnesium] = useState('');
  const [zinc, setZinc] = useState('');
  const [copper, setCopper] = useState('');
  const [caffeine, setCaffeine] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [servingLabel, setServingLabel] = useState('');
  const [servingUnitType, setServingUnitType] = useState('g');
  const [additionalServings, setAdditionalServings] = useState<Array<{ id: string; label: string; grams: string }>>([]);
  const [isSupplementType, setIsSupplementType] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const optionalHeight = useRef(new Animated.Value(0)).current;
  const optionalMeasured = useRef(0);
  const prefillExpanded = useRef(false);
  const [saving, setSaving] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);

  // Register the creator's ScrollView so the tutorial engine can scrollToTarget
  // when the save button is near or below the visible area.
  useEffect(() => {
    if (!tutorialMode) return;
    registerScrollView('create_food_scroll', scrollViewRef as any);
    return () => unregisterScrollView('create_food_scroll');
  }, [tutorialMode]);

  // Register expandOptionalSection action -- fired on NEXT from the calories step
  // so the macros section is already open when the macros step shows.
  useEffect(() => {
    if (!tutorialMode) return;
    const expandOptionalSection = async () => {
      setShowOptional(true);
      // Small delay so React re-renders and onLayout fires to populate optionalMeasured.
      await new Promise<void>(r => setTimeout(r, 60));
      const h = optionalMeasured.current || 320; // fallback if layout hasn't fired yet
      Animated.timing(optionalHeight, { toValue: h, duration: 250, useNativeDriver: false }).start();
      // Wait for animation to complete before tutorial advances to macros step.
      await new Promise<void>(r => setTimeout(r, 280));
      // Park the blue "Macros & Extended Nutrition" toggle in the lower-middle of the
      // screen so the macros step's tip card lands up top, above the box, with the
      // fields visible below it (the tip copy references those fields).
      const sv = scrollViewRef.current as any;
      const toggle = optionalToggleRef.current as any;
      if (sv && toggle) {
        await new Promise<void>(resolve => {
          toggle.measureLayout(
            sv,
            (_x: number, y: number) => {
              const SH = Dimensions.get('window').height;
              sv.scrollTo({ y: Math.max(0, y - SH * 0.30), animated: true });
              resolve();
            },
            () => resolve(),
          );
        });
        await new Promise<void>(r => setTimeout(r, 350));
      }
    };
    registerTutorialAction('expandOptionalSection', expandOptionalSection);
    return () => unregisterTutorialAction('expandOptionalSection');
  }, [tutorialMode]);

  useEffect(() => {
    if (visible) {
      if (tutorialMode) setInlineMounted(true);
      if (prefill) {
        setName(prefill.name || '');
        setBrand(prefill.brand || '');
        setCalories(prefill.calories?.toString() || '');
        setProtein(prefill.protein?.toString() || '');
        setCarbs(prefill.carbs?.toString() || '');
        setFat(prefill.fat?.toString() || '');
        setFiber(prefill.fiber?.toString() || '');
        setSugar(prefill.sugar?.toString() || '');
        setSodium(prefill.sodium?.toString() || '');
        setCholesterol(prefill.cholesterol?.toString() || '');
        setSaturatedFat(prefill.saturatedFat?.toString() || '');
        setPolyunsaturatedFat(prefill.polyunsaturatedFat?.toString() || '');
        setMonounsaturatedFat(prefill.monounsaturatedFat?.toString() || '');
        setPotassium(prefill.potassium?.toString() || '');
        setVitaminA(prefill.vitaminA?.toString() || '');
        setVitaminC(prefill.vitaminC?.toString() || '');
        setCalcium(prefill.calcium?.toString() || '');
        setIron(prefill.iron?.toString() || '');
        setSugarAlcohols(prefill.sugarAlcohols?.toString() || '');
        setAddedSugars(prefill.addedSugars?.toString() || '');
        setTransFat(prefill.transFat?.toString() || '');
        setVitaminD(prefill.vitaminD?.toString() || '');
        setVitaminE(prefill.vitaminE?.toString() || '');
        setVitaminK(prefill.vitaminK?.toString() || '');
        setVitaminB6(prefill.vitaminB6?.toString() || '');
        setFolate(prefill.folate?.toString() || '');
        setVitaminB12(prefill.vitaminB12?.toString() || '');
        setBiotin(prefill.biotin?.toString() || '');
        setMagnesium(prefill.magnesium?.toString() || '');
        setZinc(prefill.zinc?.toString() || '');
        setCopper(prefill.copper?.toString() || '');
        setCaffeine(prefill.caffeine?.toString() || '');
        setServingGrams(prefill.servingGrams?.toString() || '');
        setServingLabel(prefill.servingLabel || '');
        setServingUnitType(prefill.servingUnitType || 'g');
        setIsSupplementType(prefill.type === 'supplement');
        const hasOptional = !!(prefill.protein || prefill.carbs || prefill.fat || prefill.fiber || prefill.sugar || prefill.sodium || prefill.servingGrams);
        if (hasOptional) {
          setShowOptional(true);
          optionalHeight.setValue(9999);
          prefillExpanded.current = true;
        }
      }
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
      ]).start();
    } else {
      // visible became false (e.g. closeCreatorAfterTutorial called directly) --
      // unmount the inline view. If handleClose ran first, inlineMounted is
      // already false; this is a safety fallback.
      if (tutorialMode) setInlineMounted(false);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      resetForm();
      if (tutorialMode) setInlineMounted(false);
      onClose();
    });
  };

  const resetForm = () => {
    setName(''); setBrand(''); setCalories('');
    setProtein(''); setCarbs(''); setFat('');
    setFiber(''); setSugar(''); setSodium('');
    setCholesterol(''); setSaturatedFat('');
    setAddedSugars(''); setTransFat(''); setVitaminD('');
    setVitaminE(''); setVitaminK(''); setVitaminB6('');
    setFolate(''); setVitaminB12(''); setBiotin('');
    setMagnesium(''); setZinc(''); setCopper(''); setCaffeine('');
    setServingGrams(''); setServingLabel(''); setServingUnitType('g');
    setAdditionalServings([]);
    setIsSupplementType(false);
    setPendingPhotoUri(null);
    setShowOptional(false);
    optionalHeight.setValue(0);
    optionalMeasured.current = 0;
    prefillExpanded.current = false;
    cardScale.setValue(0.95);
  };

  const toggleOptional = () => {
    const toValue = showOptional ? 0 : optionalMeasured.current;
    Animated.timing(optionalHeight, { toValue, duration: 250, useNativeDriver: false }).start();
    setShowOptional(v => !v);
  };

  const handlePhotoAdd = () => {
    const options = pendingPhotoUri
      ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = pendingPhotoUri ? 2 : undefined;
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
      (buttonIndex) => {
        if (buttonIndex === cancelIndex) return;
        if (pendingPhotoUri && buttonIndex === 2) { setPendingPhotoUri(null); return; }
        (async () => {
          try {
            let result: ImagePicker.ImagePickerResult;
            if (buttonIndex === 0) {
              result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
            } else {
              result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
            }
            if (result.canceled) return;
            setPendingPhotoUri(result.assets[0].uri);
          } catch {
            showToast('Photo failed', 'Unable to access camera or library', 'error');
          }
        })();
      }
    );
  };

  const canSave = name.trim().length > 0 && calories.trim().length > 0 && parseInt(calories) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    // In tutorial mode, don't write to storage -- just close the creator.
    if (tutorialMode) { handleClose(); return; }
    setSaving(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const saved = await AsyncStorage.getItem('pj_my_foods');
      const existing = saved ? JSON.parse(saved) : [];
      const id = `custom_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 4)}`;
      const grams = parseFloat(servingGrams) || 100;
      const newFood: any = {
        id,
        name: name.trim(),
        cal: parseInt(calories),
        ...(brand.trim() ? { brand: brand.trim() } : {}),
        ...(protein ? { protein: parseFloat(protein) } : {}),
        ...(carbs ? { carbs: parseFloat(carbs) } : {}),
        ...(fat ? { fat: parseFloat(fat) } : {}),
        ...(fiber ? { fiber: parseFloat(fiber) } : {}),
        ...(sugar ? { sugar: parseFloat(sugar) } : {}),
        ...(sodium ? { sodium: parseFloat(sodium) } : {}),
        ...(cholesterol ? { cholesterol: parseFloat(cholesterol) } : {}),
        ...(saturatedFat ? { saturatedFat: parseFloat(saturatedFat) } : {}),
        ...(polyunsaturatedFat ? { polyunsaturatedFat: parseFloat(polyunsaturatedFat) } : {}),
        ...(monounsaturatedFat ? { monounsaturatedFat: parseFloat(monounsaturatedFat) } : {}),
        ...(potassium ? { potassium: parseFloat(potassium) } : {}),
        ...(vitaminA ? { vitaminA: parseFloat(vitaminA) } : {}),
        ...(vitaminC ? { vitaminC: parseFloat(vitaminC) } : {}),
        ...(calcium ? { calcium: parseFloat(calcium) } : {}),
        ...(iron ? { iron: parseFloat(iron) } : {}),
        ...(sugarAlcohols ? { sugarAlcohols: parseFloat(sugarAlcohols) } : {}),
        ...(addedSugars ? { addedSugars: parseFloat(addedSugars) } : {}),
        ...(transFat ? { transFat: parseFloat(transFat) } : {}),
        ...(vitaminD ? { vitaminD: parseFloat(vitaminD) } : {}),
        ...(vitaminE ? { vitaminE: parseFloat(vitaminE) } : {}),
        ...(vitaminK ? { vitaminK: parseFloat(vitaminK) } : {}),
        ...(vitaminB6 ? { vitaminB6: parseFloat(vitaminB6) } : {}),
        ...(folate ? { folate: parseFloat(folate) } : {}),
        ...(vitaminB12 ? { vitaminB12: parseFloat(vitaminB12) } : {}),
        ...(biotin ? { biotin: parseFloat(biotin) } : {}),
        ...(magnesium ? { magnesium: parseFloat(magnesium) } : {}),
        ...(zinc ? { zinc: parseFloat(zinc) } : {}),
        ...(copper ? { copper: parseFloat(copper) } : {}),
        ...(caffeine ? { caffeine: parseFloat(caffeine) } : {}),
        servingSize: grams,
        servingUnitType: servingUnitType,
        servingUnit: servingLabel.trim() || `${grams}${servingUnitType}`,
        additionalServings: additionalServings
          .filter(s => s.label.trim() && parseFloat(s.grams) > 0)
          .map(s => ({ label: s.label.trim(), grams: parseFloat(s.grams) })),
        calPer100g: Math.round((parseInt(calories) / grams) * 100),
        proteinPer100g: protein ? Math.round((parseFloat(protein) / grams) * 100 * 10) / 10 : 0,
        carbsPer100g: carbs ? Math.round((parseFloat(carbs) / grams) * 100 * 10) / 10 : 0,
        fatPer100g: fat ? Math.round((parseFloat(fat) / grams) * 100 * 10) / 10 : 0,
        isCustom: true,
        type: isSupplementType ? 'supplement' : 'food',
        foodNutrients: [
          { nutrientName: 'Energy', unitName: 'KCAL', value: parseInt(calories) },
          { nutrientName: 'Protein', unitName: 'G', value: parseFloat(protein) || 0 },
          { nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: parseFloat(carbs) || 0 },
          { nutrientName: 'Total lipid (fat)', unitName: 'G', value: parseFloat(fat) || 0 },
          { nutrientName: 'Fiber, total dietary',         unitName: 'G',   value: parseFloat(fiber) || 0 },
          { nutrientName: 'Sugars, total including NLEA', unitName: 'G',   value: parseFloat(sugar) || 0 },
          { nutrientName: 'Sodium, Na',                   unitName: 'MG',  value: parseFloat(sodium) || 0 },
          { nutrientName: 'Cholesterol',                  unitName: 'MG',  value: parseFloat(cholesterol) || 0 },
          { nutrientName: 'Fatty acids, total saturated', unitName: 'G',   value: parseFloat(saturatedFat) || 0 },
          { nutrientName: 'Polyunsaturated Fat',          unitName: 'G',   value: parseFloat(polyunsaturatedFat) || 0 },
          { nutrientName: 'Monounsaturated Fat',          unitName: 'G',   value: parseFloat(monounsaturatedFat) || 0 },
          { nutrientName: 'Potassium, K',                 unitName: 'MG',  value: parseFloat(potassium) || 0 },
          { nutrientName: 'Vitamin A',                    unitName: 'MCG', value: parseFloat(vitaminA) || 0 },
          { nutrientName: 'Vitamin C',                    unitName: 'MG',  value: parseFloat(vitaminC) || 0 },
          { nutrientName: 'Calcium, Ca',                  unitName: 'MG',  value: parseFloat(calcium) || 0 },
          { nutrientName: 'Iron, Fe',                     unitName: 'MG',  value: parseFloat(iron) || 0 },
          { nutrientName: 'Sugar Alcohols',               unitName: 'G',   value: parseFloat(sugarAlcohols) || 0 },
          { nutrientName: 'Added Sugars',                 unitName: 'G',   value: parseFloat(addedSugars) || 0 },
          { nutrientName: 'Trans Fat',                    unitName: 'G',   value: parseFloat(transFat) || 0 },
          { nutrientName: 'Vitamin D',                    unitName: 'MCG', value: parseFloat(vitaminD) || 0 },
          { nutrientName: 'Vitamin E',                    unitName: 'MG',  value: parseFloat(vitaminE) || 0 },
          { nutrientName: 'Vitamin K',                    unitName: 'MCG', value: parseFloat(vitaminK) || 0 },
          { nutrientName: 'Vitamin B6',                   unitName: 'MG',  value: parseFloat(vitaminB6) || 0 },
          { nutrientName: 'Folate',                       unitName: 'MCG', value: parseFloat(folate) || 0 },
          { nutrientName: 'Vitamin B12',                  unitName: 'MCG', value: parseFloat(vitaminB12) || 0 },
          { nutrientName: 'Biotin',                       unitName: 'MCG', value: parseFloat(biotin) || 0 },
          { nutrientName: 'Magnesium, Mg',                unitName: 'MG',  value: parseFloat(magnesium) || 0 },
          { nutrientName: 'Zinc, Zn',                     unitName: 'MG',  value: parseFloat(zinc) || 0 },
          { nutrientName: 'Copper, Cu',                   unitName: 'MG',  value: parseFloat(copper) || 0 },
          { nutrientName: 'Caffeine',                     unitName: 'MG',  value: parseFloat(caffeine) || 0 },
        ],
      };
      if (pendingPhotoUri) {
        try {
          const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const photoDir = new Directory(Paths.document, 'food_photos');
          if (!photoDir.exists) photoDir.create();
          const destUri = `${photoDir.uri}${safeId}.jpg`;
          const destFile = new FSFile(destUri);
          if (destFile.exists) destFile.delete();
          const srcFile = new FSFile(pendingPhotoUri);
          srcFile.copy(destFile);
          await AsyncStorage.setItem(`pj_food_photo_${id}`, destUri);
        } catch (e) {
          console.log('CustomFoodCreator photo save error', e);
        }
      }
      const updated = [...existing, newFood].sort((a, b) => a.name.localeCompare(b.name));
      await storageSet('pj_my_foods', JSON.stringify(updated));
      await saveToFirebase('my_foods', 'foods', updated);
      showToast('Food saved', name.trim(), 'success');
      onSaved?.(newFood);
      handleClose();
    } catch (e) {
      console.log('CustomFoodCreator save error', e);
      showToast('Save failed', 'Please try again', 'info');
    } finally {
      setSaving(false);
    }
  };

  const s = styles(theme);

  // ── Shared card content (same JSX for both Modal and inline paths) ────────
  const cardContent = (
    <Animated.View ref={cardRef as any} style={[s.card, { transform: [{ scale: cardScale }] }]}>
      <TouchableOpacity onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }} style={{ alignSelf: 'center', paddingTop: 12, paddingBottom: 4, paddingHorizontal: 20 }} hitSlop={{ top: 8, bottom: 8, left: 20, right: 20 }}>
        <View style={{ height: 4, width: 40, backgroundColor: theme.borderCard, borderRadius: 2 }} />
      </TouchableOpacity>
      <View style={s.header}>
        <Text style={s.title}>{title ? title.toUpperCase() : 'CREATE FOOD'}</Text>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        <Text style={s.requiredNote}>* Required</Text>

        {/* Type selector */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setIsSupplementType(false); }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: !isSupplementType ? theme.accentBlueBg : theme.bgInput, borderColor: !isSupplementType ? theme.accentBlueBorder : theme.borderInput }}
          >
            <Ionicons name="nutrition" size={18} color={!isSupplementType ? theme.accentBlue : theme.textMuted} />
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginTop: 4, color: !isSupplementType ? theme.accentBlue : theme.textMuted }}>Food</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setIsSupplementType(true); }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: isSupplementType ? theme.accentBlueBg : theme.bgInput, borderColor: isSupplementType ? theme.accentBlueBorder : theme.borderInput }}
          >
            <Ionicons name="medical" size={18} color={isSupplementType ? theme.accentBlue : theme.textMuted} />
            <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginTop: 4, color: isSupplementType ? theme.accentBlue : theme.textMuted }}>Supplement</Text>
          </TouchableOpacity>
        </View>

        {/* Food Name */}
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Food Name <Text style={s.requiredStar}>*</Text></Text>
          <TextInput
            ref={nameInputRef as any}
            style={s.input}
            placeholder="e.g. Chicken Breast"
            placeholderTextColor={theme.textPlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Brand + Photo */}
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>Brand</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="e.g. Tyson"
              placeholderTextColor={theme.textPlaceholder}
              value={brand}
              onChangeText={setBrand}
              autoCapitalize="words"
            />
            <TouchableOpacity onPress={handlePhotoAdd} style={{ width: 64, height: 64 }} activeOpacity={0.8}>
              {pendingPhotoUri ? (
                <Image source={{ uri: pendingPhotoUri }} style={{ width: 64, height: 64, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.textDim, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera-outline" size={24} color={theme.textDim} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Calories section wrapper -- spotlit as one unit by tutorial step 3 */}
        <View ref={caloriesSectionRef as any}>
          {/* Calories + Serving (2-col) */}
          <View style={s.twoCol}>
            <View style={[s.fieldRow, { flex: 1 }]}>
              <Text style={s.fieldLabel}>Calories <Text style={s.unitText}>kcal</Text> <Text style={s.requiredStar}>*</Text></Text>
              <TextInput
                ref={caloriesInputRef as any}
                style={s.input}
                placeholder="0"
                placeholderTextColor={theme.textPlaceholder}
                value={calories}
                onChangeText={setCalories}
                keyboardType="number-pad"
              />
            </View>
            <View style={[s.fieldRow, { flex: 1 }]}>
              <Text style={s.fieldLabel}>Serving <Text style={s.unitText}>{servingUnitType}</Text></Text>
              <TextInput
                style={s.input}
                placeholder="100"
                placeholderTextColor={theme.textPlaceholder}
                value={servingGrams}
                onChangeText={setServingGrams}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Serving Unit picker */}
          <View style={[s.fieldRow, { marginBottom: 14 }]}>
            <Text style={[s.fieldLabel, { marginBottom: 8 }]}>Serving Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
              {SERVING_UNITS.map(u => (
                <TouchableOpacity
                  key={u}
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setServingUnitType(u); }}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 6, borderWidth: 1,
                    backgroundColor: servingUnitType === u ? theme.accentBlueBg : 'transparent',
                    borderColor: servingUnitType === u ? theme.accentBlueBorder : theme.borderInput,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: servingUnitType === u ? theme.accentBlue : theme.textMuted }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Serving Label */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Serving Label <Text style={s.unitText}>(optional)</Text></Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 1 scoop, 1 container"
              placeholderTextColor={theme.textPlaceholder}
              value={servingLabel}
              onChangeText={setServingLabel}
            />
          </View>
        </View>

        {/* Additional Servings -- hidden in tutorialMode to keep save button visible */}
        {!tutorialMode && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 }}>
              <Text style={[s.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Additional Servings</Text>
              <TouchableOpacity
                onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setAdditionalServings(prev => [...prev, { id: `as_${Date.now()}`, label: '', grams: '' }]); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
              >
                <Ionicons name="add" size={12} color={theme.accentBlue} />
                <Text style={{ fontSize: 11, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' }}>Add</Text>
              </TouchableOpacity>
            </View>
            {additionalServings.length === 0 && (
              <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: 'DMSans_400Regular', marginBottom: 12 }}>
                Optional. Add extra serving sizes like "1 link" or "6 pieces".
              </Text>
            )}
            {additionalServings.map((sv, i) => (
              <View key={sv.id} style={{ flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <TextInput
                  style={[s.input, { flex: 1.4, paddingVertical: 8 }]}
                  placeholder="Label (e.g. 1 link)"
                  placeholderTextColor={theme.textPlaceholder}
                  value={sv.label}
                  onChangeText={v => setAdditionalServings(prev => prev.map((x, j) => j === i ? { ...x, label: v } : x))}
                />
                <TextInput
                  style={[s.input, { flex: 0.8, paddingVertical: 8 }]}
                  placeholder="g"
                  placeholderTextColor={theme.textPlaceholder}
                  keyboardType="decimal-pad"
                  value={sv.grams}
                  onChangeText={v => {
                    const stripped = v.replace(/[^0-9.]/g, '');
                    setAdditionalServings(prev => prev.map((x, j) => j === i ? { ...x, grams: stripped } : x));
                  }}
                />
                <TouchableOpacity
                  onPress={() => setAdditionalServings(prev => prev.filter((_, j) => j !== i))}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Macros section wrapper -- spotlit as one unit by tutorial step 4.
            Contains the toggle button + the animated expanding content. */}
        <View ref={macrosSectionRef as any}>
          {/* Optional toggle */}
          <TouchableOpacity
            ref={optionalToggleRef as any}
            style={s.optionalToggle}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); toggleOptional(); }}
          >
            <Text style={s.optionalToggleText}>Macros &amp; Extended Nutrition</Text>
            <Ionicons name={showOptional ? 'chevron-up' : 'chevron-down'} size={14} color={theme.accentBlue} />
          </TouchableOpacity>

          <Animated.View style={{ overflow: 'hidden', height: optionalHeight }}>
            <View
              onLayout={e => {
                const h = e.nativeEvent.layout.height;
                if (h > 0) {
                  optionalMeasured.current = h;
                  if (prefillExpanded.current) {
                    optionalHeight.setValue(h);
                    prefillExpanded.current = false;
                  }
                }
              }}
              style={{ position: showOptional ? 'relative' : 'absolute', opacity: showOptional ? 1 : 0 }}
            >
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>MACROS</Text>
              <View style={s.twoCol}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Protein <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Carbs <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Fat <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>EXTENDED FATS</Text>
              <View style={s.twoCol}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Sat. Fat <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={saturatedFat} onChangeText={setSaturatedFat} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Poly Fat <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={polyunsaturatedFat} onChangeText={setPolyunsaturatedFat} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Mono Fat <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={monounsaturatedFat} onChangeText={setMonounsaturatedFat} keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>OTHER NUTRIENTS</Text>
              {/* Row 1: Fiber / Sugar / Sugar Alc. */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Fiber <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={fiber} onChangeText={setFiber} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Sugar <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={sugar} onChangeText={setSugar} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Sugar Alc. <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={sugarAlcohols} onChangeText={setSugarAlcohols} keyboardType="decimal-pad" />
                </View>
              </View>
              {/* Row 2: Sodium / Cholesterol / Potassium */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Sodium <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={sodium} onChangeText={setSodium} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Chol. <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={cholesterol} onChangeText={setCholesterol} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Potassium <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={potassium} onChangeText={setPotassium} keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>VITAMINS & MINERALS</Text>
              {/* Row 1: Vitamin A / Vitamin C */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Vitamin A <Text style={s.unitText}>mcg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminA} onChangeText={setVitaminA} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Vitamin C <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminC} onChangeText={setVitaminC} keyboardType="decimal-pad" />
                </View>
              </View>
              {/* Row 2: Calcium / Iron */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Calcium <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={calcium} onChangeText={setCalcium} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Iron <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={iron} onChangeText={setIron} keyboardType="decimal-pad" />
                </View>
              </View>
              {/* Row 3: Added Sugars / Trans Fat */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Added Sugars <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={addedSugars} onChangeText={setAddedSugars} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Trans Fat <Text style={s.unitText}>g</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={transFat} onChangeText={setTransFat} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Vitamin D <Text style={s.unitText}>mcg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminD} onChangeText={setVitaminD} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Vitamin E <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminE} onChangeText={setVitaminE} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Vitamin K <Text style={s.unitText}>mcg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminK} onChangeText={setVitaminK} keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>B VITAMINS</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>B6 <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminB6} onChangeText={setVitaminB6} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Folate <Text style={s.unitText}>mcg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={folate} onChangeText={setFolate} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>B12 <Text style={s.unitText}>mcg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={vitaminB12} onChangeText={setVitaminB12} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Biotin <Text style={s.unitText}>mcg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={biotin} onChangeText={setBiotin} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]} />
                <View style={[s.fieldRow, { flex: 1 }]} />
              </View>
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>MINERALS</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Magnesium <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={magnesium} onChangeText={setMagnesium} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Zinc <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={zinc} onChangeText={setZinc} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Copper <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={copper} onChangeText={setCopper} keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={[s.sectionLabel, { marginTop: 12 }]}>OTHER</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.fieldRow, { flex: 1 }]}>
                  <Text style={s.fieldLabel}>Caffeine <Text style={s.unitText}>mg</Text></Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={theme.textPlaceholder} value={caffeine} onChangeText={setCaffeine} keyboardType="decimal-pad" />
                </View>
                <View style={[s.fieldRow, { flex: 1 }]} />
                <View style={[s.fieldRow, { flex: 1 }]} />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Save button -- spotlit by tutorial */}
        <TouchableOpacity
          ref={saveBtnRef as any}
          style={[s.saveBtn, !canSave && s.saveBtnDim]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={s.saveBtnText}>{saving ? 'SAVING...' : 'SAVE FOOD'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // ── Tutorial inline render (non-Modal so TutorialOverlay sits above it) ──
  if (tutorialMode) {
    if (!inlineMounted) return null;
    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: overlayOpacity,
            backgroundColor: theme.overlayBg,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          },
        ]}
      >
        {cardContent}
      </Animated.View>
    );
  }

  // ── Normal Modal render ───────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }} />
        {cardContent}
      </Animated.View>
    </Modal>
  );
}

const styles = (theme: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: theme.bgSheet,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopWidth: 1.5,
    borderTopColor: theme.accentBlueRaw,
    width: '100%',
    height: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: theme.borderCard,
  },
  title: { fontSize: 20, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
  closeBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 24 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'DMSans_700Bold', marginBottom: 10 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: theme.textSecondary, fontFamily: 'DMSans_500Medium', marginBottom: 5 },
  unitText: { color: theme.textMuted, fontSize: 11 },
  requiredStar: { color: theme.accentRed || '#cc3333', fontSize: 12 },
  requiredNote: { fontSize: 10, color: theme.accentRed || '#cc3333', fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  input: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionalToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  optionalToggleText: { fontSize: 13, color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold' },
  saveBtn: { backgroundColor: theme.accentGreen, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 16 },
  saveBtnDim: { opacity: 0.35 },
  saveBtnText: { color: theme.bgPrimary, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2 },
});
