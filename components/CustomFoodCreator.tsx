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
import { uploadFoodPhoto } from '../utils/foodPhotos';
import { useTheme } from '../theme';
import { useToast } from './Toast';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { Type } from '../typography';
import NutrientFieldsGrid from './NutrientFieldsGrid';
import ButtonShine from './ButtonShine';
import PrimaryCTA from './PrimaryCTA';
import GradientIcon from './GradientIcon';
import GradientNumber from './GradientNumber';
import { recognizeText as ocrRecognizeText } from 'expo-ocr-kit';
import { convertUnit, convertibleUnitsFor, unitGroup, unitLabel } from '../utils/unitConversion';
import UnitPickerButton from './UnitPickerButton';
import { parseNutritionLabel, ParsedLabel } from '../utils/nutritionLabelParser';
import LabelScanReviewModal, { ScanRowResult, ScanServingResult } from './LabelScanReviewModal';
import ModalHeader from './ModalHeader';

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
    thiamin?: number;
    riboflavin?: number;
    niacin?: number;
    choline?: number;
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

const SUPPLEMENT_ONLY_UNITS = ['pill', 'capsule', 'tablet', 'softgel', 'gummy'];
// 'ml' covers liquid supplements (tinctures, drops, liquid extracts) that aren't a count-based
// unit at all -- flagged as a real gap after pill/capsule/etc-only left no option for those.
const SUPPLEMENT_UNIT_OPTIONS = [...SUPPLEMENT_ONLY_UNITS, 'ml', 'g'];

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
  const [thiamin, setThiamin] = useState('');
  const [riboflavin, setRiboflavin] = useState('');
  const [niacin, setNiacin] = useState('');
  const [choline, setCholine] = useState('');
  const [magnesium, setMagnesium] = useState('');
  const [zinc, setZinc] = useState('');
  const [copper, setCopper] = useState('');
  const [caffeine, setCaffeine] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [servingLabel, setServingLabel] = useState('');
  const [servingUnitType, setServingUnitType] = useState('g');
  const [additionalServings, setAdditionalServings] = useState<Array<{ id: string; label: string; grams: string }>>([]);
  // Per-row entry unit -- lets someone type an alternate serving in oz/cup/etc. and have it
  // convert into the primary serving's unit automatically, WITHOUT changing what's actually
  // stored (still a plain number in the primary unit, same as before this feature existed).
  // Draft holds the raw in-progress text while converting, so mid-typing (e.g. "2.") doesn't
  // get silently reformatted on every keystroke -- conversion only commits on blur.
  const [additionalServingUnits, setAdditionalServingUnits] = useState<Record<string, string>>({});
  const [additionalServingDrafts, setAdditionalServingDrafts] = useState<Record<string, string>>({});
  // Primary Serving Amount unit -- purely a typing convenience, same mechanism as Additional
  // Servings above. servingGrams stays canonical grams always for Food-type items; this is never
  // persisted, just resets to 'g' display each time (per the locked serving-unit-redesign-plan:
  // "Grams stays the one canonical stored number always, regardless of which unit was used to
  // type it in -- the dropdown is a typing convenience, never a second source of truth.")
  const [servingEntryUnit, setServingEntryUnit] = useState('g');
  const [servingDraft, setServingDraft] = useState<string | undefined>(undefined);
  const WEIGHT_ENTRY_UNITS = ['g', 'kg', 'oz', 'lb'];
  const VOLUME_ENTRY_UNITS = ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'];
  const ALL_ENTRY_UNITS = [...WEIGHT_ENTRY_UNITS, ...VOLUME_ENTRY_UNITS];
  const [isSupplementType, setIsSupplementType] = useState(false);
  const [saving, setSaving] = useState(false);
  // Measured (not assumed) header + scroll-content heights, so the card can be given an
  // explicit height that actually shrinks when sections collapse -- maxHeight/flexGrow tricks
  // on the ScrollView itself didn't work (a ScrollView's job is "let content scroll inside a
  // fixed window," not "shrink my own window to match content"), so this measures the real
  // rendered size directly instead of hoping a layout property resolves the way CSS would.
  const [headerHeight, setHeaderHeight] = useState(60);
  const [contentHeight, setContentHeight] = useState(500);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [scannedLabel, setScannedLabel] = useState<ParsedLabel | null>(null);
  const [showScanReview, setShowScanReview] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);

  // Register the creator's ScrollView so the tutorial engine can scrollToTarget
  // when the save button is near or below the visible area.
  useEffect(() => {
    if (!tutorialMode) return;
    registerScrollView('create_food_scroll', scrollViewRef as any);
    return () => unregisterScrollView('create_food_scroll');
  }, [tutorialMode]);

  // Register expandOptionalSection action -- fired on NEXT from the calories step. Nutrient
  // sections are always visible now (no reveal-toggle to expand), so this just scrolls the
  // Macros section into a tutorial-friendly position: park the zero-size anchor marker (where
  // the old toggle used to sit) in the lower-middle of the screen so the macros step's tip
  // card lands up top, above the box, with the fields visible below it.
  useEffect(() => {
    if (!tutorialMode) return;
    const expandOptionalSection = async () => {
      const sv = scrollViewRef.current as any;
      const anchor = optionalToggleRef.current as any;
      if (sv && anchor) {
        await new Promise<void>(resolve => {
          anchor.measureLayout(
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
        setThiamin(prefill.thiamin?.toString() || '');
        setRiboflavin(prefill.riboflavin?.toString() || '');
        setNiacin(prefill.niacin?.toString() || '');
        setCholine(prefill.choline?.toString() || '');
        setMagnesium(prefill.magnesium?.toString() || '');
        setZinc(prefill.zinc?.toString() || '');
        setCopper(prefill.copper?.toString() || '');
        setCaffeine(prefill.caffeine?.toString() || '');
        setServingGrams(prefill.servingGrams?.toString() || '');
        setServingLabel(prefill.servingLabel || '');
        setServingUnitType(prefill.servingUnitType || 'g');
        setServingEntryUnit(prefill.servingUnitType || 'g');
        setIsSupplementType(prefill.type === 'supplement');
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
    setThiamin(''); setRiboflavin(''); setNiacin(''); setCholine('');
    setMagnesium(''); setZinc(''); setCopper(''); setCaffeine('');
    setServingGrams(''); setServingLabel(''); setServingUnitType('g');
    setAdditionalServings([]);
    setIsSupplementType(false);
    setPendingPhotoUri(null);
    cardScale.setValue(0.95);
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

  const handleScanLabel = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast('Camera access needed', 'Enable camera access to scan a nutrition label', 'error');
        return;
      }
      // allowsEditing gives a crop step before OCR ever sees the photo -- lets the user frame
      // just the label, cutting out background clutter that otherwise pollutes the OCR block
      // list (confirmed during testing: a busy background produces stray text blocks that can
      // interfere with the same-row matching the parser uses).
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setScanningLabel(true);
      const ocr = await ocrRecognizeText(result.assets[0].uri);
      const parsed = parseNutritionLabel(ocr);
      setScannedLabel(parsed);
      setShowScanReview(true);
    } catch (e) {
      showToast('Scan failed', String(e), 'error');
    } finally {
      setScanningLabel(false);
    }
  };

  // Maps the review modal's confirmed values onto this form's individual field setters --
  // never touches a field the label didn't print anything for (rows only contains fields the
  // parser actually found), matching the "never overwrite a field the label didn't have" rule.
  const handleScanConfirm = (fields: Record<string, ScanRowResult>, serving: ScanServingResult, servingsPerContainer: number | null) => {
    const setters: Record<string, (v: string) => void> = {
      calories: setCalories, fat: setFat, saturatedFat: setSaturatedFat, transFat: setTransFat,
      cholesterol: setCholesterol, sodium: setSodium, carbs: setCarbs, fiber: setFiber,
      sugar: setSugar, addedSugars: setAddedSugars, protein: setProtein,
      vitaminA: setVitaminA, vitaminC: setVitaminC, vitaminD: setVitaminD, vitaminE: setVitaminE, vitaminK: setVitaminK,
      vitaminB6: setVitaminB6, folate: setFolate, vitaminB12: setVitaminB12, biotin: setBiotin,
      thiamin: setThiamin, riboflavin: setRiboflavin, niacin: setNiacin, choline: setCholine,
      calcium: setCalcium, iron: setIron, potassium: setPotassium,
      magnesium: setMagnesium, zinc: setZinc, copper: setCopper,
    };
    for (const [key, row] of Object.entries(fields)) {
      if (row.value !== null && setters[key]) setters[key](String(row.value));
    }
    // The serving comes back in whatever unit the user confirmed (fl oz, cup, g...). Convert to that
    // family's canonical base -- what all nutrition math runs on -- and keep the confirmed unit as the
    // display preference, so a "16 fl oz" label stays a 16 fl oz food instead of becoming 473 mL.
    const base = unitGroup(serving.unit || 'g') === 'volume' ? 'ml' : 'g';
    const canonical = serving.amount != null
      ? (convertUnit(serving.amount, serving.unit || base, base) ?? serving.amount)
      : null;
    if (canonical !== null) {
      setServingGrams(String(Math.round(canonical * 100) / 100));
      setServingUnitType(base);
      setServingEntryUnit(serving.unit && unitGroup(serving.unit) ? serving.unit : base);
    }
    if (serving.name) setServingLabel(serving.name);

    // "1 Container" auto-added as an Additional Serving using the label's own printed
    // servings-per-container count -- skipped at exactly 1 (identical to the primary serving
    // already filling the form, nothing new to offer). Re-scanning replaces the prior auto-added
    // container row instead of stacking a duplicate, while leaving any manually-added rows alone.
    if (servingsPerContainer !== null && servingsPerContainer > 1 && canonical !== null) {
      const containerAmount = Math.round(canonical * servingsPerContainer * 10) / 10;
      setAdditionalServings(prev => [
        ...prev.filter(s => !s.id.startsWith('as_container_')),
        { id: `as_container_${Date.now()}`, label: '1 Container', grams: String(containerAmount) },
      ]);
    }

    showToast('Label scanned', 'Review the fields and save when ready', 'success');
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
        ...(thiamin ? { thiamin: parseFloat(thiamin) } : {}),
        ...(riboflavin ? { riboflavin: parseFloat(riboflavin) } : {}),
        ...(niacin ? { niacin: parseFloat(niacin) } : {}),
        ...(choline ? { choline: parseFloat(choline) } : {}),
        ...(magnesium ? { magnesium: parseFloat(magnesium) } : {}),
        ...(zinc ? { zinc: parseFloat(zinc) } : {}),
        ...(copper ? { copper: parseFloat(copper) } : {}),
        ...(caffeine ? { caffeine: parseFloat(caffeine) } : {}),
        servingSize: grams,
        servingUnitType: servingUnitType,
        // The unit this food was BUILT in -- display only, never math. Someone who typed "1 cup" gets
        // greeted with "1 Cup" everywhere instead of the canonical 236.59 mL. Only stored when it's a
        // real unit in the same family as the base, so it can never disagree with the stored number.
        ...(unitGroup(servingEntryUnit) === unitGroup(servingUnitType) ? { servingDisplayUnit: servingEntryUnit } : {}),
        servingUnit: servingLabel.trim() || `${grams}${unitLabel(servingUnitType)}`,
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
          { nutrientName: 'Thiamin',                      unitName: 'MG',  value: parseFloat(thiamin) || 0 },
          { nutrientName: 'Riboflavin',                   unitName: 'MG',  value: parseFloat(riboflavin) || 0 },
          { nutrientName: 'Niacin',                       unitName: 'MG',  value: parseFloat(niacin) || 0 },
          { nutrientName: 'Choline',                      unitName: 'MG',  value: parseFloat(choline) || 0 },
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
          // Upload to Firebase Storage at creation so the photo survives a reinstall
          // (storing the cloud URL, falling back to the local path if offline / not
          // signed in -- the next food-detail view backfills it). Mirrors food-detail.
          const { url } = await uploadFoodPhoto(id, destUri);
          await AsyncStorage.setItem(`pj_food_photo_${id}`, url || destUri);
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
  const cardMaxHeight = Dimensions.get('window').height * 0.78;
  // +44 = scrollContent's own padding (top 20 + bottom 24), which onLayout on the content
  // wrapper doesn't include since that's the PARENT ScrollView's padding, not the child's own size.
  const cardHeight = Math.min(headerHeight + contentHeight + 44, cardMaxHeight);

  const cardContent = (
    <Animated.View ref={cardRef as any} style={[s.card, { height: cardHeight, transform: [{ scale: cardScale }] }]}>
      <View onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
        <ModalHeader title={title || 'Create Food'} onClose={handleClose} />
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        <View onLayout={e => setContentHeight(e.nativeEvent.layout.height)}>
        <Text style={s.requiredNote}>* Required</Text>

        {/* Type selector */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              setIsSupplementType(false);
              // A supplement-only unit (capsule, pill, etc.) has no home in Food's weight/volume
              // picker -- fall back to grams; keep the entry display unit in sync with the base.
              const foodBase = SUPPLEMENT_ONLY_UNITS.includes(servingUnitType) ? 'g' : servingUnitType;
              setServingUnitType(foodBase);
              setServingEntryUnit(foodBase);
              setServingDraft(undefined);
            }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: !isSupplementType ? theme.accentBlueBg : theme.bgInput, borderColor: !isSupplementType ? theme.accentBlueBorder : theme.borderInput }}
          >
            <GradientIcon name="nutrition" size={18} color={!isSupplementType ? theme.accentBlue : theme.textMuted} />
            <GradientNumber value="Food" color={!isSupplementType ? theme.accentBlue : theme.textMuted} style={{ fontSize: 13, fontFamily: Type.uiSemibold, marginTop: 4 }} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setIsSupplementType(true); }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, backgroundColor: isSupplementType ? theme.accentBlueBg : theme.bgInput, borderColor: isSupplementType ? theme.accentBlueBorder : theme.borderInput }}
          >
            <GradientIcon name="medical" size={18} color={isSupplementType ? theme.accentBlue : theme.textMuted} />
            <GradientNumber value="Supplement" color={isSupplementType ? theme.accentBlue : theme.textMuted} style={{ fontSize: 13, fontFamily: Type.uiSemibold, marginTop: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Basic Info box */}
        <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Basic Info</Text>
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
          <View style={[s.fieldRow, { marginBottom: 0 }]}>
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
        </View>

        {/* Scan a real Nutrition Facts panel to autofill the fields below -- fast path to correct
            a FatSecret entry that's slightly off, or skip typing everything from a box by hand. */}
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleScanLabel(); }}
          disabled={scanningLabel}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 10, paddingVertical: 12, marginBottom: 10, opacity: scanningLabel ? 0.6 : 1 }}
        >
          <Ionicons name="scan-outline" size={18} color={theme.accentBlue} />
          <Text style={{ fontSize: 14, fontFamily: Type.uiSemibold, color: theme.accentBlue }}>{scanningLabel ? 'Reading Label...' : 'Scan Nutrition Label'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginBottom: 10, textAlign: 'center' }}>
          Tip: get as close as you can while keeping the whole label in frame.
        </Text>

        {/* Serving box -- Calories lives here too, spotlit as one unit by tutorial step 3 */}
        <View ref={caloriesSectionRef as any} style={{ backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 0.5, borderColor: theme.borderCard, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontFamily: Type.uiBold, color: theme.textPrimary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Serving</Text>
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
              <Text style={s.fieldLabel}>Serving</Text>
              {isSupplementType ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="100"
                    placeholderTextColor={theme.textPlaceholder}
                    value={servingGrams}
                    onChangeText={setServingGrams}
                    keyboardType="decimal-pad"
                  />
                  <UnitPickerButton value={servingUnitType} options={SUPPLEMENT_UNIT_OPTIONS} onChange={setServingUnitType} minWidth={60} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="100"
                    placeholderTextColor={theme.textPlaceholder}
                    value={servingEntryUnit === servingUnitType ? servingGrams : (servingDraft !== undefined ? servingDraft : (servingGrams ? String(Math.round(((convertUnit(parseFloat(servingGrams), servingUnitType, servingEntryUnit) ?? 0)) * 100) / 100) : ''))}
                    onChangeText={v => {
                      const stripped = v.replace(/[^0-9.]/g, '');
                      if (servingEntryUnit === servingUnitType) setServingGrams(stripped);
                      else setServingDraft(stripped);
                    }}
                    onBlur={() => {
                      if (servingEntryUnit === servingUnitType || servingDraft === undefined) return;
                      const typed = parseFloat(servingDraft);
                      const canonical = !isNaN(typed) ? convertUnit(typed, servingEntryUnit, servingUnitType) : null;
                      if (canonical !== null) setServingGrams(String(Math.round(canonical * 100) / 100));
                      setServingDraft(undefined);
                    }}
                    keyboardType="decimal-pad"
                  />
                  <UnitPickerButton
                    value={servingEntryUnit}
                    options={ALL_ENTRY_UNITS}
                    twoColumn
                    onChange={u => {
                      const newBase = unitGroup(u) === 'volume' ? 'ml' : 'g';
                      if (newBase === servingUnitType) { setServingEntryUnit(u); setServingDraft(undefined); return; }
                      // Cross-family switch (weight <-> volume): can't convert without density -- keep the
                      // number shown and reinterpret it in the newly picked unit, flipping the canonical base.
                      const shown = servingEntryUnit === servingUnitType
                        ? servingGrams
                        : (servingDraft !== undefined ? servingDraft : (servingGrams ? String(Math.round(((convertUnit(parseFloat(servingGrams), servingUnitType, servingEntryUnit) ?? 0)) * 100) / 100) : ''));
                      const num = parseFloat(shown);
                      const canonical = !isNaN(num) ? convertUnit(num, u, newBase) : null;
                      setServingUnitType(newBase);
                      setServingGrams(canonical !== null ? String(Math.round(canonical * 100) / 100) : (shown || ''));
                      setServingEntryUnit(u);
                      setServingDraft(undefined);
                    }}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Serving Name -- one free-text field instead of a separate unit picker + label.
              Purely descriptive (never parsed for math); the Amount field above is always the
              real number, in grams, regardless of what unit was used to type it in. */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Serving Name <Text style={s.unitText}>(optional)</Text></Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 1 scoop, 3 tbsp, 250 mL"
              placeholderTextColor={theme.textPlaceholder}
              value={servingLabel}
              onChangeText={setServingLabel}
            />
          </View>

          {/* Additional Servings -- hidden in tutorialMode to keep save button visible */}
          {!tutorialMode && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 14 }}>
                <Text style={[s.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Additional Servings</Text>
                <TouchableOpacity
                  onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setAdditionalServings(prev => [...prev, { id: `as_${Date.now()}`, label: '', grams: '' }]); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <ButtonShine radius={6} />
                  <Ionicons name="add" size={12} color={theme.accentBlue} />
                  <Text style={{ fontSize: 11, color: theme.accentBlue, fontFamily: Type.uiSemibold }}>Add</Text>
                </TouchableOpacity>
              </View>
              {additionalServings.length === 0 && (
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginBottom: 0 }}>
                  Give this food a few more ways to measure — 3 links, 1 slice, however it's sold.
                </Text>
              )}
              {additionalServings.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  <Text style={[s.fieldLabel, { flex: 1.4, marginBottom: 0 }]}>Serving Label</Text>
                  <Text style={[s.fieldLabel, { flex: 0.8, marginBottom: 0 }]}>Serving ({unitLabel(servingUnitType)})</Text>
                  <View style={{ width: 32 }} />
                </View>
              )}
              {additionalServings.map((sv, i) => {
                const convertibleUnits = convertibleUnitsFor(servingUnitType);
                const rowUnit = additionalServingUnits[sv.id] || servingUnitType;
                const isConverting = rowUnit !== servingUnitType;
                const draft = additionalServingDrafts[sv.id];
                const displayValue = isConverting
                  ? (draft !== undefined ? draft : (sv.grams ? String(Math.round(((convertUnit(parseFloat(sv.grams), servingUnitType, rowUnit) ?? 0)) * 100) / 100) : ''))
                  : sv.grams;
                return (
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
                    placeholder={unitLabel(rowUnit)}
                    placeholderTextColor={theme.textPlaceholder}
                    keyboardType="decimal-pad"
                    value={displayValue}
                    onChangeText={v => {
                      const stripped = v.replace(/[^0-9.]/g, '');
                      if (isConverting) {
                        setAdditionalServingDrafts(prev => ({ ...prev, [sv.id]: stripped }));
                      } else {
                        setAdditionalServings(prev => prev.map((x, j) => j === i ? { ...x, grams: stripped } : x));
                      }
                    }}
                    onBlur={() => {
                      if (!isConverting || draft === undefined) return;
                      const typed = parseFloat(draft);
                      const canonical = !isNaN(typed) ? convertUnit(typed, rowUnit, servingUnitType) : null;
                      if (canonical !== null) {
                        setAdditionalServings(prev => prev.map((x, j) => j === i ? { ...x, grams: String(Math.round(canonical * 100) / 100) } : x));
                      }
                      setAdditionalServingDrafts(prev => { const next = { ...prev }; delete next[sv.id]; return next; });
                    }}
                  />
                  {convertibleUnits.length > 0 && (
                    <UnitPickerButton
                      value={rowUnit}
                      options={convertibleUnits}
                      minWidth={44}
                      onChange={u => {
                        setAdditionalServingUnits(prev => ({ ...prev, [sv.id]: u }));
                        setAdditionalServingDrafts(prev => { const next = { ...prev }; delete next[sv.id]; return next; });
                      }}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      setAdditionalServings(prev => prev.filter((_, j) => j !== i));
                      setAdditionalServingUnits(prev => { const next = { ...prev }; delete next[sv.id]; return next; });
                      setAdditionalServingDrafts(prev => { const next = { ...prev }; delete next[sv.id]; return next; });
                    }}
                    style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.textDim} />
                  </TouchableOpacity>
                </View>
                );
              })}
            </>
          )}
        </View>

        {/* Macros section wrapper -- spotlit as one unit by tutorial step 4. Sections show
            directly now (no reveal-toggle -- it only ever gated visibility, and
            NutrientFieldsGrid's own per-section collapse already covers that need). The
            zero-size marker below keeps the tutorial's existing anchor point (a compact
            target near the top, so its spotlight bubble doesn't drop off-screen the way it
            would if anchored to the full, taller section) without touching tutorials.ts. */}
        <View ref={macrosSectionRef as any}>
          <View ref={optionalToggleRef as any} style={{ height: 1, width: '100%' }} />
          <NutrientFieldsGrid
                sections={[
                  {
                    key: 'macros', title: 'Macros', columns: 3,
                    fields: [
                      { key: 'protein', label: 'Protein', unit: 'g', value: protein, onChange: setProtein, dotColor: '#0d9268' },
                      { key: 'carbs',   label: 'Carbs',   unit: 'g', value: carbs,   onChange: setCarbs,   dotColor: '#c47d1a' },
                      { key: 'fat',     label: 'Fat',     unit: 'g', value: fat,     onChange: setFat,     dotColor: '#a83232' },
                    ],
                  },
                  {
                    key: 'extendedFats', title: 'Extended Fats', columns: 2,
                    fields: [
                      { key: 'saturatedFat',       label: 'Sat. Fat',  unit: 'g', value: saturatedFat,       onChange: setSaturatedFat },
                      { key: 'polyunsaturatedFat', label: 'Poly Fat',  unit: 'g', value: polyunsaturatedFat, onChange: setPolyunsaturatedFat },
                      { key: 'monounsaturatedFat', label: 'Mono Fat',  unit: 'g', value: monounsaturatedFat, onChange: setMonounsaturatedFat },
                      { key: 'transFat',           label: 'Trans Fat', unit: 'g', value: transFat,           onChange: setTransFat },
                    ],
                  },
                  {
                    key: 'otherNutrients', title: 'Other Nutrients', columns: 2,
                    fields: [
                      { key: 'fiber',         label: 'Fiber',         unit: 'g',  value: fiber,         onChange: setFiber },
                      { key: 'sugar',         label: 'Sugar',         unit: 'g',  value: sugar,         onChange: setSugar },
                      { key: 'sugarAlcohols', label: 'Sugar Alc.',    unit: 'g',  value: sugarAlcohols, onChange: setSugarAlcohols },
                      { key: 'addedSugars',   label: 'Added Sugars',  unit: 'g',  value: addedSugars,   onChange: setAddedSugars },
                      { key: 'sodium',        label: 'Sodium',        unit: 'mg', value: sodium,        onChange: setSodium },
                      { key: 'cholesterol',   label: 'Chol.',         unit: 'mg', value: cholesterol,   onChange: setCholesterol },
                      { key: 'potassium',     label: 'Potassium',     unit: 'mg', value: potassium,     onChange: setPotassium },
                    ],
                  },
                  {
                    key: 'vitamins', title: 'Vitamins', columns: 2,
                    fields: [
                      { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', value: vitaminA, onChange: setVitaminA },
                      { key: 'vitaminC', label: 'Vitamin C', unit: 'mg',  value: vitaminC, onChange: setVitaminC },
                      { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', value: vitaminD, onChange: setVitaminD },
                      { key: 'vitaminE', label: 'Vitamin E', unit: 'mg',  value: vitaminE, onChange: setVitaminE },
                      { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', value: vitaminK, onChange: setVitaminK },
                    ],
                  },
                  {
                    key: 'bVitamins', title: 'B Vitamins', columns: 2,
                    fields: [
                      { key: 'vitaminB6',  label: 'B6',         unit: 'mg',  value: vitaminB6,  onChange: setVitaminB6 },
                      { key: 'folate',     label: 'Folate',     unit: 'mcg', value: folate,     onChange: setFolate },
                      { key: 'vitaminB12', label: 'B12',        unit: 'mcg', value: vitaminB12, onChange: setVitaminB12 },
                      { key: 'biotin',     label: 'Biotin',     unit: 'mcg', value: biotin,     onChange: setBiotin },
                      { key: 'thiamin',    label: 'Thiamin',    unit: 'mg',  value: thiamin,    onChange: setThiamin },
                      { key: 'riboflavin', label: 'Riboflavin', unit: 'mg',  value: riboflavin, onChange: setRiboflavin },
                      { key: 'niacin',     label: 'Niacin',     unit: 'mg',  value: niacin,     onChange: setNiacin },
                      { key: 'choline',    label: 'Choline',    unit: 'mg',  value: choline,    onChange: setCholine },
                    ],
                  },
                  {
                    key: 'minerals', title: 'Minerals', columns: 2,
                    fields: [
                      { key: 'calcium',   label: 'Calcium',   unit: 'mg', value: calcium,   onChange: setCalcium },
                      { key: 'iron',      label: 'Iron',      unit: 'mg', value: iron,      onChange: setIron },
                      { key: 'magnesium', label: 'Magnesium', unit: 'mg', value: magnesium, onChange: setMagnesium },
                      { key: 'zinc',      label: 'Zinc',      unit: 'mg', value: zinc,      onChange: setZinc },
                      { key: 'copper',    label: 'Copper',    unit: 'mg', value: copper,    onChange: setCopper },
                    ],
                  },
                  {
                    key: 'other', title: 'Other', columns: 2,
                    fields: [
                      { key: 'caffeine', label: 'Caffeine', unit: 'mg', value: caffeine, onChange: setCaffeine },
                    ],
                  },
                ]}
              />
        </View>

        {/* Reserved space so the floating Cancel/Save bar below never covers the last real
            field, whether or not the bar is currently showing -- keeps the card's own height
            calculation independent of hasChanges. */}
        <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* Cancel/Save bar -- always visible, pinned to the bottom of the card. Save dims via the
          existing canSave check (Name + Calories filled); no separate show/hide animation, since
          a form with its own required-fields gate made "pop up on any change" read as broken --
          it could appear while still being unusable if the required fields weren't done yet. */}
      <View
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
          borderTopWidth: 0.5, borderTopColor: theme.borderCard,
          backgroundColor: theme.bgSheet,
          flexDirection: 'row', gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); handleClose(); }}
          style={{ backgroundColor: theme.bgInput, borderWidth: 0.5, borderColor: theme.borderInput, borderRadius: 13, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' }}
        >
          <Text numberOfLines={1} style={{ fontSize: 15, fontFamily: Type.uiBold, letterSpacing: 0.2, color: theme.textMuted }}>Cancel</Text>
        </TouchableOpacity>
        <View ref={saveBtnRef as any} collapsable={false} style={{ flex: 1 }}>
          <PrimaryCTA
            label="Save Food"
            onPress={handleSave}
            busy={saving}
            disabled={!canSave}
          />
        </View>
      </View>
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
  // The scan review screen renders INSIDE this same Modal (swapped in place of cardContent)
  // rather than as a second stacked Modal -- two native Modals open at once caused a stuck,
  // invisible layer on iOS that silently ate touches on the screen underneath once closed.
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            if (showScanReview) setShowScanReview(false); else handleClose();
          }}
        />
        {showScanReview && scannedLabel ? (
          <LabelScanReviewModal
            parsed={scannedLabel}
            onConfirm={handleScanConfirm}
            onClose={() => setShowScanReview(false)}
            onRetake={() => { setShowScanReview(false); handleScanLabel(); }}
          />
        ) : cardContent}
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
    maxHeight: Dimensions.get('window').height * 0.78,
    overflow: 'hidden',
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
  title: { fontSize: 19, color: theme.accentBlueRaw, fontFamily: Type.display, letterSpacing: -0.2 },
  closeBtn: { padding: 4 },
  scroll: {},
  scrollContent: { padding: 20, paddingBottom: 24, flexGrow: 0 },
  sectionLabel: { fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: theme.textMuted, fontFamily: Type.uiBold, marginBottom: 10 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: theme.textSecondary, fontFamily: Type.uiMedium, marginBottom: 5 },
  unitText: { color: theme.textMuted, fontSize: 11 },
  requiredStar: { color: theme.accentRed || '#cc3333', fontSize: 12 },
  requiredNote: { fontSize: 10, color: theme.accentRed || '#cc3333', fontFamily: Type.ui, marginBottom: 12 },
  input: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: Type.ui },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // saveBtn / saveBtnDim / saveBtnText removed 2026-07-15: Save Food is PrimaryCTA now, which owns the
  // fill, mould, label face, disabled dim and busy spinner.
});
