import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput } from '@/components/AppText';
import { Ionicons } from '@/components/AppIcons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '@/utils/haptics';
import { useCallback, useRef, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Animated, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import * as ImagePicker from 'expo-image-picker';
import CustomFoodCreator from '../components/CustomFoodCreator';
import CapWallModal from '../components/CapWallModal';
import { GOLD_BASE } from '../components/SupporterFoil';
import { useMembership } from '../MembershipContext';
import { checkCap, capFor, creationCountLine, toastLineWithCount, type CapState } from '../utils/caps';
import GradientNumber from '../components/GradientNumber';
import { useToast, ToastRenderer } from '../components/Toast';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { uploadRecipePhoto, resolveRecipePhoto, purgeRecipePhoto, recipePhotoKey } from '../utils/recipePhotos';
import { useTheme } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';
import { Type, PAGE_TITLE } from '../typography';
import ScreenHeader from '../components/ScreenHeader';
import PrimaryCTA from '../components/PrimaryCTA';
import ButtonShine from '../components/ButtonShine';
import BackgroundLayers from '../components/BackgroundLayers';
import UnitPickerButton from '../components/UnitPickerButton';
import ModalHeader from '../components/ModalHeader';
import { convertUnit, convertibleUnitsFor, normalizeUnitKey, unitGroup, unitLabel } from '../utils/unitConversion';

interface Ingredient {
  id: string;
  name: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
  saturatedFat?: number;
  polyunsaturatedFat?: number;
  monounsaturatedFat?: number;
  addedSugars?: number;
  transFat?: number;
  vitaminA?: number;
  vitaminC?: number;
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
  amount: number;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  totalWeight: number;
  totalWeightUnit: string;
  servingCount: number;
  servingName: string;
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  totalCholesterol?: number;
  totalSaturatedFat?: number;
  totalPolyFat?: number;
  totalMonoFat?: number;
  totalAddedSugars?: number;
  totalTransFat?: number;
  totalVitaminA?: number;
  totalVitaminC?: number;
  totalVitaminD?: number;
  totalVitaminE?: number;
  totalVitaminK?: number;
  totalVitaminB6?: number;
  totalFolate?: number;
  totalVitaminB12?: number;
  totalBiotin?: number;
  totalThiamin?: number;
  totalRiboflavin?: number;
  totalNiacin?: number;
  totalCholine?: number;
  totalMagnesium?: number;
  totalZinc?: number;
  totalCopper?: number;
  totalCaffeine?: number;
  createdAt: number;
  defaultToWeight?: boolean;
}

const makeId = () => Math.random().toString(36).substr(2, 9);
const WEIGHT_ENTRY_UNITS = ['g', 'kg', 'oz', 'lb'];
const VOLUME_ENTRY_UNITS = ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'];
const ALL_ENTRY_UNITS = [...WEIGHT_ENTRY_UNITS, ...VOLUME_ENTRY_UNITS];
// Recipes built before the serving-unit redesign saved their own dialect ("lbs", "cups") from a
// hand-rolled picker. normalizeUnitKey reads those as the app-wide keys (shared with recipe-log so
// the two screens can't drift); nothing is rewritten on disk until the recipe is saved again.
const normalizeUnit = normalizeUnitKey;

const filterDecimal = (v: string, set: (s: string) => void) => {
  const stripped = v.replace(/[^0-9.]/g, '');
  const dot = stripped.indexOf('.');
  if (dot === -1) { set(stripped); }
  else {
    const before = stripped.slice(0, dot);
    const after = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 1);
    set(before + '.' + after);
  }
};

export default function RecipeBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { activeState, registerTutorialAction, unregisterTutorialAction, registerScrollView, unregisterScrollView } = useTutorial();
  const isTutorialMode = activeState?.tutorial.id === 'recipes';
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();

  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalWeight, setTotalWeight] = useState('');
  const [totalWeightUnit, setTotalWeightUnit] = useState('g');
  const [servingCount, setServingCount] = useState('');
  const [servingName, setServingName] = useState('');
  const [defaultToWeight, setDefaultToWeight] = useState(false);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  // ── Custom-food cap (item C). Read on mount and again after a food is created here, since creating one
  // spends a slot and could be the one that reaches the cap.
  const { isSupporter, loading: membershipLoading } = useMembership();
  const [foodCap, setFoodCap] = useState<CapState>({ cap: null, count: 0, unlimited: true, atCap: false, canCreate: true });
  const [foodCapWall, setFoodCapWall] = useState(false);
  // photoUri = an existing recipe's already-uploaded photo (editing). pendingPhotoUri = a photo
  // picked before the recipe has an id yet (new recipe); it's copied + uploaded once saveRecipe()
  // creates the id, mirroring CustomFoodCreator's pending-photo pattern for new foods.
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [showPhotoFullscreen, setShowPhotoFullscreen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tutorialStateRef = useRef<any>({});

  // Tutorial spotlight refs
  const nameInputRef = useTutorialTarget('recipe_name_input');
  const addRowRef = useTutorialTarget('recipe_add_ingredient_row');
  const ingredientsCardRef = useTutorialTarget('recipe_ingredients_card');
  const ingredientRowRef = useTutorialTarget('recipe_ingredient_row');
  const totalsCardRef = useTutorialTarget('recipe_totals_card');
  const servingsCardRef = useTutorialTarget('recipe_servings_card');
  const saveBtnRef = useTutorialTarget('recipe_save_btn');

  // ── Ingredient amount editor ──────────────────────────────────────────────────────────────────
  // Every nutrient on an ingredient is a straight linear multiple of its amount (that's how they were
  // computed when it was added), so changing 235g to 335g is an exact rescale, never an estimate.
  // calPer100g and friends are RATES, not totals -- they are deliberately not in this list.
  const INGREDIENT_NUTRIENT_KEYS = [
    'cal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol', 'saturatedFat',
    'polyunsaturatedFat', 'monounsaturatedFat', 'addedSugars', 'transFat', 'vitaminA', 'vitaminC',
    'vitaminD', 'vitaminE', 'vitaminK', 'vitaminB6', 'folate', 'vitaminB12', 'biotin', 'thiamin',
    'riboflavin', 'niacin', 'choline', 'magnesium', 'zinc', 'copper', 'caffeine',
  ];
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingAmountDraft, setIngAmountDraft] = useState('');
  const [ingUnit, setIngUnit] = useState('g');
  const ingModalAnim = useRef(new Animated.Value(0)).current;

  const openAmountEditor = (ing: Ingredient) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIngAmountDraft(String(ing.amount));
    setIngUnit(normalizeUnit(ing.unit));
    setEditingIngredient(ing);
  };
  const closeAmountEditor = (after?: () => void) => {
    Animated.timing(ingModalAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setEditingIngredient(null);
      after?.();
    });
  };
  // Same-family units only. An existing ingredient can't jump from grams to cups -- that needs the
  // food's density, and this screen will not invent one.
  const changeIngUnit = (u: string) => {
    const typed = parseFloat(ingAmountDraft);
    if (!isNaN(typed)) {
      const converted = convertUnit(typed, ingUnit, u);
      if (converted !== null) setIngAmountDraft(String(Math.round(converted * 100) / 100));
    }
    setIngUnit(u);
  };
  const ingEditTyped = parseFloat(ingAmountDraft);
  const ingEditValid = !isNaN(ingEditTyped) && ingEditTyped > 0 &&
    !(editingIngredient && ingUnit === normalizeUnit(editingIngredient.unit) && ingEditTyped === editingIngredient.amount);

  const saveAmountEdit = () => {
    if (!editingIngredient || !ingEditValid) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const target = editingIngredient;
    const oldUnit = normalizeUnit(target.unit);
    // Express the new amount in the ingredient's existing unit so the ratio is apples to apples.
    const newInOldUnit = ingUnit === oldUnit ? ingEditTyped : (convertUnit(ingEditTyped, ingUnit, oldUnit) ?? ingEditTyped);
    const ratio = target.amount > 0 ? newInOldUnit / target.amount : 1;
    setIngredients(prev => prev.map(i => {
      if (i.id !== target.id) return i;
      const scaled: any = { ...i, amount: Math.round(ingEditTyped * 100) / 100, unit: ingUnit };
      INGREDIENT_NUTRIENT_KEYS.forEach(k => {
        const v = (i as any)[k];
        if (typeof v !== 'number') return;
        scaled[k] = k === 'cal' ? Math.round(v * ratio) : Math.round(v * ratio * 10) / 10;
      });
      return scaled as Ingredient;
    }));
    closeAmountEditor(() => showToast('Ingredient updated', target.name, 'success'));
  };

  // Switching the finished-weight unit: inside one family the number converts (2000 g -> 70.55 oz, the
  // batch is the same size either way). Weight <-> volume can't convert without density, so the number
  // is left alone and only the unit changes -- the recipe's nutrition comes from its ingredients, this
  // field is just how big the finished batch is, so nothing is corrupted either way.
  const changeTotalWeightUnit = (u: string) => {
    const current = normalizeUnit(totalWeightUnit);
    if (u === current) return;
    const typed = parseFloat(totalWeight);
    if (unitGroup(u) === unitGroup(current) && !isNaN(typed)) {
      const converted = convertUnit(typed, current, u);
      if (converted !== null) setTotalWeight(String(Math.round(converted * 100) / 100));
    }
    setTotalWeightUnit(u);
  };

  useEffect(() => {
    if (recipeId) loadExistingRecipe();
  }, []);

  // Inject demo ingredients when the recipes tutorial is active
  useEffect(() => {
    if (isTutorialMode && !recipeId) {
      setRecipeName('Chicken Bowl');
      setServingCount('4');
      setIngredients([
        { id: 'demo_1', name: 'Chicken Breast', cal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, cholesterol: 85, saturatedFat: 1, amount: 100, unit: 'g' },
        { id: 'demo_2', name: 'Brown Rice', cal: 216, protein: 4, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0, sodium: 10, cholesterol: 0, saturatedFat: 0, amount: 100, unit: 'g' },
        { id: 'demo_3', name: 'Olive Oil', cal: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 1.9, amount: 14, unit: 'g' },
      ]);
    }
  }, [isTutorialMode]);

  // Keep tutorialStateRef current so action callbacks always read latest values
  useEffect(() => {
    tutorialStateRef.current = {
      recipeName, ingredients, totalWeight, totalWeightUnit, servings, servingName,
      totalCal, totalProtein, totalCarbs, totalFat, totalFiber, totalSugar,
      totalSodium, totalCholesterol, totalSaturatedFat,
    };
  });

  // Register scroll view + tutorial actions on mount
  useEffect(() => {
    registerScrollView('recipe_builder_scroll', scrollViewRef);
    registerTutorialAction('saveTutorialRecipe', async () => {
      const s = tutorialStateRef.current;
      const tutorialRecipe = {
        id: 'tutorial_recipe_temp',
        name: s.recipeName?.trim() || 'Demo Chicken Bowl',
        ingredients: s.ingredients || [],
        totalWeight: parseFloat(s.totalWeight) || 0,
        totalWeightUnit: normalizeUnit(s.totalWeightUnit),
        servingCount: s.servings || 4,
        servingName: s.servingName || 'serving',
        totalCal: s.totalCal || 0,
        totalProtein: s.totalProtein || 0,
        totalCarbs: s.totalCarbs || 0,
        totalFat: s.totalFat || 0,
        totalFiber: s.totalFiber || 0,
        totalSugar: s.totalSugar || 0,
        totalSodium: s.totalSodium || 0,
        totalCholesterol: s.totalCholesterol || 0,
        totalSaturatedFat: s.totalSaturatedFat || 0,
        createdAt: Date.now(),
        tutorialRecipe: true,
      };
      try {
        const saved = await AsyncStorage.getItem('pj_recipes');
        const existing = saved ? JSON.parse(saved) : [];
        const cleaned = existing.filter((r: any) => !r.tutorialRecipe);
        await storageSet('pj_recipes', JSON.stringify([...cleaned, tutorialRecipe]));
      } catch {}
      // Pop recipe-builder out of the nav stack so the user never lands back here
      // after the tutorial ends. Step 8's navigateTo fires after this resolves.
      if (router.canGoBack()) router.back();
    });
    registerTutorialAction('closeRecipeTutorial', async () => {
      if (router.canGoBack()) router.back();
    });
    return () => {
      unregisterScrollView('recipe_builder_scroll');
      unregisterTutorialAction('saveTutorialRecipe');
      unregisterTutorialAction('closeRecipeTutorial');
    };
  }, []);

  // First focus = the builder just opened. Any ingredient sitting in the shared hand-off slot is a
  // leftover from a PREVIOUS, abandoned session (a valid one is only ever written AFTER this builder is
  // already open, i.e. on a later focus), so discard it on open instead of silently attaching an orphan
  // to this recipe. Subsequent focuses consume the ingredient the user just added.
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const checkPendingIngredient = async () => {
        try {
          if (!hasFocusedRef.current) {
            hasFocusedRef.current = true;
            await AsyncStorage.removeItem('pj_pending_ingredient');
            return;
          }
          const pending = await AsyncStorage.getItem('pj_pending_ingredient');
          if (pending) {
            const ingredient = JSON.parse(pending);
            setIngredients(prev => [...prev, ingredient]);
            await AsyncStorage.removeItem('pj_pending_ingredient');
          }
        } catch (e) {}
      };
      checkPendingIngredient();
    }, [])
  );

  const loadExistingRecipe = async () => {
    try {
      const saved = await AsyncStorage.getItem('pj_recipes');
      if (saved) {
        const recipes = JSON.parse(saved);
        const recipe = recipes.find((r: Recipe) => r.id === recipeId);
        if (recipe) {
          setRecipeName(recipe.name);
          setIngredients(recipe.ingredients);
          setTotalWeight(recipe.totalWeight.toString());
          setTotalWeightUnit(normalizeUnit(recipe.totalWeightUnit));
          setServingCount(recipe.servingCount === 0 ? '' : recipe.servingCount.toString());
          setServingName(recipe.servingName);
          setDefaultToWeight(recipe.defaultToWeight || false);
          resolveRecipePhoto(recipe.id).then(uri => { if (uri) setPhotoUri(uri); });
        }
      }
    } catch (e) {}
  };

  const currentPhotoUri = pendingPhotoUri || photoUri;

  const handlePhotoRemove = () => {
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (recipeId) await purgeRecipePhoto(recipeId);
          setPhotoUri(null);
          setPendingPhotoUri(null);
          setShowPhotoFullscreen(false);
          showToast('Photo removed', undefined, 'success');
        },
      },
    ]);
  };

  const saveExistingPhoto = async (id: string, sourceUri: string) => {
    try {
      const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const photoDir = new Directory(Paths.document, 'recipe_photos');
      if (!photoDir.exists) photoDir.create();
      const destUri = `${photoDir.uri}${safeId}.jpg`;
      const destFile = new FSFile(destUri);
      if (destFile.exists) destFile.delete();
      const srcFile = new FSFile(sourceUri);
      srcFile.copy(destFile);
      setPhotoUri(destUri);
      setShowPhotoFullscreen(false);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      showToast('Photo saved', undefined, 'success');
      const { url } = await uploadRecipePhoto(id, destUri);
      await AsyncStorage.setItem(recipePhotoKey(id), url || destUri);
    } catch (e: any) {
      showToast('Photo save failed', e?.message || 'Please try again', 'error');
    }
  };

  const handlePhotoAdd = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
      (buttonIndex) => {
        if (buttonIndex === 2) return;
        (async () => {
          try {
            let result: ImagePicker.ImagePickerResult;
            if (buttonIndex === 0) {
              result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
            } else {
              result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
            }
            if (result.canceled) return;
            if (recipeId) {
              await saveExistingPhoto(recipeId, result.assets[0].uri);
            } else {
              setPendingPhotoUri(result.assets[0].uri);
            }
          } catch {
            showToast('Photo failed', 'Unable to access camera or library', 'error');
          }
        })();
      }
    );
  };

  // ITEM C: refresh the count on mount, and re-read after each creation here so the button locks on the one
  // that actually reaches the cap rather than a build later.
  useEffect(() => {
    checkCap('foods', isSupporter, membershipLoading).then(setFoodCap).catch(() => {});
  }, [isSupporter, membershipLoading]);

  const onCreateCustomFoodPress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (!foodCap.canCreate) { setFoodCapWall(true); return; }
    setShowCustomFoodModal(true);
  };

  const handleCustomFoodSaved = (food: any) => {
    checkCap('foods', isSupporter, membershipLoading).then(setFoodCap).catch(() => {});
    const ingredient: Ingredient = {
      id: makeId(),
      name: food.name,
      cal: food.cal || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
      sugar: food.sugar || 0,
      sodium: food.sodium || 0,
      cholesterol: food.cholesterol || 0,
      saturatedFat: food.saturatedFat || 0,
      ...(food.polyunsaturatedFat  ? { polyunsaturatedFat:  food.polyunsaturatedFat  } : {}),
      ...(food.monounsaturatedFat  ? { monounsaturatedFat:  food.monounsaturatedFat  } : {}),
      ...(food.addedSugars         ? { addedSugars:         food.addedSugars         } : {}),
      ...(food.transFat            ? { transFat:            food.transFat            } : {}),
      ...(food.vitaminA            ? { vitaminA:            food.vitaminA            } : {}),
      ...(food.vitaminC            ? { vitaminC:            food.vitaminC            } : {}),
      ...(food.vitaminD            ? { vitaminD:            food.vitaminD            } : {}),
      ...(food.vitaminE            ? { vitaminE:            food.vitaminE            } : {}),
      ...(food.vitaminK            ? { vitaminK:            food.vitaminK            } : {}),
      ...(food.vitaminB6           ? { vitaminB6:           food.vitaminB6           } : {}),
      ...(food.folate              ? { folate:              food.folate              } : {}),
      ...(food.vitaminB12          ? { vitaminB12:          food.vitaminB12          } : {}),
      ...(food.biotin              ? { biotin:              food.biotin              } : {}),
      ...(food.thiamin             ? { thiamin:             food.thiamin             } : {}),
      ...(food.riboflavin          ? { riboflavin:          food.riboflavin          } : {}),
      ...(food.niacin              ? { niacin:              food.niacin              } : {}),
      ...(food.choline             ? { choline:             food.choline             } : {}),
      ...(food.magnesium           ? { magnesium:           food.magnesium           } : {}),
      ...(food.zinc                ? { zinc:                food.zinc                } : {}),
      ...(food.copper              ? { copper:              food.copper              } : {}),
      ...(food.caffeine            ? { caffeine:            food.caffeine            } : {}),
      amount: food.servingSize || 100,
      // servingUnit is the free-text Serving NAME ("1 scoop"), not a unit -- the ingredient row needs
      // the food's actual base unit or it renders things like "240 1 cup".
      unit: normalizeUnit(food.servingUnitType),
    };
    setIngredients(prev => [...prev, ingredient]);
  };

  const removeIngredient = (id: string) => {
    const ing = ingredients.find(i => i.id === id);
    Alert.alert(
      'Remove Ingredient',
      `Remove ${ing?.name ?? 'this ingredient'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          setIngredients(prev => prev.filter(i => i.id !== id));
        }},
      ]
    );
  };

  const totalCal = ingredients.reduce((s, i) => s + i.cal, 0);
  const totalProtein = Math.round(ingredients.reduce((s, i) => s + i.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(ingredients.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
  const totalFat = Math.round(ingredients.reduce((s, i) => s + i.fat, 0) * 10) / 10;
  const totalFiber = Math.round(ingredients.reduce((s, i) => s + (i.fiber || 0), 0) * 10) / 10;
  const totalSugar = Math.round(ingredients.reduce((s, i) => s + (i.sugar || 0), 0) * 10) / 10;
  const totalSodium = Math.round(ingredients.reduce((s, i) => s + (i.sodium || 0), 0));
  const totalCholesterol = Math.round(ingredients.reduce((s, i) => s + (i.cholesterol || 0), 0));
  const totalSaturatedFat = Math.round(ingredients.reduce((s, i) => s + (i.saturatedFat || 0), 0) * 10) / 10;
  const totalPolyFat    = Math.round(ingredients.reduce((s, i) => s + (i.polyunsaturatedFat || 0), 0) * 10) / 10;
  const totalMonoFat    = Math.round(ingredients.reduce((s, i) => s + (i.monounsaturatedFat || 0), 0) * 10) / 10;
  const totalAddedSugars = Math.round(ingredients.reduce((s, i) => s + (i.addedSugars || 0), 0) * 10) / 10;
  const totalTransFat   = Math.round(ingredients.reduce((s, i) => s + (i.transFat || 0), 0) * 10) / 10;
  const totalVitaminA   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminA || 0), 0));
  const totalVitaminC   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminC || 0), 0) * 10) / 10;
  const totalVitaminD   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminD || 0), 0) * 10) / 10;
  const totalVitaminE   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminE || 0), 0) * 10) / 10;
  const totalVitaminK   = Math.round(ingredients.reduce((s, i) => s + (i.vitaminK || 0), 0));
  const totalVitaminB6  = Math.round(ingredients.reduce((s, i) => s + (i.vitaminB6 || 0), 0) * 10) / 10;
  const totalFolate     = Math.round(ingredients.reduce((s, i) => s + (i.folate || 0), 0));
  const totalVitaminB12 = Math.round(ingredients.reduce((s, i) => s + (i.vitaminB12 || 0), 0) * 10) / 10;
  const totalBiotin     = Math.round(ingredients.reduce((s, i) => s + (i.biotin || 0), 0));
  const totalThiamin    = Math.round(ingredients.reduce((s, i) => s + (i.thiamin || 0), 0) * 10) / 10;
  const totalRiboflavin = Math.round(ingredients.reduce((s, i) => s + (i.riboflavin || 0), 0) * 10) / 10;
  const totalNiacin     = Math.round(ingredients.reduce((s, i) => s + (i.niacin || 0), 0) * 10) / 10;
  const totalCholine    = Math.round(ingredients.reduce((s, i) => s + (i.choline || 0), 0) * 10) / 10;
  const totalMagnesium  = Math.round(ingredients.reduce((s, i) => s + (i.magnesium || 0), 0));
  const totalZinc       = Math.round(ingredients.reduce((s, i) => s + (i.zinc || 0), 0) * 10) / 10;
  const totalCopper     = Math.round(ingredients.reduce((s, i) => s + (i.copper || 0), 0) * 10) / 10;
  const totalCaffeine   = Math.round(ingredients.reduce((s, i) => s + (i.caffeine || 0), 0));
  const hasExtended = ingredients.some(i => (i.fiber || 0) + (i.sugar || 0) + (i.sodium || 0) + (i.cholesterol || 0) + (i.saturatedFat || 0) > 0);

  const servings = parseInt(servingCount) || 1;
  const calPerServing = Math.round(totalCal / servings);
  const proteinPerServing = Math.round(totalProtein / servings * 10) / 10;
  const carbsPerServing = Math.round(totalCarbs / servings * 10) / 10;
  const fatPerServing = Math.round(totalFat / servings * 10) / 10;
  const fiberPerServing = Math.round(totalFiber / servings * 10) / 10;
  const sugarPerServing = Math.round(totalSugar / servings * 10) / 10;
  const sodiumPerServing = Math.round(totalSodium / servings);
  const cholesterolPerServing = Math.round(totalCholesterol / servings);
  const saturatedFatPerServing = Math.round(totalSaturatedFat / servings * 10) / 10;

  // Shared extended-nutrition grid: shows every extended nutrient the recipe actually carries
  // (wraps), not a fixed 5. div=1 for whole-batch totals, div=servings for per-serving.
  const renderExtendedGrid = (div: number) => {
    const f = (v: number) => Math.round((v || 0) / div * 10) / 10;
    const exts = [
      { val: f(totalFiber), unit: 'g', label: 'Fiber' },
      { val: f(totalSugar), unit: 'g', label: 'Sugar' },
      { val: f(totalAddedSugars), unit: 'g', label: 'Added Sug.' },
      { val: f(totalSodium), unit: 'mg', label: 'Sodium' },
      { val: f(totalCholesterol), unit: 'mg', label: 'Chol.' },
      { val: f(totalSaturatedFat), unit: 'g', label: 'Sat. Fat' },
      { val: f(totalPolyFat), unit: 'g', label: 'Poly Fat' },
      { val: f(totalMonoFat), unit: 'g', label: 'Mono Fat' },
      { val: f(totalTransFat), unit: 'g', label: 'Trans Fat' },
      { val: f(totalVitaminA), unit: 'mcg', label: 'Vit A' },
      { val: f(totalVitaminC), unit: 'mg', label: 'Vit C' },
      { val: f(totalVitaminD), unit: 'mcg', label: 'Vit D' },
      { val: f(totalVitaminE), unit: 'mg', label: 'Vit E' },
      { val: f(totalVitaminK), unit: 'mcg', label: 'Vit K' },
      { val: f(totalVitaminB6), unit: 'mg', label: 'B6' },
      { val: f(totalFolate), unit: 'mcg', label: 'Folate' },
      { val: f(totalVitaminB12), unit: 'mcg', label: 'B12' },
      { val: f(totalBiotin), unit: 'mcg', label: 'Biotin' },
      { val: f(totalThiamin), unit: 'mg', label: 'Thiamin' },
      { val: f(totalRiboflavin), unit: 'mg', label: 'Riboflavin' },
      { val: f(totalNiacin), unit: 'mg', label: 'Niacin' },
      { val: f(totalCholine), unit: 'mg', label: 'Choline' },
      { val: f(totalMagnesium), unit: 'mg', label: 'Magnesium' },
      { val: f(totalZinc), unit: 'mg', label: 'Zinc' },
      { val: f(totalCopper), unit: 'mg', label: 'Copper' },
      { val: f(totalCaffeine), unit: 'mg', label: 'Caffeine' },
    ].filter(e => e.val > 0);
    if (exts.length === 0) return null;
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: theme.borderSubtle }}>
        {exts.map(e => (
          <View key={e.label} style={{ width: '25%', alignItems: 'center', marginBottom: 12 }}>
            <GradientNumber value={`${e.val}${e.unit}`} color={theme.textSecondary} style={styles.extVal} />
            <Text style={[styles.extLabel, { textAlign: 'center' }]}>{e.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const canSave = recipeName.trim().length > 0 && ingredients.length > 0;

  const saveRecipe = async () => {
    if (!canSave) return;
    if (isTutorialMode) return; // blocked in tutorial -- saveTutorialRecipe action handles it
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const recipe: Recipe = {
        id: recipeId || makeId(),
        name: recipeName.trim(),
        ingredients,
        totalWeight: parseFloat(totalWeight) || 0,
        totalWeightUnit,
        servingCount: parseInt(servingCount) || 0,
        servingName: servingName.trim() || 'serving',
        totalCal,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        totalSugar,
        totalSodium,
        totalCholesterol,
        totalSaturatedFat,
        totalPolyFat,
        totalMonoFat,
        totalAddedSugars,
        totalTransFat,
        totalVitaminA,
        totalVitaminC,
        totalVitaminD,
        totalVitaminE,
        totalVitaminK,
        totalVitaminB6,
        totalFolate,
        totalVitaminB12,
        totalBiotin,
        totalThiamin,
        totalRiboflavin,
        totalNiacin,
        totalCholine,
        totalMagnesium,
        totalZinc,
        totalCopper,
        totalCaffeine,
        createdAt: Date.now(),
        defaultToWeight,
      };
      if (pendingPhotoUri && !recipeId) {
        try {
          const safeId = recipe.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const photoDir = new Directory(Paths.document, 'recipe_photos');
          if (!photoDir.exists) photoDir.create();
          const destUri = `${photoDir.uri}${safeId}.jpg`;
          const destFile = new FSFile(destUri);
          if (destFile.exists) destFile.delete();
          const srcFile = new FSFile(pendingPhotoUri);
          srcFile.copy(destFile);
          // Upload at creation so the photo survives a reinstall, mirrors CustomFoodCreator.
          const { url } = await uploadRecipePhoto(recipe.id, destUri);
          await AsyncStorage.setItem(recipePhotoKey(recipe.id), url || destUri);
        } catch (e) {
          console.log('Recipe photo save error', e);
        }
      }
      const saved = await AsyncStorage.getItem('pj_recipes');
      let recipes = saved ? JSON.parse(saved) : [];
      if (recipeId) {
        recipes = recipes.map((r: Recipe) => r.id === recipeId ? recipe : r);
      } else {
        recipes.push(recipe);
      }
      await storageSet('pj_recipes', JSON.stringify(recipes));
      await saveToFirebase('recipes', 'list', recipes);
      // ⚠️ The count rides on the CREATE branch only -- `recipeId` is set when this builder was opened to
      // edit an existing recipe, and editing one you already own costs nothing. `recipes` is the list this
      // save just wrote, so the number here is the same one the wall and the dim button read.
      // ⚠️ The tutorial never reaches this line: saveRecipe returns early in tutorial mode.
      showToast(
        recipeId ? 'Recipe updated' : 'Recipe saved',
        toastLineWithCount(
          recipeName.trim(),
          recipeId ? null : creationCountLine('recipes', recipes.length, isSupporter, membershipLoading),
        ),
        'success',
      );
      router.back();
    } catch (e) {
      console.log('Save recipe error', e);
    }
  };

  const styles = useStyles(theme);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundLayers />
      {/* Header. The `right` Save is molded + ACCENT (was a flat accentGreen pill): green is success/goal-
          hit, and this saves. It lives in the HEADER, so `compact` keeps the mould at pill scale, and
          faceStyle holds its original padding so the header row height does not move. */}
      <ScreenHeader
        title={recipeId ? 'Edit Recipe' : 'New Recipe'}
        topInset={false}
        right={
          <View ref={saveBtnRef} collapsable={false}>
            <PrimaryCTA
              compact
              faceStyle={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 }}
              label="Save"
              onPress={saveRecipe}
              disabled={!canSave}
            />
          </View>
        }
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>

        {/* Recipe Name */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recipe Name</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View ref={nameInputRef} collapsable={false} style={{ flex: 1 }}>
              <TextInput
                style={styles.recipeNameInput}
                placeholder="e.g. Chicken Stir Fry"
                placeholderTextColor={theme.textDim}
                value={recipeName}
                onChangeText={setRecipeName}
              />
            </View>
            <TouchableOpacity
              onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); currentPhotoUri ? setShowPhotoFullscreen(true) : handlePhotoAdd(); }}
              style={{ width: 64, height: 64 }}
              activeOpacity={0.8}>
              {currentPhotoUri ? (
                <Image source={{ uri: currentPhotoUri }} style={{ width: 64, height: 64, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.textDim, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera-outline" size={24} color={theme.textDim} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Ingredient buttons */}
        <View ref={addRowRef} style={styles.addRow}>
          {/* Both were already the correct tinted recipe -- they just never got the gloss. They sit on the
              PAGE, not a card, so the fill is left as-is only because these are inside a padded scroll over
              a light ground; if they ever read transparent over the glow, accentBlueBgOpaque is the fix. */}
          <TouchableOpacity
            style={styles.addIngredientBtn}
            onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/add-food', params: { meal: 'recipe', date: 'recipe', recipeMode: 'true' } }); }}>
            <ButtonShine radius={10} />
            <Ionicons name="search" size={16} color={theme.accentBlue} />
            <Text style={styles.addIngredientText}>Search Food</Text>
          </TouchableOpacity>
          {/* ⚠️ ITEM C door 5, the last food door. Creating here does TWO jobs: it saves a new custom food AND
              drops it into the recipe as an ingredient, so it spends a cap slot. Safe to lock because
              "Search Food" sits right beside it and still adds any existing food -- the user can always
              finish their recipe. That is the difference between a wall and a dead end.
              ✅ The in-progress recipe survives: this screen holds it in its own state and the wall opens as
              a Modal OVER it, so nothing unmounts and nothing is lost. */}
          <TouchableOpacity
            style={foodCap.canCreate ? styles.addCustomBtn : [styles.addCustomBtn, { backgroundColor: theme.bgInset, borderColor: GOLD_BASE }]}
            onPress={onCreateCustomFoodPress}>
            {foodCap.canCreate && <ButtonShine radius={10} />}
            <Ionicons name={foodCap.canCreate ? 'add' : 'lock-closed'} size={16} color={foodCap.canCreate ? theme.accentBlue : GOLD_BASE} />
            <Text style={foodCap.canCreate ? styles.addCustomText : [styles.addCustomText, { color: theme.textMuted }]}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Ingredients */}
        <View ref={ingredientsCardRef} style={styles.card}>
          <Text style={styles.cardLabel}>Ingredients ({ingredients.length})</Text>
          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={28} color={theme.textDim} />
              <Text style={styles.emptyTitle}>No ingredients yet</Text>
              <Text style={styles.emptySubtitle}>Search for a food or create a custom one above</Text>
            </View>
          ) : (
            ingredients.map((ing, idx) => (
              <View key={ing.id} ref={idx === 0 ? ingredientRowRef : null} style={[styles.ingredientRow, idx < ingredients.length - 1 && styles.ingredientBorder]}>
                {/* Tap the row (not a tiny pencil) to change the amount -- the trash stays its own
                    target so the two can't be confused for each other. */}
                {/* flex-start, matching the row and the trash outside it. Centred, the calories and the
                    pencil floated to the middle of a two-line name while the trash stayed at the top,
                    so one row carried three different vertical alignments. Everything now sits on the
                    name's first line, which is where the eye looks for it. */}
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}
                  activeOpacity={0.7}
                  onPress={() => openAmountEditor(ing)}>
                <View style={styles.ingredientLeft}>
                  <Text style={styles.ingredientName}>{ing.name} ({ing.amount}{unitLabel(ing.unit)})</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroProtein }} />
                      <Text style={styles.ingMacro}>{Number(ing.protein).toFixed(1)}g</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroCarbs }} />
                      <Text style={styles.ingMacro}>{Number(ing.carbs).toFixed(1)}g</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.macroFat }} />
                      <Text style={styles.ingMacro}>{Number(ing.fat).toFixed(1)}g</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start', marginRight: 12 }}>
                  <GradientNumber value={String(ing.cal)} color={theme.accentGreen} style={{ fontSize: 18, fontFamily: Type.num }} />
                  <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, letterSpacing: 1 }}>kcal</Text>
                </View>
                {/* Quiet affordance: without it the row reads as a readout, not a control. Same padding
                    as the trash, and the shared flex-start above keeps the two icons on one line. The
                    2pt nudge sits them against the calorie glyph rather than above it, since the number
                    is taller than they are. */}
                <View style={{ padding: 4, marginRight: 8, marginTop: 2 }}>
                  <Ionicons name="pencil" size={14} color={theme.textDim} />
                </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color={theme.accentRed || '#cc3333'} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Running Totals */}
        {ingredients.length > 0 && (
          <View ref={totalsCardRef} style={styles.card}>
            <Text style={styles.cardLabel}>Total Nutrition</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroStat}>
                <GradientNumber value={String(totalCal)} color={theme.textSecondary} style={styles.macroVal} />
                <Text style={styles.macroLabel}>kcal</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStat}>
                <GradientNumber value={`${totalProtein}g`} color={theme.macroProtein} style={styles.macroVal} />
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStat}>
                <GradientNumber value={`${totalCarbs}g`} color={theme.macroCarbs} style={styles.macroVal} />
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroStat}>
                <GradientNumber value={`${totalFat}g`} color={theme.macroFat} style={styles.macroVal} />
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            {renderExtendedGrid(1)}
          </View>
        )}

        {/* Servings */}
        <View ref={servingsCardRef} style={styles.card}>
          <Text style={styles.cardLabel}>Servings</Text>
          <View style={styles.servingRow}>
            <View style={{ flex: 0.35 }}>
              <Text style={styles.fieldLabel}>Count</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="1"
                placeholderTextColor={theme.textDim}
                keyboardType="number-pad"
                value={servingCount}
                onChangeText={setServingCount}
              />
            </View>
            <View style={{ flex: 0.65 }}>
              <Text style={styles.fieldLabel}>Unit name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="serving, slice, scoop..."
                placeholderTextColor={theme.textDim}
                value={servingName}
                onChangeText={setServingName}
              />
            </View>
          </View>

          {ingredients.length > 0 && servingCount.trim() !== '' && servings > 0 && (
            <View style={styles.perServingCard}>
              <Text style={[styles.cardLabel, { color: theme.accentBlue, marginBottom: 12 }]}>Per {servingName.trim() || 'serving'}</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroStat}>
                  <GradientNumber value={String(calPerServing)} color={theme.textSecondary} style={styles.macroVal} />
                  <Text style={styles.macroLabel}>kcal</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroStat}>
                  <GradientNumber value={`${proteinPerServing}g`} color={theme.macroProtein} style={styles.macroVal} />
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroStat}>
                  <GradientNumber value={`${carbsPerServing}g`} color={theme.macroCarbs} style={styles.macroVal} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroStat}>
                  <GradientNumber value={`${fatPerServing}g`} color={theme.macroFat} style={styles.macroVal} />
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
              {renderExtendedGrid(servings)}
            </View>
          )}
        </View>

        {/* Total Weight (optional) */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Finished Weight <Text style={{ color: theme.textDim, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>(optional)</Text></Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1 }]}
              placeholder="e.g. 2000"
              placeholderTextColor={theme.textDim}
              keyboardType="decimal-pad"
              value={totalWeight}
              onChangeText={v => filterDecimal(v, setTotalWeight)}
            />
            <UnitPickerButton
              value={normalizeUnit(totalWeightUnit)}
              options={ALL_ENTRY_UNITS}
              twoColumn
              onChange={changeTotalWeightUnit}
            />
          </View>
          <TouchableOpacity style={styles.defaultWeightToggleRow} onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setDefaultToWeight(v => !v); }} activeOpacity={0.7}>
            <View style={[styles.defaultWeightCheckbox, defaultToWeight && styles.defaultWeightCheckboxActive]}>
              {defaultToWeight && <Ionicons name="checkmark" size={12} color={theme.bgPrimary} />}
            </View>
            <Text style={styles.defaultWeightLabel}>Log by weight by default</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {foodCapWall && (
        <CapWallModal
          capKey="foods"
          cap={capFor('foods', isSupporter) ?? 0}
          count={foodCap.count}
          theme={theme}
          onDismiss={() => setFoodCapWall(false)}
        />
      )}

      <CustomFoodCreator
        visible={showCustomFoodModal}
        onClose={() => setShowCustomFoodModal(false)}
        onSaved={handleCustomFoodSaved}
      />

      {/* Edit an ingredient's amount */}
      <Modal
        visible={!!editingIngredient}
        transparent
        animationType="none"
        onShow={() => {
          ingModalAnim.setValue(0);
          Animated.spring(ingModalAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
        }}
        onRequestClose={() => closeAmountEditor()}>
        <Animated.View style={[styles.modalOverlay, { opacity: ingModalAnim }]}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => closeAmountEditor()} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }} pointerEvents="box-none">
            {/* No overflow:'hidden' on the card on purpose -- ModalHeader has no background of its own so
                nothing needs clipping, and clipping sliced the unit dropdown off at the card's edge. */}
            <Animated.View
              style={[styles.modal, { padding: 0, transform: [{ scale: ingModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }] }]}
              pointerEvents="box-none">
              <ModalHeader title="Edit Amount" subtitle={editingIngredient?.name} onClose={() => closeAmountEditor()} />
              <View style={{ width: '100%', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 4 }}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1 }]}
                    value={ingAmountDraft}
                    onChangeText={v => filterDecimal(v, setIngAmountDraft)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    autoFocus
                    placeholder="0"
                    placeholderTextColor={theme.textDim}
                  />
                  {convertibleUnitsFor(ingUnit).length > 0 && (
                    <UnitPickerButton value={ingUnit} options={convertibleUnitsFor(ingUnit)} onChange={changeIngUnit} />
                  )}
                </View>
                <Text style={{ fontSize: 11, color: theme.textDim, fontFamily: Type.ui, marginTop: 8 }}>
                  Calories and every macro scale with the amount.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                  <TouchableOpacity
                    style={[styles.amountEditBtn, { backgroundColor: theme.bgInput, borderColor: theme.borderInput }]}
                    onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); closeAmountEditor(); }}>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.amountEditBtn, {
                      backgroundColor: ingEditValid ? theme.accentBlueBg : theme.bgInput,
                      borderColor: ingEditValid ? theme.accentBlueBorder : theme.borderInput,
                      opacity: ingEditValid ? 1 : 0.5,
                    }]}
                    disabled={!ingEditValid}
                    onPress={saveAmountEdit}>
                    {ingEditValid ? <ButtonShine radius={10} /> : null}
                    <Text style={{ fontSize: 14, color: ingEditValid ? theme.accentBlue : theme.textDim, fontFamily: Type.uiSemibold }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Photo Full-Screen Modal */}
      <Modal visible={showPhotoFullscreen} transparent animationType="fade">
        <ToastRenderer />
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowPhotoFullscreen(false)} />
          {currentPhotoUri && (
            <Image
              source={{ uri: currentPhotoUri }}
              style={{ width: Dimensions.get('window').width * 0.88, height: Dimensions.get('window').width * 0.88, borderRadius: 16 }}
              resizeMode="cover"
            />
          )}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity
              onPress={handlePhotoAdd}
              style={{ paddingHorizontal: 28, paddingVertical: 12, backgroundColor: theme.accentBlueRaw, borderRadius: 10 }}>
              <ButtonShine radius={10} solid />
              <Text style={{ color: '#ffffff', fontSize: 15, fontFamily: Type.uiSemibold }}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePhotoRemove}
              style={{ paddingHorizontal: 28, paddingVertical: 12, backgroundColor: '#cc3333', borderRadius: 10 }}>
              <Text style={{ color: '#ffffff', fontSize: 15, fontFamily: Type.uiSemibold }}>Remove</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowPhotoFullscreen(false)} style={{ marginTop: 20, padding: 8 }}>
            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: Type.uiMedium }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.borderCard,
  },
  backBtn: { width: 60, paddingVertical: 4 },
  backBtnText: { color: theme.accentBlue, fontSize: 14, fontFamily: Type.uiMedium },
  headerTitle: { ...PAGE_TITLE, color: theme.accentBlueRaw },
  // saveBtn / saveBtnText removed 2026-07-15: the header Save is PrimaryCTA (compact) now.
  // paddingBottom clears the global Otto FAB (56px disc at bottom: 18) -- 40 left it sitting on the last
  // card. Same fix as Food Detail.
  content: { padding: 12, paddingBottom: 120, gap: 12 },
  card: {
    backgroundColor: theme.bgCard,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopWidth: 1.5,
    borderTopColor: theme.accentBlueRaw,
    borderRadius: 14,
    padding: 16,
    // Was '#000' @0.12 with a tight 2/6 blur -- about a third of a normal card, the wrong hue on Light
    // (whose shadow is navy) and invisible on Dark. Nothing clips these, so it always rendered; it was
    // just quietly weaker than every other card in the app.
    shadowColor: theme.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.cardShadowOpacity,
    shadowRadius: 12,
    elevation: 6,
  },
  cardLabel: {
    fontSize: 9, letterSpacing: 3, color: theme.textMuted,
    textTransform: 'uppercase', fontFamily: Type.uiBold, marginBottom: 12,
  },
  recipeNameInput: {
    color: theme.textPrimary, fontSize: 16, fontFamily: Type.uiSemibold,
    backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput,
    borderRadius: 8, padding: 12,
  },
  addRow: { flexDirection: 'row', gap: 8 },
  addIngredientBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 10, padding: 14,
  },
  addIngredientText: { color: theme.accentBlue, fontSize: 14, fontFamily: Type.uiSemibold },
  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
  },
  addCustomText: { color: theme.accentBlue, fontSize: 14, fontFamily: Type.uiSemibold },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyTitle: { fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold },
  emptySubtitle: { fontSize: 12, color: theme.textMuted, fontFamily: Type.ui, textAlign: 'center' },
  ingredientRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: theme.borderSubtle },
  ingredientLeft: { flex: 1, marginRight: 12 },
  ingredientName: { fontSize: 14, color: theme.textSecondary, fontFamily: Type.uiSemibold },
  ingMacro: { fontSize: 11, color: theme.textMuted, fontFamily: Type.ui },
  // marginTop matches the pencil's, so both icons sit against the calorie glyph on the same line.
  removeBtn: { padding: 4, marginTop: 2 },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  macroStat: { flex: 1, alignItems: 'center' },
  macroVal: { fontSize: 22, fontFamily: Type.num, letterSpacing: 1 },
  macroUnit: { fontSize: 14, fontFamily: Type.ui, letterSpacing: 0 },
  macroLabel: { fontSize: 9, color: theme.textMuted, fontFamily: Type.ui, marginTop: 1, letterSpacing: 1 },
  macroDivider: { width: 1, height: 32, backgroundColor: theme.borderSubtle },
  extendedRow: {
    flexDirection: 'row', marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.borderSubtle,
  },
  extStat: { flex: 1, alignItems: 'center' },
  extVal: { fontSize: 13, color: theme.textSecondary, fontFamily: Type.uiSemibold },
  extLabel: { fontSize: 8, color: theme.textMuted, fontFamily: Type.ui, marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' },
  perServingCard: {
    backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder,
    borderRadius: 10, padding: 14, marginTop: 14,
  },
  servingRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 9, color: theme.textMuted, fontFamily: Type.uiBold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  fieldInput: {
    backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput,
    borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: Type.ui,
  },
  weightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  defaultWeightToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  defaultWeightCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center' },
  defaultWeightCheckboxActive: { backgroundColor: theme.accentBlue, borderColor: theme.accentBlue },
  defaultWeightLabel: { fontSize: 13, color: theme.textSecondary, fontFamily: Type.ui },
  // Centered floating card, mirroring the recipe log screen's modal so the two match exactly.
  modalOverlay: { flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modal: {
    backgroundColor: theme.bgSheet,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: theme.borderCard,
    borderTopWidth: 1.5,
    borderTopColor: theme.accentBlueRaw,
    padding: 24,
    width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
    alignItems: 'center',
  },
  amountEditBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44,
    borderRadius: 10, borderWidth: 1, overflow: 'hidden',
  },
});
