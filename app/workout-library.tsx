import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { saveToFirebase } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { ToastRenderer, useToast } from '../components/Toast';
import { showAchievementToast } from '../components/AchievementToast';
import { showCelebration } from '../components/CelebrationOverlay';
import { checkWorkoutAchievements, getCelebTier } from '../achievementData';
import { PRESET_PROGRAMS, PRESET_ROUTINES, PresetProgram, DayProgram, Exercise, Routine, TAG_COLOR_PALETTE, WorkoutTag, DEFAULT_TAGS } from '../workoutData';
import { useTheme } from '../theme';
import MuscleMap from '../components/MuscleMap';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialTarget } from '../hooks/useTutorialTarget';

interface LibraryExercise {
  id: string;
  name: string;
  type: 'lift' | 'cardio';
  tags?: string[];
  defaultSets?: string;
  defaultReps?: string;
  defaultRest?: string;
  note?: string;
  favorite?: boolean;
  recentlyUsed?: number;
  instructions?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
}

const makeId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_LIBRARY: LibraryExercise[] = [
  // ── CHEST ──────────────────────────────────────────────────────────────────
  {
    id: 'l2', name: 'Bench Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '4', defaultReps: '8–10', defaultRest: '90s',
    primaryMuscles: ['chest'], secondaryMuscles: ['front_delt', 'triceps'],
    instructions: [
      'Lie flat on bench, grip bar slightly wider than shoulder-width.',
      'Unrack and lower the bar to mid-chest under control.',
      'Press back up to full extension without locking elbows.',
      'Keep shoulder blades pinched together throughout.',
    ],
  },
  {
    id: 'l15', name: 'Machine Chest Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '4', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['chest'], secondaryMuscles: ['front_delt', 'triceps'],
    instructions: [
      'Adjust seat so handles are at chest height.',
      'Press handles forward to full extension without locking elbows.',
      'Lower slowly, feeling chest stretch at the back of the movement.',
      'Keep back flat against the pad throughout.',
    ],
  },
  {
    id: 'l5', name: 'Cable Fly (Low to High)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '12–15', defaultRest: '45s',
    primaryMuscles: ['lower_chest', 'front_delt'], secondaryMuscles: ['abs'],
    instructions: [
      'Set cables at lowest position. Stand centered, one handle in each hand.',
      'With slight elbow bend, sweep arms upward and together at chest height.',
      'Squeeze chest at the top, pause briefly.',
      'Lower with control back to start.',
    ],
  },
  {
    id: 'l22', name: 'Incline Bench Press (Barbell)', type: 'lift', tags: ['tag_push'],
    defaultSets: '4', defaultReps: '8–10', defaultRest: '90s',
    primaryMuscles: ['upper_chest'], secondaryMuscles: ['front_delt', 'triceps'],
    instructions: [
      'Set bench to 30–45 degrees. Grip bar slightly wider than shoulder-width.',
      'Unrack and lower bar to upper chest under control.',
      'Press up and slightly back toward the rack at the top.',
      'Keep shoulder blades retracted throughout.',
    ],
  },
  {
    id: 'l23', name: 'Decline Bench Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '8–10', defaultRest: '90s',
    primaryMuscles: ['lower_chest'], secondaryMuscles: ['front_delt', 'triceps'],
    instructions: [
      'Secure feet under pads, lie back on decline bench.',
      'Grip bar slightly wider than shoulder-width, unrack.',
      'Lower bar to lower chest, keeping elbows at ~75 degrees.',
      'Press back to full extension.',
    ],
  },
  {
    id: 'l24', name: 'Incline Dumbbell Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['upper_chest'], secondaryMuscles: ['front_delt', 'triceps'],
    instructions: [
      'Set bench to 30–45 degrees, hold dumbbells at shoulder height.',
      'Press dumbbells up and slightly together at the top.',
      'Lower slowly to chest level, elbows at ~75 degrees.',
      'Control the descent, avoid letting shoulders roll forward.',
    ],
  },
  {
    id: 'l25', name: 'Dumbbell Bench Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['chest'], secondaryMuscles: ['front_delt', 'triceps'],
    instructions: [
      'Lie flat, hold dumbbells at chest level with palms facing forward.',
      'Press straight up, bringing dumbbells slightly together at the top.',
      'Lower under control to chest level.',
      'Keep feet flat on the floor and core braced.',
    ],
  },
  {
    id: 'l26', name: 'Dips (Chest)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '8–12', defaultRest: '60s',
    primaryMuscles: ['chest', 'lower_chest'], secondaryMuscles: ['triceps', 'front_delt'],
    instructions: [
      'Grip parallel bars, lean torso forward at ~30 degrees.',
      'Lower until upper arms are parallel to the floor or below.',
      'Press back up, focusing on squeezing the chest.',
      'Keep elbows slightly flared outward throughout.',
    ],
  },
  {
    id: 'l27', name: 'Pec Deck Machine', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '12–15', defaultRest: '45s',
    primaryMuscles: ['chest'], secondaryMuscles: ['front_delt'],
    instructions: [
      'Adjust seat so handles are at chest height. Sit with back flat against pad.',
      'Bring arms together in a smooth arc, squeezing chest at full contraction.',
      'Hold 1 second at peak, then return slowly.',
      'Avoid letting elbows drop below shoulder height.',
    ],
  },
  {
    id: 'l28', name: 'Cable Fly (High to Low)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '12–15', defaultRest: '45s',
    primaryMuscles: ['chest', 'upper_chest'], secondaryMuscles: ['front_delt'],
    instructions: [
      'Set cables at highest position. Stand centered, slight forward lean.',
      'Sweep arms downward and together in front of hips.',
      'Squeeze chest at the bottom, pause briefly.',
      'Return to start with control.',
    ],
  },
  // ── SHOULDERS ──────────────────────────────────────────────────────────────
  {
    id: 'l17', name: 'Machine Shoulder Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['front_delt', 'side_delt'], secondaryMuscles: ['triceps'],
    instructions: [
      'Adjust seat so handles are at shoulder height.',
      'Press upward to full extension without locking elbows.',
      'Lower slowly to start position.',
      'Keep core braced, avoid arching lower back.',
    ],
  },
  {
    id: 'l6', name: 'Cable Lateral Raise', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '15', defaultRest: '30s',
    primaryMuscles: ['side_delt'], secondaryMuscles: ['traps'],
    instructions: [
      'Stand beside cable set at lowest point. Grip handle with far hand.',
      'With slight elbow bend, raise arm out to shoulder height.',
      'Pause briefly at top, then lower slowly.',
      'Avoid using momentum — keep movement strict.',
    ],
  },
  {
    id: 'l29', name: 'Barbell Overhead Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '4', defaultReps: '6–10', defaultRest: '90s',
    primaryMuscles: ['front_delt', 'side_delt'], secondaryMuscles: ['triceps', 'traps'],
    instructions: [
      'Set bar at upper chest height. Grip just outside shoulder-width.',
      'Unrack and press bar straight overhead to full arm extension.',
      'Lower bar to clavicle level under control.',
      'Keep core tight and glutes squeezed to protect lower back.',
    ],
  },
  {
    id: 'l30', name: 'Dumbbell Shoulder Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['front_delt', 'side_delt'], secondaryMuscles: ['triceps'],
    instructions: [
      'Sit or stand, hold dumbbells at shoulder height with palms forward.',
      'Press dumbbells up and slightly together overhead.',
      'Lower slowly to shoulder height.',
      'Avoid shrugging — keep traps relaxed.',
    ],
  },
  {
    id: 'l31', name: 'Rear Delt Fly (Dumbbell)', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '15', defaultRest: '30s',
    primaryMuscles: ['rear_delt'], secondaryMuscles: ['rhomboids', 'traps'],
    instructions: [
      'Hinge at hips until torso is nearly parallel to floor.',
      'Hold dumbbells hanging, palms facing each other.',
      'Raise arms out to sides, leading with elbows.',
      'Squeeze rear delts at the top, lower with control.',
    ],
  },
  {
    id: 'l32', name: 'Upright Row (Barbell)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['side_delt', 'traps'], secondaryMuscles: ['biceps'],
    instructions: [
      'Grip barbell slightly inside shoulder-width, palms facing you.',
      'Pull bar straight up, leading with elbows.',
      'Bring bar to chin height, elbows above wrists.',
      'Lower with control. Keep bar close to body throughout.',
    ],
  },
  // ── TRICEPS ────────────────────────────────────────────────────────────────
  {
    id: 'l21', name: 'Tricep Pushdown (Rope)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    instructions: [
      'Set cable to high position with rope attachment.',
      'Grip rope ends, elbows pinned to sides at ~90 degrees.',
      'Push rope down and out to full extension, flaring ends apart at bottom.',
      'Slowly return to 90 degrees without letting elbows drift forward.',
    ],
  },
  {
    id: 'l18', name: 'Overhead Tricep Extension (Cable)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '12', defaultRest: '60s',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    instructions: [
      'Set cable to high position. Face away, grip rope overhead.',
      'Extend arms forward overhead until fully straight.',
      'Bend elbows back slowly, keeping upper arms still.',
      'Feel the stretch at full flex, then extend again.',
    ],
  },
  {
    id: 'l33', name: 'Skull Crushers (EZ Bar)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    instructions: [
      'Lie on flat bench, hold EZ bar overhead with narrow grip.',
      'Lower bar toward forehead by bending elbows only.',
      'Keep upper arms vertical — only forearms move.',
      'Extend back to start. A spotter is recommended.',
    ],
  },
  {
    id: 'l34', name: 'Close Grip Bench Press', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '8–10', defaultRest: '90s',
    primaryMuscles: ['triceps'], secondaryMuscles: ['chest', 'front_delt'],
    instructions: [
      'Lie flat, grip bar shoulder-width or slightly narrower.',
      'Lower bar to chest with elbows tucked close to body.',
      'Press back to full extension, focusing on tricep contraction.',
      'Avoid an excessively narrow grip — wrist strain risk.',
    ],
  },
  {
    id: 'l35', name: 'Dips (Tricep)', type: 'lift', tags: ['tag_push'],
    defaultSets: '3', defaultReps: '8–12', defaultRest: '60s',
    primaryMuscles: ['triceps'], secondaryMuscles: ['chest', 'front_delt'],
    instructions: [
      'Grip parallel bars, keep torso upright (not leaning forward).',
      'Lower until upper arms are parallel to floor, elbows tucked.',
      'Press back to full extension, squeezing triceps at top.',
      'Avoid shrugging at the top.',
    ],
  },
  // ── BACK ───────────────────────────────────────────────────────────────────
  {
    id: 'l12', name: 'Lat Pulldown (Wide Grip)', type: 'lift', tags: ['tag_pull'],
    defaultSets: '4', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'rear_delt'],
    instructions: [
      'Grip bar wide, slightly wider than shoulder-width. Lean back slightly.',
      'Pull bar down to upper chest, leading with elbows.',
      'Squeeze lats at the bottom, hold briefly.',
      'Return bar slowly overhead, feeling the lat stretch.',
    ],
  },
  {
    id: 'l20', name: 'Seated Cable Row', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delt'],
    instructions: [
      'Sit with feet on platform, grip handle with slight forward lean.',
      'Pull handle to lower sternum, driving elbows back.',
      'Squeeze shoulder blades together at the end of the pull.',
      'Return with control to full arm extension.',
    ],
  },
  {
    id: 'l4', name: 'Cable Face Pull', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '15–20', defaultRest: '30s',
    primaryMuscles: ['rear_delt', 'rhomboids'], secondaryMuscles: ['traps', 'biceps'],
    instructions: [
      'Set cable at face height with rope attachment.',
      'Grip rope, step back, arms extended at face level.',
      'Pull rope toward face, spreading apart at the end — elbows high.',
      'Squeeze rear delts and rhomboids at peak contraction.',
    ],
  },
  {
    id: 'l16', name: 'Machine Row', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delt'],
    instructions: [
      'Adjust chest pad so arms can reach handles fully extended.',
      'Pull handles toward torso, driving elbows back.',
      'Squeeze shoulder blades together at the end.',
      'Return slowly to full extension.',
    ],
  },
  {
    id: 'l36', name: 'Pull-Up', type: 'lift', tags: ['tag_pull'],
    defaultSets: '4', defaultReps: '6–10', defaultRest: '90s',
    primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'rear_delt'],
    instructions: [
      'Hang from bar with overhand grip, slightly wider than shoulder-width.',
      'Pull body up until chin clears the bar, leading with elbows.',
      'Squeeze lats at the top, pause briefly.',
      'Lower slowly to full hang. Avoid kipping unless training specifically for it.',
    ],
  },
  {
    id: 'l37', name: 'Chin-Up', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '6–10', defaultRest: '90s',
    primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['rear_delt'],
    instructions: [
      'Hang from bar with underhand grip, shoulder-width.',
      'Pull body up until chin clears the bar.',
      'Biceps and lats work together — squeeze at the top.',
      'Lower slowly to full hang.',
    ],
  },
  {
    id: 'l38', name: 'Conventional Deadlift', type: 'lift', tags: ['tag_pull'],
    defaultSets: '4', defaultReps: '5', defaultRest: '2–3 min',
    primaryMuscles: ['lower_back', 'glutes', 'hamstrings'], secondaryMuscles: ['lats', 'traps', 'quads'],
    instructions: [
      'Bar over mid-foot. Hip-width stance. Hinge to grip just outside legs.',
      'Chest up, back flat, bar touching shins. Take a big breath and brace hard.',
      'Push the floor away as you pull — legs and back work together.',
      'Lock out hips at the top. Lower with control by hinging back first.',
    ],
  },
  {
    id: 'l40', name: 'Barbell Row (Bent Over)', type: 'lift', tags: ['tag_pull'],
    defaultSets: '4', defaultReps: '8–10', defaultRest: '90s',
    primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delt'],
    instructions: [
      'Grip bar shoulder-width, hinge to ~45 degree torso angle.',
      'Pull bar to lower chest/upper belly, leading with elbows.',
      'Squeeze shoulder blades together at the top.',
      'Lower under control. Keep lower back neutral throughout.',
    ],
  },
  {
    id: 'l41', name: 'Dumbbell Row (Single Arm)', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps'],
    instructions: [
      'Place hand and knee on bench for support. Hold dumbbell, arm hanging.',
      'Pull dumbbell to hip, elbow brushing past torso.',
      'Squeeze lat at the top, pause briefly.',
      'Lower to full arm extension.',
    ],
  },
  {
    id: 'l42', name: 'T-Bar Row', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['lats', 'rhomboids'], secondaryMuscles: ['biceps', 'rear_delt'],
    instructions: [
      'Straddle bar, bend to ~45 degrees. Grip handles.',
      'Pull toward chest, driving elbows back.',
      'Squeeze shoulder blades at the top.',
      'Lower with control.',
    ],
  },
  // ── BICEPS ─────────────────────────────────────────────────────────────────
  {
    id: 'l3', name: 'Cable Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    instructions: [
      'Stand at cable with low attachment, underhand grip.',
      'Curl handle to shoulder height, keeping elbows pinned at sides.',
      'Squeeze bicep at the top, hold 1 second.',
      'Lower slowly to full extension.',
    ],
  },
  {
    id: 'l10', name: 'Hammer Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    instructions: [
      'Hold dumbbells with neutral grip (palms facing each other).',
      'Curl both dumbbells to shoulder height, keeping wrists neutral.',
      'Squeeze at the top, lower slowly.',
      'Neutral grip hits brachialis and brachioradialis harder than supinated curl.',
    ],
  },
  {
    id: 'l43', name: 'Dumbbell Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    instructions: [
      'Hold dumbbells at sides, palms facing forward.',
      'Curl both dumbbells to shoulder height, keeping elbows stationary.',
      'Supinate wrists at the top for full contraction.',
      'Lower slowly with control.',
    ],
  },
  {
    id: 'l44', name: 'EZ Bar Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    instructions: [
      'Grip EZ bar at angled sections, slightly inside shoulder-width.',
      'Curl bar to shoulder height, elbows pinned at sides.',
      'Squeeze at the top, lower with control.',
      'Easier on wrists than straight bar.',
    ],
  },
  {
    id: 'l45', name: 'Preacher Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['biceps'], secondaryMuscles: [],
    instructions: [
      'Rest upper arms on preacher pad, grip EZ bar or dumbbells.',
      'Curl weight up to shoulder height.',
      'Lower fully to near full extension — do not bounce at the bottom.',
      'Slow eccentric is key here.',
    ],
  },
  {
    id: 'l46', name: 'Concentration Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12 each', defaultRest: '30s',
    primaryMuscles: ['biceps'], secondaryMuscles: [],
    instructions: [
      'Sit on bench, elbow braced against inner thigh. Hold dumbbell.',
      'Curl dumbbell to shoulder, keeping upper arm completely still.',
      'Squeeze at the top, lower slowly.',
      'Isolates bicep peak more than any other curl variation.',
    ],
  },
  {
    id: 'l47', name: 'Incline Dumbbell Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    instructions: [
      'Set bench to 45 degrees, sit back with dumbbells hanging.',
      'Curl dumbbells from fully extended position, keeping back on bench.',
      'The incline gives a longer stretch on the bicep at the bottom.',
      'Lower fully between each rep.',
    ],
  },
  // ── FOREARMS ───────────────────────────────────────────────────────────────
  {
    id: 'l48', name: 'Wrist Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '15–20', defaultRest: '30s',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    instructions: [
      'Sit on bench, forearms resting on thighs. Hold barbell or dumbbells, underhand grip.',
      'Let wrists drop toward floor, then curl upward as high as possible.',
      'Pause at the top, lower slowly.',
      'Keep forearms stationary throughout.',
    ],
  },
  {
    id: 'l49', name: 'Reverse Wrist Curl', type: 'lift', tags: ['tag_pull'],
    defaultSets: '3', defaultReps: '15–20', defaultRest: '30s',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    instructions: [
      'Sit on bench, forearms resting on thighs. Hold barbell or dumbbells, overhand grip.',
      'Raise wrists upward against gravity, as high as possible.',
      'Lower slowly with control.',
      'Targets extensor muscles on top of forearm.',
    ],
  },
  {
    id: 'l50', name: "Farmer's Carry", type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '40 yards', defaultRest: '60s',
    primaryMuscles: ['forearms', 'traps'], secondaryMuscles: ['abs', 'glutes', 'quads'],
    instructions: [
      'Pick up heavy dumbbells or kettlebells, one in each hand.',
      'Stand tall — chest up, shoulders back, core braced.',
      'Walk for the prescribed distance or time.',
      'Grip strength, core stability, and trap endurance all trained simultaneously.',
    ],
  },
  // ── LEGS ───────────────────────────────────────────────────────────────────
  {
    id: 'l1', name: 'Barbell Squat', type: 'lift', tags: ['tag_legs'],
    defaultSets: '4', defaultReps: '8–10', defaultRest: '90s',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'lower_back', 'abs'],
    instructions: [
      'Bar on upper traps. Feet shoulder-width, toes slightly out.',
      'Break at hips and knees simultaneously, sitting back and down.',
      'Descend until thighs are parallel to floor or below.',
      'Drive through heels to stand, keeping chest tall throughout.',
    ],
  },
  {
    id: 'l14', name: 'Leg Press', type: 'lift', tags: ['tag_legs'],
    defaultSets: '4', defaultReps: '10–12', defaultRest: '90s',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    instructions: [
      'Sit in machine, feet shoulder-width on platform.',
      'Lower platform by bending knees to 90 degrees or deeper.',
      'Press through full foot to extend — do not lock knees at top.',
      'Keep lower back pressed against pad throughout.',
    ],
  },
  {
    id: 'l11', name: 'Hamstring Curl', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '12', defaultRest: '45s',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'calves'],
    instructions: [
      'Lie face-down on machine, pads behind ankles.',
      'Curl legs toward glutes as far as range allows.',
      'Squeeze hamstrings at peak contraction, hold briefly.',
      'Lower slowly — the eccentric is the most important part.',
    ],
  },
  {
    id: 'l13', name: 'Leg Extension (Machine)', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '12–15', defaultRest: '45s',
    primaryMuscles: ['quads'], secondaryMuscles: [],
    instructions: [
      'Sit upright, pad resting on shins just above ankles.',
      'Extend legs to near full straightness, squeezing quads.',
      'Hold at top briefly, lower with control.',
      'Avoid swinging or using momentum.',
    ],
  },
  {
    id: 'l9', name: 'Glute Kickback (Cable)', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '15 each', defaultRest: '30s',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    instructions: [
      'Attach ankle strap to low cable. Face the machine.',
      'Kick leg straight back and up, squeezing glute at the top.',
      'Hold the peak contraction, lower slowly.',
      'Keep torso upright — avoid leaning forward excessively.',
    ],
  },
  {
    id: 'l51', name: 'Romanian Deadlift (RDL)', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['lower_back', 'calves'],
    instructions: [
      'Stand with barbell or dumbbells at hip height.',
      'Hinge at hips, pushing them back as bar tracks down shins.',
      'Lower until hamstrings are at full stretch (mid-shin to floor).',
      'Drive hips forward to return upright. Keep back flat throughout.',
    ],
  },
  {
    id: 'l52', name: 'Hip Thrust (Barbell)', type: 'lift', tags: ['tag_legs'],
    defaultSets: '4', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    instructions: [
      'Shoulders on bench, bar across hips. Feet flat, knees bent.',
      'Lower hips toward floor, then drive up explosively.',
      'Squeeze glutes hard at the top — hips fully extended.',
      'Keep chin tucked — avoid overextending the neck.',
    ],
  },
  {
    id: 'l53', name: 'Bulgarian Split Squat', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '10–12 each', defaultRest: '60s',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    instructions: [
      'Rear foot elevated on bench, front foot 2–3 feet forward.',
      'Lower rear knee toward floor, keeping front knee tracking over toes.',
      'Descend until front thigh is parallel to floor.',
      'Drive through front heel to return. Expect DOMS the next day.',
    ],
  },
  {
    id: 'l54', name: 'Walking Lunges', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '12 each', defaultRest: '45s',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    instructions: [
      'Stand upright, dumbbells at sides or bar on back.',
      'Step forward into a lunge, lowering rear knee toward floor.',
      'Drive through front heel to bring rear foot forward into next step.',
      'Alternate legs for the full set.',
    ],
  },
  {
    id: 'l55', name: 'Reverse Lunge', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '12 each', defaultRest: '45s',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    instructions: [
      'Stand upright, step one foot back into a lunge.',
      'Lower rear knee toward floor, keeping front shin vertical.',
      'Drive through front heel to return to standing.',
      'More knee-friendly than forward lunges for many people.',
    ],
  },
  {
    id: 'l56', name: 'Calf Raise (Standing)', type: 'lift', tags: ['tag_legs'],
    defaultSets: '4', defaultReps: '15', defaultRest: '30s',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    instructions: [
      'Stand on edge of platform, heels hanging off.',
      'Rise up onto balls of feet as high as possible.',
      'Hold at the top 1–2 seconds.',
      'Lower heels below platform level for full stretch. Slow and controlled.',
    ],
  },
  {
    id: 'l57', name: 'Calf Raise (Seated)', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '15–20', defaultRest: '30s',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    instructions: [
      'Sit in machine, pad resting on lower thighs. Balls of feet on platform.',
      'Press up onto balls of feet, hold at top.',
      'Lower slowly, getting a deep stretch at the bottom.',
      'Seated targets the soleus more than the gastrocnemius.',
    ],
  },
  {
    id: 'l58', name: 'Hip Abduction Machine', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '15–20', defaultRest: '30s',
    primaryMuscles: ['hip_abductors', 'glutes'], secondaryMuscles: [],
    instructions: [
      'Sit in machine, knees against outer pads.',
      'Press legs outward against resistance as far as range allows.',
      'Squeeze glutes and abductors at peak, hold briefly.',
      'Return slowly with control.',
    ],
  },
  {
    id: 'l59', name: 'Hip Adduction Machine', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '15–20', defaultRest: '30s',
    primaryMuscles: ['hip_adductors'], secondaryMuscles: [],
    instructions: [
      'Sit in machine, knees against inner pads spread wide.',
      'Press legs inward together against resistance.',
      'Squeeze inner thighs at peak, hold briefly.',
      'Return slowly to start.',
    ],
  },
  {
    id: 'l60', name: 'Sumo Squat', type: 'lift', tags: ['tag_legs'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '60s',
    primaryMuscles: ['quads', 'glutes', 'hip_adductors'], secondaryMuscles: ['hamstrings'],
    instructions: [
      'Feet wide (1.5–2x shoulder-width), toes pointing significantly outward.',
      'Sit straight down between your heels, keeping torso upright.',
      'Drive through heels to stand, squeezing glutes and inner thighs.',
      'Wider stance hits adductors and glutes more than conventional squat.',
    ],
  },
  // ── CORE ───────────────────────────────────────────────────────────────────
  {
    id: 'l7', name: 'Cable Crunch', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '15', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['obliques'],
    instructions: [
      'Kneel below cable with rope attachment at high position.',
      'Hold rope at sides of face, flex spine downward — crunch toward floor.',
      'Focus on spinal flexion, not pulling with arms.',
      'Return to upright with control.',
    ],
  },
  {
    id: 'l8', name: 'Dead Bug', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '10 each side', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['lower_back', 'hip_flexors'],
    instructions: [
      'Lie on back, arms straight up, hips and knees at 90 degrees.',
      'Slowly lower opposite arm and leg toward floor — back stays flat.',
      'Return to start, then alternate sides.',
      'Lower back must remain in contact with floor throughout.',
    ],
  },
  {
    id: 'l19', name: 'Plank', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '30–45s hold', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['lower_back', 'obliques', 'front_delt'],
    instructions: [
      'Forearms on floor, body in straight line from head to heels.',
      'Brace core hard — no sagging hips or raised butt.',
      'Hold for prescribed time, breathing controlled.',
      'Squeeze glutes and quads to help maintain tension.',
    ],
  },
  {
    id: 'l61', name: 'Ab Wheel Rollout', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '10–12', defaultRest: '45s',
    primaryMuscles: ['abs'], secondaryMuscles: ['lower_back', 'front_delt'],
    instructions: [
      'Kneel on floor, grip ab wheel with both hands.',
      'Roll wheel forward slowly, extending body toward floor.',
      'Stop just before hips drop, hold briefly.',
      'Roll back to kneeling. One of the hardest core exercises on this list.',
    ],
  },
  {
    id: 'l62', name: 'Hanging Leg Raise', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '12–15', defaultRest: '45s',
    primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
    instructions: [
      'Hang from bar, arms fully extended.',
      'Raise legs (bent or straight) up toward chest.',
      'Control the descent — avoid swinging.',
      'Posterior pelvic tilt at the top increases lower ab activation.',
    ],
  },
  {
    id: 'l63', name: 'Russian Twist', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '20 total', defaultRest: '30s',
    primaryMuscles: ['obliques'], secondaryMuscles: ['abs'],
    instructions: [
      'Sit with torso leaned back ~45 degrees, feet lifted or on floor.',
      'Hold weight at chest, rotate torso side to side.',
      'Touch weight to floor on each side for full range.',
      'Keep lower back from rounding.',
    ],
  },
  {
    id: 'l64', name: 'V-Up', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '10–15', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
    instructions: [
      'Lie flat on back, arms overhead.',
      'Simultaneously raise legs and torso, reaching hands toward feet.',
      'Lower both back to start with control.',
      'One of the hardest bodyweight core exercises.',
    ],
  },
  {
    id: 'l65', name: 'Side Plank', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '30s each side', defaultRest: '30s',
    primaryMuscles: ['obliques'], secondaryMuscles: ['abs'],
    instructions: [
      'On side, elbow under shoulder, feet stacked.',
      'Raise hips until body forms a straight line.',
      'Hold without letting hips sag.',
      'Targets obliques more directly than standard plank.',
    ],
  },
  {
    id: 'l66', name: 'Bicycle Crunch', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '20 total', defaultRest: '30s',
    primaryMuscles: ['abs', 'obliques'], secondaryMuscles: ['hip_flexors'],
    instructions: [
      'Lie on back, hands behind head. Lift shoulder blades off floor.',
      'Bring left elbow toward right knee as right leg extends.',
      'Alternate sides in a pedaling motion.',
      'Keep lower back pressed to floor throughout.',
    ],
  },
  {
    id: 'l67', name: 'Hollow Hold', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '20–30s hold', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
    instructions: [
      'Lie on back, arms overhead. Press lower back into floor.',
      'Raise shoulders and legs off floor, forming a slight curve.',
      'Hold position with core fully engaged. Lower back stays flat.',
      'Beginner: bend knees. Advanced: keep legs straight and low.',
    ],
  },
  {
    id: 'l68', name: 'Scissors Kicks', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '30s', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
    instructions: [
      'Lie on back, hands under lower back for support. Lift legs 6 inches.',
      'Alternate raising and lowering each leg in a scissor motion.',
      'Keep lower back pressed to floor throughout.',
      'The lower you keep the legs, the harder it gets.',
    ],
  },
  {
    id: 'l69', name: 'Butterfly Kicks', type: 'lift', tags: ['tag_core'],
    defaultSets: '3', defaultReps: '30s', defaultRest: '30s',
    primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
    instructions: [
      'Lie on back, hands under glutes. Lift legs 6–12 inches off floor.',
      'Make small rapid up-and-down flutter kicks.',
      'Keep core engaged and lower back pressed down.',
      'Extend duration to increase difficulty.',
    ],
  },
  // ── CARDIO ─────────────────────────────────────────────────────────────────
  { id: 'c1', name: 'Treadmill', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c2', name: 'Elliptical', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c3', name: 'Stationary Bike', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c4', name: 'Stairmaster', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c5', name: 'Running (Outdoor)', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c6', name: 'HIIT', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c7', name: 'Rowing Machine', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c8', name: 'Jump Rope', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c9', name: 'Assault Bike', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c10', name: 'Swimming', type: 'cardio', tags: ['tag_cardio'] },
  { id: 'c11', name: 'Walking', type: 'cardio', tags: ['tag_cardio'] },
];

function fmtLibraryDay(dk: string | undefined): string {
  if (!dk) return '';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  if (dk === todayKey) return 'Today';
  return new Date(dk + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

const PROGRAM_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type ProgramDayKey = typeof PROGRAM_DAYS[number];

interface BuilderDayState {
  type: 'lift' | 'cardio' | 'rest' | 'unassigned';
  focus: string;
  color: string;
  tags: string[];
}

interface CustomProgram {
  id: string;
  name: string;
  description: string;
  days: Record<string, DayProgram>;
  createdAt: number;
}

function defaultBuilderDays(): Record<ProgramDayKey, BuilderDayState> {
  return {
    Mon: { type: 'lift', focus: '', color: '#3b82f6', tags: [] },
    Tue: { type: 'lift', focus: '', color: '#10b981', tags: [] },
    Wed: { type: 'lift', focus: '', color: '#f59e0b', tags: [] },
    Thu: { type: 'lift', focus: '', color: '#3b82f6', tags: [] },
    Fri: { type: 'lift', focus: '', color: '#10b981', tags: [] },
    Sat: { type: 'rest', focus: 'Rest', color: '#64748b', tags: ['tag_rest'] },
    Sun: { type: 'rest', focus: 'Rest', color: '#64748b', tags: ['tag_rest'] },
  };
}

function DayRow({ day, state, onChange, allTags, onAddTag, theme }: {
  day: ProgramDayKey;
  state: BuilderDayState;
  onChange: (s: BuilderDayState) => void;
  allTags: WorkoutTag[];
  onAddTag: (day: ProgramDayKey) => void;
  theme: any;
}) {
  const isActive = state.type === 'lift' || state.type === 'cardio';
  const isRest = state.type === 'rest';
  const isOff = state.type === 'unassigned';
  const activeCol = state.type === 'cardio' ? '#f97316' : '#3b82f6';
  const visibleTags = allTags.filter(t => t.id !== 'tag_rest');

  const deriveType = (tags: string[]): BuilderDayState['type'] => {
    const hasLiftTag = tags.some(id => id !== 'tag_cardio' && id !== 'tag_rest');
    return hasLiftTag ? 'lift' : 'cardio';
  };

  const toggleTag = (tagId: string) => {
    const newTags = state.tags.includes(tagId)
      ? state.tags.filter(id => id !== tagId)
      : [...state.tags, tagId];
    const newType = deriveType(newTags);
    const firstTag = allTags.find(t => t.id === newTags[0]);
    const newColor = firstTag?.color || '#3b82f6';
    const newFocus = !state.focus.trim() && firstTag ? firstTag.label : state.focus;
    onChange({ ...state, type: newType, tags: newTags, color: newColor, focus: newFocus });
  };

  const pill = (label: string, active: boolean, col: string, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={{ flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center', backgroundColor: active ? col + '22' : 'transparent', borderWidth: 1, borderColor: active ? col + '99' : theme.borderSubtle }}>
      <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 0.3, color: active ? col : theme.textDim }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: 10, backgroundColor: theme.bgInset, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: theme.borderCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: isActive ? 10 : 0 }}>
        <Text style={{ width: 30, color: theme.textSecondary, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.5 }}>{day.toUpperCase()}</Text>
        {pill('ACTIVE', isActive, activeCol, () => onChange({ ...state, type: 'lift', focus: state.focus === 'Rest' ? '' : state.focus, color: state.color === '#64748b' ? '#3b82f6' : state.color, tags: state.tags.filter(id => id !== 'tag_rest') }))}
        {pill('REST', isRest, '#64748b', () => onChange({ ...state, type: 'rest', focus: 'Rest', color: '#64748b', tags: ['tag_rest'] }))}
        {pill('OFF', isOff, '#888899', () => onChange({ type: 'unassigned', focus: '', color: '#64748b', tags: [] }))}
      </View>
      {isActive && (
        <>
          <TextInput
            style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}
            placeholder={state.type === 'cardio' ? 'Focus (e.g. HIIT, Run)' : 'Focus (e.g. Push, Legs)'}
            placeholderTextColor={theme.textPlaceholder}
            value={state.focus}
            onChangeText={v => onChange({ ...state, focus: v })}
            autoCapitalize="words"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {visibleTags.map(t => {
              const isSelected = state.tags.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTag(t.id); }}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: isSelected ? t.color + '99' : t.color + '22', borderWidth: 1, borderColor: isSelected ? t.color : t.color + '55' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: isSelected ? '#ffffff' : t.color }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddTag(day); }}
              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderSubtle }}>
              <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: theme.textDim }}>+ Tag</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function ProgramBuilderModal({ onClose, onSave, editingProgram }: {
  onClose: () => void;
  onSave: (p: CustomProgram) => void;
  editingProgram: CustomProgram | null;
}) {
  const { theme } = useTheme();
  const sheetY = useSharedValue(900);
  const [kbHeight, setKbHeight] = useState(0);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [days, setDays] = useState<Record<ProgramDayKey, BuilderDayState>>(defaultBuilderDays);
  const [allTags, setAllTags] = useState<WorkoutTag[]>([...DEFAULT_TAGS]);
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [tagCreatorDay, setTagCreatorDay] = useState<ProgramDayKey | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const descRef = useRef<any>(null);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_settings');
        const settings = raw ? JSON.parse(raw) : {};
        const saved: WorkoutTag[] = settings.workoutTags || [];
        const merged = [...DEFAULT_TAGS];
        for (const t of saved) { if (!merged.find(m => m.id === t.id)) merged.push(t); }
        setAllTags(merged);
      } catch (e) {}
    };
    if (editingProgram) {
      setName(editingProgram.name);
      setDesc(editingProgram.description || '');
      const converted = {} as Record<ProgramDayKey, BuilderDayState>;
      for (const d of PROGRAM_DAYS) {
        const dp = editingProgram.days[d];
        converted[d] = dp
          ? { type: dp.type, focus: dp.focus || '', color: dp.color || '#3b82f6', tags: dp.tags || [] }
          : { type: 'unassigned', focus: '', color: '#64748b', tags: [] };
      }
      setDays(converted);
    } else {
      setName(''); setDesc(''); setDays(defaultBuilderDays());
    }
    loadTags();
    sheetY.value = withSpring(0, { damping: 26, stiffness: 180, overshootClamping: true });
    const show = Keyboard.addListener('keyboardWillShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const close = () => {
    Keyboard.dismiss();
    sheetY.value = withSpring(900, { damping: 26, stiffness: 180, overshootClamping: true });
    setTimeout(onClose, 280);
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const canSave = name.trim().length > 0;

  const openTagCreator = (day: ProgramDayKey) => {
    setTagCreatorDay(day);
    setNewTagName('');
    setNewTagColor('#3b82f6');
    setShowTagCreator(true);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const newTag: WorkoutTag = { id: 'tag_' + makeId(), label: newTagName.trim(), color: newTagColor };
    const updated = [...allTags, newTag];
    setAllTags(updated);
    try {
      const raw = await AsyncStorage.getItem('pj_settings');
      const settings = raw ? JSON.parse(raw) : {};
      await storageSet('pj_settings', JSON.stringify({ ...settings, workoutTags: [...(settings.workoutTags || []), newTag] }));
    } catch (e) {}
    if (tagCreatorDay) {
      const bd = days[tagCreatorDay];
      const newTags = [...bd.tags, newTag.id];
      const firstTag = updated.find(t => t.id === newTags[0]);
      setDays(prev => ({ ...prev, [tagCreatorDay!]: {
        ...bd,
        tags: newTags,
        color: firstTag?.color || newTagColor,
        focus: !bd.focus.trim() ? newTag.label : bd.focus,
      }}));
    }
    setShowTagCreator(false);
    setTagCreatorDay(null);
  };

  const handleSave = () => {
    if (!canSave) return;
    const programDays: Record<string, DayProgram> = {};
    for (const d of PROGRAM_DAYS) {
      const bd = days[d];
      programDays[d] = {
        type: bd.type,
        focus: bd.type === 'rest' ? 'Rest' : bd.type === 'unassigned' ? '' : bd.focus,
        color: bd.type === 'rest' ? '#64748b' : bd.type === 'unassigned' ? undefined : bd.color,
        exercises: editingProgram?.days[d]?.exercises || [],
        tags: bd.tags.length > 0 ? bd.tags : bd.type === 'rest' ? ['tag_rest'] : undefined,
      };
    }
    onSave({
      id: editingProgram?.id || makeId(),
      name: name.trim(),
      description: desc.trim(),
      days: programDays,
      createdAt: editingProgram?.createdAt ?? Date.now(),
    });
    close();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      <Reanimated.View style={[{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '91%',
        backgroundColor: theme.bgSheet, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTopWidth: 1.5, borderTopColor: theme.accentBlueRaw,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 16,
        paddingBottom: kbHeight,
      }, animStyle]}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); close(); }} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderCard }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
          <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw }}>
            {editingProgram ? 'EDIT PROGRAM' : 'CREATE PROGRAM'}
          </Text>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); close(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <ToastRenderer />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>
            PROGRAM NAME <Text style={{ color: theme.accentRed }}>*</Text>
          </Text>
          <TextInput
            style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}
            placeholder="e.g. My PPL Program"
            placeholderTextColor={theme.textPlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>
            DESCRIPTION <Text style={{ color: theme.textDim, fontSize: 9 }}>(optional)</Text>
          </Text>
          <TextInput
            ref={descRef}
            style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 13, fontFamily: 'DMSans_400Regular', marginBottom: 24, height: 64, textAlignVertical: 'top' }}
            placeholder="Briefly describe this program..."
            placeholderTextColor={theme.textPlaceholder}
            value={desc}
            onChangeText={setDesc}
            multiline
            onBlur={() => descRef.current?.setNativeProps({ selection: { start: 0, end: 0 } })}
          />
          <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 12 }}>WEEKLY SCHEDULE</Text>
          {PROGRAM_DAYS.map(d => (
            <DayRow key={d} day={d} state={days[d]} allTags={allTags} onAddTag={openTagCreator} onChange={updated => setDays(prev => ({ ...prev, [d]: updated }))} theme={theme} />
          ))}
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }}
            disabled={!canSave}
            style={{ marginTop: 8, backgroundColor: theme.accentBlue, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: canSave ? 1 : 0.4 }}>
            <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 }}>
              {editingProgram ? 'SAVE PROGRAM' : 'CREATE PROGRAM'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {showTagCreator && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowTagCreator(false)} />
            <View style={{ position: 'absolute', top: '28%', left: 20, right: 20, backgroundColor: theme.bgSheet, borderRadius: 16, padding: 20, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw, marginBottom: 14 }}>NEW TAG</Text>
              <TextInput
                style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 14 }}
                placeholder="Tag name"
                placeholderTextColor={theme.textPlaceholder}
                value={newTagName}
                onChangeText={setNewTagName}
                autoCapitalize="words"
                autoFocus
              />
              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10 }}>COLOR</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {TAG_COLOR_PALETTE.map(c => (
                  <TouchableOpacity key={c} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNewTagColor(c); }} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: newTagColor === c ? 2.5 : 0, borderColor: '#ffffff' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTagCreator(false); }} style={{ flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleCreateTag(); }} disabled={!newTagName.trim()} style={{ flex: 1, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 8, alignItems: 'center', opacity: newTagName.trim() ? 1 : 0.4 }}>
                  <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 }}>ADD TAG</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Reanimated.View>
    </View>
  );
}

function getWeekDays(weekOffset: number = 0) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const name = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
    return { key, name, label: `${d.getMonth() + 1}/${d.getDate()}` };
  });
}

function RoutineBuilderModal({ onClose, onSave, editingRoutine, library, allTags }: {
  onClose: () => void;
  onSave: (r: Routine) => void;
  editingRoutine: Routine | null;
  library: LibraryExercise[];
  allTags: WorkoutTag[];
}) {
  const { theme } = useTheme();
  const overlayAnim = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: overlayAnim.value }));
  const cardScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exQuery, setExQuery] = useState('');
  const [starred, setStarred] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickIsCardio, setQuickIsCardio] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);
  const [showFillPicker, setShowFillPicker] = useState(false);
  const fillPickerAnim = useSharedValue(0);
  const fillPickerScale = useSharedValue(0.92);
  const fillPickerOverlayStyle = useAnimatedStyle(() => ({ opacity: fillPickerAnim.value }));
  const fillPickerCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: fillPickerScale.value }] }));

  const updateExercise = (id: string, field: keyof Exercise, value: string) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const filterDecimal = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');

  useEffect(() => {
    if (editingRoutine) {
      setName(editingRoutine.name);
      setSelectedTags(editingRoutine.tags);
      setExercises(editingRoutine.exercises);
      setStarred(editingRoutine.starred);
    }
    overlayAnim.value = withTiming(1, { duration: 200 });
    cardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  }, []);

  const close = () => {
    Keyboard.dismiss();
    overlayAnim.value = withTiming(0, { duration: 150 });
    cardScale.value = withTiming(0.92, { duration: 150 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const filteredLibrary = exQuery.trim()
    ? library.filter(ex => ex.name.toLowerCase().includes(exQuery.toLowerCase())).slice(0, 5)
    : [];

  const addFromLibrary = (ex: LibraryExercise) => {
    if (exercises.find(e => e.name === ex.name)) return;
    setExercises(prev => [...prev, {
      id: makeId(),
      name: ex.name,
      sets: '',
      reps: '',
      rest: '',
      note: ex.note || '',
      isCardio: ex.type === 'cardio',
    }]);
    setExQuery('');
    setBrowseMode(false);
  };

  const removeExercise = (id: string) => setExercises(prev => prev.filter(e => e.id !== id));

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const handleQuickAdd = () => {
    if (!quickName.trim()) return;
    setExercises(prev => [...prev, {
      id: makeId(),
      name: quickName.trim(),
      sets: '',
      reps: '',
      rest: '',
      note: '',
      isCardio: quickIsCardio,
    }]);
    setQuickName('');
    setQuickIsCardio(false);
    setShowQuickAdd(false);
  };

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return;
    onSave({ id: editingRoutine?.id || makeId(), name: name.trim(), tags: selectedTags, exercises, starred });
    close();
  };

  const canSave = name.trim().length > 0 && exercises.length > 0;
  const visibleTags = allTags.filter(t => t.id !== 'tag_rest');

  const matchingPresets = PRESET_ROUTINES.filter(p =>
    selectedTags.length === 0 || p.tags.some(t => selectedTags.includes(t))
  );
  const fillPresets = matchingPresets.length > 0 ? matchingPresets : PRESET_ROUTINES;

  const openFillPicker = () => {
    fillPickerAnim.value = 0;
    fillPickerScale.value = 0.92;
    setShowFillPicker(true);
    fillPickerAnim.value = withTiming(1, { duration: 180 });
    fillPickerScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeFillPicker = () => {
    fillPickerAnim.value = withTiming(0, { duration: 140 });
    fillPickerScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(setShowFillPicker)(false);
    });
  };

  const applyPreset = (preset: Routine) => {
    const newExercises: Exercise[] = preset.exercises.map(ex => ({
      ...ex,
      id: makeId(),
    }));
    setExercises(newExercises);
    if (!name.trim()) setName(preset.name);
    closeFillPicker();
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={close}>
      <ToastRenderer />
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, overlayAnimStyle]} pointerEvents="none" />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }} pointerEvents="box-none">
          <Reanimated.View pointerEvents="box-none" style={[{ width: '100%', maxHeight: '92%' }, cardScaleStyle]}>
            <View pointerEvents="auto" style={{ backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw }}>
                  {editingRoutine ? 'EDIT ROUTINE' : 'CREATE ROUTINE'}
                </Text>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); close(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>
                  ROUTINE NAME <Text style={{ color: theme.accentRed }}>*</Text>
                </Text>
                <TextInput
                  style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 15, fontFamily: 'DMSans_400Regular', marginBottom: 16 }}
                  placeholder="e.g. Push Day, Leg Day"
                  placeholderTextColor={theme.textPlaceholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />

                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8 }}>TAGS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  {visibleTags.map(t => {
                    const sel = selectedTags.includes(t.id);
                    return (
                      <TouchableOpacity key={t.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTag(t.id); }}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: sel ? t.color + '99' : t.color + '22', borderWidth: 1, borderColor: sel ? t.color : t.color + '55' }}>
                        <Text style={{ fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: sel ? '#ffffff' : t.color }}>{t.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8 }}>
                  EXERCISES{exercises.length > 0 ? ` (${exercises.length})` : ''} <Text style={{ color: theme.accentRed }}>*</Text>
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: (filteredLibrary.length > 0 || browseMode) ? 4 : 12 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular' }}
                    placeholder="Search exercise library..."
                    placeholderTextColor={theme.textPlaceholder}
                    value={exQuery}
                    onChangeText={setExQuery}
                  />
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBrowseMode(b => !b); }}
                    style={{ width: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: browseMode ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: browseMode ? theme.accentBlueBorder : theme.borderInput, borderRadius: 8 }}>
                    <Ionicons name="list" size={20} color={browseMode ? theme.accentBlue : theme.textMuted} />
                  </TouchableOpacity>
                </View>

                {browseMode ? (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, marginBottom: 12, borderWidth: 0.5, borderColor: theme.borderCard }}>
                    {(exQuery.trim() ? library.filter(l => l.name.toLowerCase().includes(exQuery.toLowerCase())) : library).map((l, idx, arr) => {
                      const alreadyAdded = !!exercises.find(e => e.name === l.name);
                      return (
                        <TouchableOpacity key={l.id} onPress={() => { if (!alreadyAdded) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addFromLibrary(l); } }}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: idx < arr.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderCard, opacity: alreadyAdded ? 0.45 : 1 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.textPrimary, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>{l.name}</Text>
                            <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>{l.type}</Text>
                          </View>
                          {alreadyAdded
                            ? <Ionicons name="checkmark-circle" size={20} color={theme.accentGreen} />
                            : <View style={{ backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>+ Add</Text>
                              </View>
                          }
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : filteredLibrary.length > 0 ? (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 8, marginBottom: 12, borderWidth: 0.5, borderColor: theme.borderCard }}>
                    {filteredLibrary.map((l, idx) => (
                      <TouchableOpacity key={l.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addFromLibrary(l); }}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: idx < filteredLibrary.length - 1 ? 0.5 : 0, borderBottomColor: theme.borderCard }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>{l.name}</Text>
                          <Text style={{ color: theme.textMuted, fontSize: 10, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>{l.type}</Text>
                        </View>
                        <View style={{ backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ color: theme.accentGreen, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>+ Add</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {exercises.length === 0 && !exQuery.trim() && !browseMode && (
                  <View style={{ alignItems: 'center', paddingVertical: 20, marginBottom: 12, backgroundColor: theme.bgInset, borderRadius: 10, borderWidth: 0.5, borderColor: theme.borderCard }}>
                    <Ionicons name="list-outline" size={28} color={theme.textDim} style={{ marginBottom: 8 }} />
                    <Text style={{ color: theme.textDim, fontSize: 13, fontFamily: 'DMSans_500Medium', marginBottom: 4 }}>No exercises yet</Text>
                    <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular', marginBottom: 14, textAlign: 'center', paddingHorizontal: 20 }}>
                      Search or browse above, or fill from a preset
                    </Text>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openFillPicker(); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 }}>
                      <Ionicons name="flash-outline" size={15} color={theme.accentBlue} />
                      <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Fill from Preset</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {exercises.length > 0 && !exQuery.trim() && !browseMode && (
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openFillPicker(); }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginBottom: 10 }}>
                    <Ionicons name="flash-outline" size={13} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>Replace with preset</Text>
                  </TouchableOpacity>
                )}

                {exercises.map(ex => (
                  <View key={ex.id} style={{ backgroundColor: theme.bgInset, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: theme.borderCard }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ backgroundColor: ex.isCardio ? 'rgba(249,115,22,0.15)' : theme.accentBlueBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 }}>
                        <Text style={{ fontSize: 8, fontFamily: 'DMSans_700Bold', letterSpacing: 1, color: ex.isCardio ? '#f97316' : theme.accentBlue }}>
                          {ex.isCardio ? 'CARDIO' : 'LIFT'}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, color: theme.textPrimary, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>{ex.name}</Text>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); removeExercise(ex.id); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={16} color={theme.accentRed} />
                      </TouchableOpacity>
                    </View>
                    {!ex.isCardio ? (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {([
                          { label: 'SETS', field: 'sets' as keyof Exercise, kb: 'numeric' as any },
                          { label: 'REPS', field: 'reps' as keyof Exercise, kb: 'numeric' as any },
                          { label: 'REST', field: 'rest' as keyof Exercise, kb: 'numeric' as any },
                        ]).map(({ label, field, kb }) => (
                          <View key={String(field)} style={{ flex: 1 }}>
                            <Text style={{ fontSize: 8, letterSpacing: 2, color: theme.textDim, fontFamily: 'DMSans_700Bold', marginBottom: 3, textTransform: 'uppercase' }}>{label}</Text>
                            <TextInput
                              style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}
                              placeholder="--"
                              placeholderTextColor={theme.textPlaceholder}
                              value={(ex[field] as string) || ''}
                              onChangeText={v => updateExercise(ex.id, field, v)}
                              keyboardType={kb}
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                          {([
                            { label: 'DURATION', field: 'duration' as keyof Exercise, kb: 'default' as any, dec: false },
                            { label: 'DISTANCE', field: 'distance' as keyof Exercise, kb: 'decimal-pad' as any, dec: true },
                          ]).map(({ label, field, kb, dec }) => (
                            <View key={String(field)} style={{ flex: 1 }}>
                              <Text style={{ fontSize: 8, letterSpacing: 2, color: theme.textDim, fontFamily: 'DMSans_700Bold', marginBottom: 3, textTransform: 'uppercase' }}>{label}</Text>
                              <TextInput
                                style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}
                                placeholder="--"
                                placeholderTextColor={theme.textPlaceholder}
                                value={(ex[field] as string) || ''}
                                onChangeText={v => updateExercise(ex.id, field, dec ? filterDecimal(v) : v)}
                                keyboardType={kb}
                              />
                            </View>
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {([
                            { label: 'SPEED', field: 'speed' as keyof Exercise, kb: 'decimal-pad' as any },
                            { label: 'INCLINE', field: 'incline' as keyof Exercise, kb: 'decimal-pad' as any },
                            { label: 'RESIST', field: 'resistance' as keyof Exercise, kb: 'decimal-pad' as any },
                          ]).map(({ label, field, kb }) => (
                            <View key={String(field)} style={{ flex: 1 }}>
                              <Text style={{ fontSize: 8, letterSpacing: 2, color: theme.textDim, fontFamily: 'DMSans_700Bold', marginBottom: 3, textTransform: 'uppercase' }}>{label}</Text>
                              <TextInput
                                style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}
                                placeholder="--"
                                placeholderTextColor={theme.textPlaceholder}
                                value={(ex[field] as string) || ''}
                                onChangeText={v => updateExercise(ex.id, field, filterDecimal(v))}
                                keyboardType={kb}
                              />
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                ))}

                {!showQuickAdd ? (
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowQuickAdd(true); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, marginTop: 4 }}>
                    <Ionicons name="add-circle-outline" size={16} color={theme.accentBlue} />
                    <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Create new exercise</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: theme.bgInset, borderRadius: 10, padding: 14, marginTop: 8, borderWidth: 0.5, borderColor: theme.borderCard }}>
                    <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10 }}>NEW EXERCISE</Text>
                    <TextInput
                      style={{ backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 }}
                      placeholder="Exercise name"
                      placeholderTextColor={theme.textPlaceholder}
                      value={quickName}
                      onChangeText={setQuickName}
                      autoCapitalize="words"
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuickIsCardio(false); }}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: !quickIsCardio ? theme.accentBlueBg : theme.bgInput, borderWidth: 1, borderColor: !quickIsCardio ? theme.accentBlueBorder : theme.borderInput }}>
                        <Text style={{ color: !quickIsCardio ? theme.accentBlue : theme.textMuted, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Lift</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuickIsCardio(true); }}
                        style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: quickIsCardio ? 'rgba(245,158,11,0.15)' : theme.bgInput, borderWidth: 1, borderColor: quickIsCardio ? 'rgba(245,158,11,0.3)' : theme.borderInput }}>
                        <Text style={{ color: quickIsCardio ? theme.statusWarn : theme.textMuted, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Cardio</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowQuickAdd(false); setQuickName(''); setQuickIsCardio(false); }}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput }}>
                        <Text style={{ color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleQuickAdd(); }} disabled={!quickName.trim()}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: theme.accentBlue, opacity: quickName.trim() ? 1 : 0.4 }}>
                        <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 }}>ADD</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleSave(); }} disabled={!canSave}
                  style={{ marginTop: 20, backgroundColor: theme.accentBlue, borderRadius: 10, paddingVertical: 14, alignItems: 'center', opacity: canSave ? 1 : 0.4 }}>
                  <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 }}>
                    {editingRoutine ? 'SAVE ROUTINE' : 'CREATE ROUTINE'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Reanimated.View>
        </View>
      </KeyboardAvoidingView>

      {showFillPicker && (
        <Modal transparent animationType="none" visible onRequestClose={closeFillPicker}>
          <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }, fillPickerOverlayStyle]} pointerEvents="none" />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeFillPicker} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} pointerEvents="box-none">
            <Reanimated.View pointerEvents="box-none" style={[{ width: '100%', maxHeight: '80%' }, fillPickerCardStyle]}>
              <View pointerEvents="auto" style={{ backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
                  <View>
                    <Text style={{ fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw }}>FILL FROM PRESET</Text>
                    {selectedTags.length > 0 && matchingPresets.length > 0 && (
                      <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 2 }}>Showing presets matching your tags</Text>
                    )}
                    {selectedTags.length > 0 && matchingPresets.length === 0 && (
                      <Text style={{ fontSize: 10, fontFamily: 'DMSans_400Regular', color: theme.textMuted, marginTop: 2 }}>No tag match -- showing all presets</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeFillPicker(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                  {fillPresets.map((preset, idx) => {
                    const preview = preset.exercises.slice(0, 3).map(e => e.name).join(', ');
                    const more = preset.exercises.length > 3 ? ` +${preset.exercises.length - 3} more` : '';
                    return (
                      <TouchableOpacity key={preset.id} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (exercises.length > 0) {
                          Alert.alert(
                            'Replace exercises?',
                            `This will replace your ${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} with the "${preset.name}" preset.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Replace', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); applyPreset(preset); } },
                            ]
                          );
                        } else {
                          applyPreset(preset);
                        }
                      }}
                        style={{ backgroundColor: theme.bgInset, borderRadius: 10, padding: 14, marginBottom: idx < fillPresets.length - 1 ? 10 : 0, borderWidth: 0.5, borderColor: theme.borderCard }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 14, fontFamily: 'DMSans_600SemiBold', flex: 1 }}>{preset.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>
                              {preset.exercises.length} exercise{preset.exercises.length !== 1 ? 's' : ''}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                          </View>
                        </View>
                        <Text style={{ color: theme.textDim, fontSize: 11, fontFamily: 'DMSans_400Regular' }} numberOfLines={2}>
                          {preview}{more}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </Reanimated.View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

export default function WorkoutLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();

  // ── Tutorial spotlight targets ─────────────────────────────────────────────
  const { registerTutorialAction, unregisterTutorialAction } = useTutorial();
  const libSearchRef      = useTutorialTarget('workout_lib_search');
  const libExerciseRowRef = useTutorialTarget('workout_lib_exercise_row');
  const libFilterBtnRef   = useTutorialTarget('workout_lib_filter_btn');
  const libFabRef         = useTutorialTarget('workout_lib_fab');
  const libMuscleMapRef   = useTutorialTarget('workout_lib_muscle_map');
  const [showTutorialDetail, setShowTutorialDetail] = useState(false);
  // Stable ref so tutorial actions always have latest library without re-registering on every load
  const libraryRef = useRef<LibraryExercise[]>([]);

  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'programs' | 'routines'>('all');
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEx, setEditingEx] = useState<LibraryExercise | null>(null);
  const [form, setForm] = useState<Partial<LibraryExercise>>({ type: 'lift', defaultSets: '', defaultReps: '', defaultRest: '' });
  const [sortOption, setSortOption] = useState<'az' | 'za' | 'favorites' | 'recent' | 'active-first'>('az');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'lift' | 'cardio'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const filterOverlay = useSharedValue(0);
  const filterScale = useSharedValue(0.92);
  const filterOverlayStyle = useAnimatedStyle(() => ({ opacity: filterOverlay.value }));
  const filterCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: filterScale.value }] }));
  const [activeProgramName, setActiveProgramName] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [myPrograms, setMyPrograms] = useState<CustomProgram[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingProgram, setEditingProgram] = useState<CustomProgram | null>(null);
  const [libTags, setLibTags] = useState<WorkoutTag[]>([...DEFAULT_TAGS]);
  const [myRoutines, setMyRoutines] = useState<Routine[]>([]);
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showLoadRoutinePicker, setShowLoadRoutinePicker] = useState(false);
  const [loadRoutineTarget, setLoadRoutineTarget] = useState<Routine | null>(null);
  const [loadRoutineSelectedDays, setLoadRoutineSelectedDays] = useState<string[]>([]);
  const loadRoutineOverlay = useSharedValue(0);
  const loadRoutineScale = useSharedValue(0.92);
  const loadRoutineOverlayStyle = useAnimatedStyle(() => ({ opacity: loadRoutineOverlay.value }));
  const loadRoutineCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: loadRoutineScale.value }] }));
  const [loadPickerWeekOffset, setLoadPickerWeekOffset] = useState(0);
  const [myRoutinesExpanded, setMyRoutinesExpanded] = useState(true);
  const [presetsExpanded, setPresetsExpanded] = useState(true);
  const [myRoutinesContentH, setMyRoutinesContentH] = useState<number | null>(null);
  const [presetsContentH, setPresetsContentH] = useState<number | null>(null);
  const myRoutinesAnimHeight = useRef(new Animated.Value(9999)).current;
  const presetsAnimHeight = useRef(new Animated.Value(9999)).current;
  const myRoutinesOpacity = useRef(new Animated.Value(1)).current;
  const presetsOpacity = useRef(new Animated.Value(1)).current;
  const myRoutinesChevron = useRef(new Animated.Value(1)).current;
  const presetsChevron = useRef(new Animated.Value(1)).current;

  const { selectMode, day } = useLocalSearchParams<{ selectMode: string; day: string }>();
  const isSelectMode = selectMode === 'true';
  const [selectedEx, setSelectedEx] = useState<LibraryExercise | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const addOverlay = useSharedValue(0);
  const addScale = useSharedValue(0.92);
  const addOverlayStyle = useAnimatedStyle(() => ({ opacity: addOverlay.value }));
  const addCardAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));
  const detailOverlay = useSharedValue(0);
  const detailCardOpacity = useSharedValue(1);
  const detailCardScale = useSharedValue(0.92);
  const detailOverlayStyle = useAnimatedStyle(() => ({ opacity: detailOverlay.value }));
  const detailCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: detailCardScale.value }], opacity: detailCardOpacity.value }));
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabItem1Anim = useRef(new Animated.Value(0)).current; // Create Exercise - bottom, first
  const fabItem2Anim = useRef(new Animated.Value(0)).current; // Create Program - middle
  const fabItem3Anim = useRef(new Animated.Value(0)).current; // Create Routine - top, last

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('pj_exercise_library');
        if (saved) {
          const parsed: LibraryExercise[] = JSON.parse(saved);
          const savedIds = new Set(parsed.map(e => e.id));
          const newDefaults = DEFAULT_LIBRARY.filter(e => !savedIds.has(e.id));
          // Enrich existing entries with new fields (instructions, muscles, tags) without overwriting user customizations
          const enriched = parsed.map(e => {
            const def = DEFAULT_LIBRARY.find(d => d.id === e.id);
            if (!def) return e;
            const needsPatch = (!e.instructions && def.instructions) || (!e.primaryMuscles && def.primaryMuscles) || (!e.tags && def.tags);
            if (!needsPatch) return e;
            return { ...e, instructions: e.instructions ?? def.instructions, primaryMuscles: e.primaryMuscles ?? def.primaryMuscles, secondaryMuscles: e.secondaryMuscles ?? def.secondaryMuscles, tags: e.tags ?? def.tags };
          });
          const merged = [...enriched, ...newDefaults];
          setLibrary(merged);
          const hasChanges = newDefaults.length > 0 || enriched.some((e, i) => e !== parsed[i]);
          if (hasChanges) await storageSet('pj_exercise_library', JSON.stringify(merged));
        } else {
          setLibrary(DEFAULT_LIBRARY);
          await storageSet('pj_exercise_library', JSON.stringify(DEFAULT_LIBRARY));
        }
      } catch (e) {
        console.log('Load error', e);
      }
    };
    load();
  }, []);

  // Keep libraryRef current so tutorial actions always see the latest library
  useEffect(() => { libraryRef.current = library; }, [library]);

  // ── Tutorial actions for exercise_library tour ────────────────────────────
  useEffect(() => {
    registerTutorialAction('openTutorialExerciseDetail', async () => {
      const lib = libraryRef.current;
      const demo = lib.find(ex => ex.id === 'l2') ?? lib.find(ex => ex.primaryMuscles?.length) ?? lib[0];
      if (!demo) return;
      setSelectedEx(demo);
      setShowDayPicker(false);
      detailOverlay.value = 0;
      detailCardScale.value = 0.92;
      detailCardOpacity.value = 1;
      setShowTutorialDetail(true);
      detailOverlay.value = withTiming(1, { duration: 250 });
      detailCardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
      // Wait for React to re-render and register libMuscleMapRef, plus animation to settle
      await new Promise<void>(resolve => setTimeout(resolve, 400));
    });

    registerTutorialAction('closeTutorialExerciseDetail', async () => {
      await new Promise<void>(resolve => {
        detailOverlay.value = withTiming(0, { duration: 160 });
        detailCardScale.value = withTiming(0.88, { duration: 160 });
        detailCardOpacity.value = withTiming(0, { duration: 160 }, () => {
          runOnJS(setShowTutorialDetail)(false);
          runOnJS(setShowDayPicker)(false);
          runOnJS(resolve)();
        });
      });
    });

    registerTutorialAction('closeExerciseLibraryTutorial', async () => {
      setShowTutorialDetail(false);
      router.back();
    });

    return () => {
      unregisterTutorialAction('openTutorialExerciseDetail');
      unregisterTutorialAction('closeTutorialExerciseDetail');
      unregisterTutorialAction('closeExerciseLibraryTutorial');
    };
  }, []);

  useFocusEffect(useCallback(() => {
    const loadProgramState = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_workout_state');
        if (raw) {
          const state = JSON.parse(raw);
          setActiveProgramName(state.activeProgramName || null);
        }
      } catch (e) {}
    };
    const loadMyPrograms = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_my_programs');
        if (raw) {
          const parsed = JSON.parse(raw);
          setMyPrograms(Array.isArray(parsed) ? parsed : []);
        } else {
          const seeded: CustomProgram[] = PRESET_PROGRAMS.map(p => ({ ...p, createdAt: 0 }));
          setMyPrograms(seeded);
          await storageSet('pj_my_programs', JSON.stringify(seeded));
        }
      } catch (e) {
        const seeded: CustomProgram[] = PRESET_PROGRAMS.map(p => ({ ...p, createdAt: 0 }));
        setMyPrograms(seeded);
        try { await storageSet('pj_my_programs', JSON.stringify(seeded)); } catch {}
      }
    };
    const loadTags = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_settings');
        const settings = raw ? JSON.parse(raw) : {};
        const saved: WorkoutTag[] = settings.workoutTags || [];
        const merged = [...DEFAULT_TAGS];
        for (const t of saved) { if (!merged.find(m => m.id === t.id)) merged.push(t); }
        setLibTags(merged);
      } catch (e) {}
    };
    const loadMyRoutines = async () => {
      try {
        const raw = await AsyncStorage.getItem('pj_routines');
        setMyRoutines(raw ? JSON.parse(raw) : []);
      } catch (e) {}
    };
    loadProgramState();
    loadMyPrograms();
    loadMyRoutines();
    loadTags();
    return () => {
      setSortOption('az');
      setFilterTags([]);
      setFilterType('all');
    };
  }, []));

  useEffect(() => {
    setSortOption('az');
    setFilterTags([]);
    setFilterType('all');
  }, [activeTab]);

  const saveLibrary = async (updated: LibraryExercise[]) => {
    setLibrary(updated);
    await storageSet('pj_exercise_library', JSON.stringify(updated));
    await saveToFirebase('exercise_library', 'exercises', updated);
  };

  const toggleFavorite = async (id: string) => {
    const updated = library.map(ex => ex.id === id ? { ...ex, favorite: !ex.favorite } : ex);
    await saveLibrary(updated);
  };

  const deleteExercise = async (id: string) => {
    const updated = library.filter(ex => ex.id !== id);
    await saveLibrary(updated);
  };

  const handleLoadProgram = (program: CustomProgram) => {
    Alert.alert(
      'Load Program',
      `This will replace your current weekly template with "${program.name}". Days you've already logged won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load', onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const raw = await AsyncStorage.getItem('pj_workout_state');
              const state = raw ? JSON.parse(raw) : {};
              const updated = { ...state, weeklyTemplate: program.days, activeProgramName: program.name };
              await storageSet('pj_workout_state', JSON.stringify(updated));
              setActiveProgramName(program.name);
              showToast('Program loaded', program.name, 'success');
              checkWorkoutAchievements().then(unlocked => {
                for (const def of unlocked) {
                  showCelebration(getCelebTier(def), def.name, def);
                  showAchievementToast(def);
                }
              });
            } catch (e) {}
          }
        },
      ]
    );
  };

  const handleClearProgram = () => {
    Alert.alert(
      'Clear Program',
      "This will clear your weekly template. Days you've already logged won't be affected.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive', onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              const raw = await AsyncStorage.getItem('pj_workout_state');
              const state = raw ? JSON.parse(raw) : {};
              const updated = { ...state, weeklyTemplate: {}, activeProgramName: null };
              await storageSet('pj_workout_state', JSON.stringify(updated));
              setActiveProgramName(null);
              showToast('Program cleared', undefined, 'success');
            } catch (e) {}
          }
        },
      ]
    );
  };

  const saveMyPrograms = async (programs: CustomProgram[]) => {
    setMyPrograms(programs);
    await storageSet('pj_my_programs', JSON.stringify(programs));
  };

  const handleSaveProgram = async (program: CustomProgram) => {
    const idx = myPrograms.findIndex(p => p.id === program.id);
    const updated = idx >= 0
      ? myPrograms.map(p => p.id === program.id ? program : p)
      : [...myPrograms, program];
    await saveMyPrograms(updated);
    if (activeProgramName === (editingProgram?.name || '')) {
      try {
        const raw = await AsyncStorage.getItem('pj_workout_state');
        const state = raw ? JSON.parse(raw) : {};
        await storageSet('pj_workout_state', JSON.stringify({ ...state, weeklyTemplate: program.days, activeProgramName: program.name }));
        setActiveProgramName(program.name);
      } catch (e) {}
    }
    showToast(editingProgram ? 'Program saved' : 'Program created', program.name, 'success');
    setEditingProgram(null);
  };

  const handleDeleteProgram = (program: CustomProgram) => {
    Alert.alert(
      'Delete Program',
      `Delete "${program.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const updated = myPrograms.filter(p => p.id !== program.id);
            await saveMyPrograms(updated);
            if (activeProgramName === program.name) {
              try {
                const raw = await AsyncStorage.getItem('pj_workout_state');
                const state = raw ? JSON.parse(raw) : {};
                await storageSet('pj_workout_state', JSON.stringify({ ...state, weeklyTemplate: {}, activeProgramName: null }));
              } catch (e) {}
              setActiveProgramName(null);
            }
            showToast('Program deleted', undefined, 'success');
          }
        },
      ]
    );
  };

  const saveMyRoutines = async (routines: Routine[]) => {
    setMyRoutines(routines);
    await storageSet('pj_routines', JSON.stringify(routines));
  };

  const handleSaveRoutine = async (routine: Routine) => {
    const idx = myRoutines.findIndex(r => r.id === routine.id);
    const updated = idx >= 0
      ? myRoutines.map(r => r.id === routine.id ? routine : r)
      : [...myRoutines, routine];
    await saveMyRoutines(updated);
    showToast(editingRoutine ? 'Routine saved' : 'Routine created', routine.name, 'success');
    setEditingRoutine(null);
    checkWorkoutAchievements().then(unlocked => {
      for (const def of unlocked) {
        showCelebration(getCelebTier(def), def.name, def);
        showAchievementToast(def);
      }
    });
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert(
      'Delete Routine',
      `Delete "${routine.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await saveMyRoutines(myRoutines.filter(r => r.id !== routine.id));
            showToast('Routine deleted', undefined, 'success');
          }
        },
      ]
    );
  };

  const openLoadRoutinePicker = (routine: Routine) => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setLoadRoutineTarget(routine);
    setLoadRoutineSelectedDays([todayKey]);
    setLoadPickerWeekOffset(0);
    loadRoutineOverlay.value = 0;
    loadRoutineScale.value = 0.92;
    setShowLoadRoutinePicker(true);
    loadRoutineOverlay.value = withTiming(1, { duration: 180 });
    loadRoutineScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeLoadRoutinePicker = () => {
    loadRoutineOverlay.value = withTiming(0, { duration: 140 });
    loadRoutineScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) { runOnJS(setShowLoadRoutinePicker)(false); runOnJS(setLoadRoutineTarget)(null); }
    });
  };

  const handleLoadRoutineOntoDays = async () => {
    if (!loadRoutineTarget || loadRoutineSelectedDays.length === 0) return;
    try {
      const raw = await AsyncStorage.getItem('pj_workout_state');
      const state = raw ? JSON.parse(raw) : {};
      const newPrograms = { ...(state.programs || {}) };
      const routine = loadRoutineTarget;
      const hasCardioTag = routine.tags.includes('tag_cardio');
      const hasLiftTag = routine.tags.some(id => id !== 'tag_cardio' && id !== 'tag_rest');
      const type = hasLiftTag ? 'lift' : hasCardioTag ? 'cardio' : 'lift';
      for (const dayKey of loadRoutineSelectedDays) {
        newPrograms[dayKey] = {
          ...(newPrograms[dayKey] || {}),
          type,
          focus: routine.name,
          tags: routine.tags,
          exercises: routine.exercises.map(ex => ({ ...ex, id: makeId() })),
        };
      }
      await storageSet('pj_workout_state', JSON.stringify({ ...state, programs: newPrograms }));
      const dayNames = loadRoutineSelectedDays.map(dk => {
        const d = new Date(dk + 'T12:00:00');
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      }).join(', ');
      showToast(`${routine.name} loaded`, dayNames, 'success');
      closeLoadRoutinePicker();
    } catch (e) {}
  };

  const closeDetailModal = (onDone?: () => void) => {
    detailOverlay.value = withTiming(0, { duration: 160 });
    detailCardScale.value = withTiming(0.88, { duration: 160 });
    detailCardOpacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) {
        runOnJS(setShowDetailModal)(false);
        runOnJS(setShowDayPicker)(false);
        if (onDone) runOnJS(onDone)();
      }
    });
  };

  const openAdd = () => openAddModal(null);
  const openEdit = (ex: LibraryExercise) => openAddModal(ex);

  const saveExercise = async () => {
    if (!form.name?.trim()) return;
    let updated;
    if (editingEx) {
      updated = library.map(ex => ex.id === editingEx.id ? { ...ex, ...form } as LibraryExercise : ex);
    } else {
      const newEx: LibraryExercise = { id: makeId(), name: form.name!, type: form.type || 'lift', ...form };
      updated = [...library, newEx].sort((a, b) => a.name.localeCompare(b.name));
    }
    await saveLibrary(updated);
    setShowAddModal(false);
    showToast(editingEx ? 'Exercise saved' : 'Exercise added', undefined, 'success');
  };

  const getFilteredList = () => {
    let list = [...library];
    if (activeTab === 'favorites') list = list.filter(ex => ex.favorite);
    if (query.trim()) list = list.filter(ex => ex.name.toLowerCase().includes(query.toLowerCase()));
    if (filterType !== 'all') list = list.filter(ex => ex.type === filterType);
    if (filterTags.length > 0) list = list.filter(ex => filterTags.some(t => ex.tags?.includes(t)));
    switch (sortOption) {
      case 'az': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'za': list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'favorites': list.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)); break;
      case 'recent': list.sort((a, b) => (b.recentlyUsed || 0) - (a.recentlyUsed || 0)); break;
    }
    return list;
  };

  const filterActiveCount =
    activeTab === 'programs' ? (sortOption !== 'az' ? 1 : 0) :
    activeTab === 'routines' ? (sortOption !== 'az' ? 1 : 0) + filterTags.length :
    (sortOption !== 'az' ? 1 : 0) + (filterType !== 'all' ? 1 : 0) + filterTags.length;

  const getFilteredRoutines = (routines: Routine[]) => {
    let result = routines.filter(r =>
      (!query.trim() || r.name.toLowerCase().includes(query.toLowerCase())) &&
      (filterTags.length === 0 || r.tags.some(t => filterTags.includes(t)))
    );
    if (sortOption === 'az') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === 'za') result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    return result;
  };

  const getFilteredPrograms = (programs: CustomProgram[]) => {
    let result = programs.filter(p => !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()));
    if (sortOption === 'az') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === 'za') result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOption === 'active-first') result = [...result].sort((a, b) => activeProgramName === a.name ? -1 : activeProgramName === b.name ? 1 : 0);
    return result;
  };

  const openFilterModal = () => {
    filterOverlay.value = 0;
    filterScale.value = 0.92;
    setShowFilterModal(true);
  };

  const onFilterModalShow = () => {
    filterOverlay.value = withTiming(1, { duration: 180 });
    filterScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeFilterModal = () => {
    filterOverlay.value = withTiming(0, { duration: 140 });
    filterScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(setShowFilterModal)(false);
    });
  };

  const filteredList = getFilteredList();

  const selectExercise = async (ex: LibraryExercise, targetDay?: string) => {
    const updated = library.map(e => e.id === ex.id ? { ...e, recentlyUsed: Date.now() } : e);
    await saveLibrary(updated);
    router.push({
      pathname: '/(tabs)/workout',
      params: {
        pendingExercise: JSON.stringify({
          id: Math.random().toString(36).substr(2, 9),
          name: ex.name,
          sets: '',
          reps: '',
          rest: '',
          note: ex.note || '',
          isCardio: ex.type === 'cardio',
        }),
        pendingDay: targetDay || day,
      }
    });
  };

  const openAddModal = (ex: LibraryExercise | null = null) => {
    addOverlay.value = 0;
    addScale.value = 0.92;
    if (ex) { setEditingEx(ex); setForm({ ...ex }); }
    else { setEditingEx(null); setForm({ type: 'lift', name: '', defaultSets: '', defaultReps: '', defaultRest: '', note: '' }); }
    setShowAddModal(true);
    addOverlay.value = withTiming(1, { duration: 180 });
    addScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
  };

  const closeAddModal = () => {
    Keyboard.dismiss();
    addOverlay.value = withTiming(0, { duration: 140 });
    addScale.value = withTiming(0.92, { duration: 140 }, (finished) => {
      if (finished) runOnJS(setShowAddModal)(false);
    });
  };

  const openFabMenu = () => {
    fabItem1Anim.setValue(0);
    fabItem2Anim.setValue(0);
    fabItem3Anim.setValue(0);
    setShowFabMenu(true);
    Animated.stagger(70, [
      Animated.spring(fabItem1Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem2Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
      Animated.spring(fabItem3Anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }),
    ]).start();
  };

  const closeFabMenu = () => {
    Animated.parallel([
      Animated.timing(fabItem1Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem2Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(fabItem3Anim, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => setShowFabMenu(false));
  };

  const toggleFabMenu = () => {
    if (showFabMenu) closeFabMenu();
    else openFabMenu();
  };

  const toggleMyRoutines = () => {
    const opening = !myRoutinesExpanded;
    setMyRoutinesExpanded(opening);
    const h = myRoutinesContentH ?? 9999;
    Animated.parallel([
      Animated.timing(myRoutinesAnimHeight, {
        toValue: opening ? h : 0,
        duration: 280,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(myRoutinesOpacity, {
        toValue: opening ? 1 : 0,
        duration: opening ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(myRoutinesChevron, {
        toValue: opening ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const togglePresets = () => {
    const opening = !presetsExpanded;
    setPresetsExpanded(opening);
    const h = presetsContentH ?? 9999;
    Animated.parallel([
      Animated.timing(presetsAnimHeight, {
        toValue: opening ? h : 0,
        duration: 280,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(presetsOpacity, {
        toValue: opening ? 1 : 0,
        duration: opening ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(presetsChevron, {
        toValue: opening ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const styles = useStyles(theme);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={styles.backBtn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={18} color={theme.accentBlueRaw} />
            <Text style={styles.backBtnText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isSelectMode ? `Add to ${fmtLibraryDay(day)}` : 'Exercise Library'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View ref={libSearchRef} collapsable={false} style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1, marginRight: 8 }]}
          placeholder={activeTab === 'programs' ? 'Search programs...' : activeTab === 'routines' ? 'Search routines...' : 'Search exercises...'}
          placeholderTextColor={theme.textPlaceholder}
          value={query}
          onChangeText={setQuery}
        />
        {true && (
          <View ref={libFilterBtnRef} collapsable={false}>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openFilterModal(); }}
            style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: filterActiveCount > 0 ? theme.accentBlueBg : theme.bgInset, borderWidth: 1, borderColor: filterActiveCount > 0 ? theme.accentBlueBorder : theme.borderCard, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="options-outline" size={18} color={filterActiveCount > 0 ? theme.accentBlue : theme.textMuted} />
            {filterActiveCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#ffffff', fontSize: 9, fontFamily: 'DMSans_700Bold' }}>{filterActiveCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.tabRow}>
        {(['all', 'favorites', 'programs', 'routines'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); }}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'all' || activeTab === 'favorites' ? (
        <FlatList
          data={filteredList}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          renderItem={({ item, index }) => (
            <View ref={index === 0 ? libExerciseRowRef : undefined} collapsable={false}>
            <TouchableOpacity style={styles.exItem} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (isSelectMode) {
                selectExercise(item);
              } else {
                setSelectedEx(item);
                detailOverlay.value = 0;
                detailCardScale.value = 0.92;
                detailCardOpacity.value = 1;
                setShowDetailModal(true);
                detailOverlay.value = withTiming(1, { duration: 180 });
                detailCardScale.value = withSpring(1, { damping: 24, stiffness: 320, overshootClamping: true });
              }
            }}>
              <View style={styles.exLeft}>
                <View style={styles.exTopRow}>
                  <View style={[styles.typeBadge, item.type === 'cardio' && styles.typeBadgeCardio]}>
                    <Text style={[styles.typeBadgeText, item.type === 'cardio' && { color: theme.accentAmber }]}>
                      {item.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.exName}>{item.name}</Text>
                </View>
                {item.note ? <Text style={styles.exNote}>{item.note}</Text> : null}
              </View>
              <View style={styles.exActions}>
                {isSelectMode ? (
                  <TouchableOpacity
                    style={{ backgroundColor: theme.accentGreenBg, borderWidth: 1, borderColor: theme.accentGreenBorder, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); selectExercise(item); }}>
                    <Text style={{ color: theme.accentGreen, fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>+ Add</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavorite(item.id); }} style={{ padding: 4 }}>
                    <Ionicons name={item.favorite ? 'star' : 'star-outline'} size={18} color={item.favorite ? theme.accentAmber : theme.textDim} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="barbell-outline" size={40} color={theme.textDim} />
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginTop: 12 }}>
                {activeTab === 'favorites' ? 'No favorites yet' : 'No exercises found'}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                {activeTab === 'favorites' ? 'Star exercises to save them here.' : 'Try a different search term.'}
              </Text>
            </View>
          }
        />
      ) : activeTab === 'programs' ? (
        <View style={{ flex: 1 }}>
        <DraggableFlatList
          data={getFilteredPrograms(myPrograms)}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          onDragEnd={({ data }) => {
            if (!query.trim() && sortOption === 'az') saveMyPrograms(data);
          }}
          ListHeaderComponent={activeProgramName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bgInset, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginBottom: 16, borderWidth: 0.5, borderColor: theme.accentBlueBorder }}>
              <View>
                <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 2 }}>ACTIVE PROGRAM</Text>
                <Text style={{ fontSize: 15, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold' }}>{activeProgramName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleClearProgram(); }}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg }}>
                <Text style={{ color: theme.accentRed, fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 }}>CLEAR</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
              <Ionicons name="barbell-outline" size={40} color={theme.textDim} />
              <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginTop: 12 }}>No programs yet</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center' }}>Tap + to create your first program.</Text>
            </View>
          }
          renderItem={({ item: program, drag, isActive }: RenderItemParams<CustomProgram>) => (
            <ScaleDecorator>
              <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderRadius: 12, padding: 16, marginHorizontal: 12, marginBottom: 12, opacity: isActive ? 0.95 : 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_700Bold', flex: 1, marginRight: 8 }}>{program.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingProgram(program); setShowBuilder(true); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}>
                      <Ionicons name="pencil" size={15} color={theme.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleDeleteProgram(program); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={15} color={theme.accentRed} />
                    </TouchableOpacity>
                    <TouchableOpacity onLongPress={drag} delayLongPress={150} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                      <Ionicons name="reorder-three" size={18} color={theme.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
                {program.description ? (
                  <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 12, lineHeight: 18 }}>{program.description}</Text>
                ) : <View style={{ marginBottom: 8 }} />}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {PROGRAM_DAYS.map(d => {
                    const dp = program.days[d];
                    const tagColor = dp?.tags?.[0] ? libTags.find(t => t.id === dp.tags![0])?.color : null;
                    const col = tagColor || dp?.color || theme.borderSubtle;
                    const label = dp?.type === 'unassigned' ? 'OFF' : dp?.focus?.toUpperCase() || 'REST';
                    return (
                      <View key={d} style={{ backgroundColor: col + '22', borderWidth: 1, borderColor: col + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: col }}>{d.toUpperCase()} · {label}</Text>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleLoadProgram(program); }}
                  style={{ paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: activeProgramName === program.name ? theme.accentGreenBg : theme.accentBlueBg, borderWidth: 1, borderColor: activeProgramName === program.name ? theme.accentGreenBorder : theme.accentBlueBorder }}>
                  <Text style={{ color: activeProgramName === program.name ? theme.accentGreen : theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>
                    {activeProgramName === program.name ? 'ACTIVE' : 'LOAD PROGRAM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScaleDecorator>
          )}
        />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* My Routines section -- first */}
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleMyRoutines(); }}
            style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 10, marginTop: 4, paddingVertical: 4 }}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>MY ROUTINES</Text>
            <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderCard, marginLeft: 10, marginRight: 8 }} />
            <Animated.View style={{ transform: [{ rotate: myRoutinesChevron.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
              <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
            </Animated.View>
          </TouchableOpacity>
          <Animated.View style={[
            { overflow: 'hidden' },
            myRoutinesContentH !== null ? { height: myRoutinesAnimHeight } : {},
          ]}>
            <Animated.View style={{ opacity: myRoutinesOpacity }}
              onLayout={e => {
                const h = e.nativeEvent.layout.height;
                if (h > 0) {
                  setMyRoutinesContentH(h);
                  if (myRoutinesExpanded) myRoutinesAnimHeight.setValue(h);
                }
              }}>
              {getFilteredRoutines(myRoutines).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 32 }}>
                  <Ionicons name="repeat-outline" size={36} color={theme.textDim} />
                  <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_600SemiBold', marginTop: 12 }}>No custom routines yet</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                    Tap + to build your own, or duplicate a preset below.
                  </Text>
                </View>
              ) : (
                <DraggableFlatList
                  data={getFilteredRoutines(myRoutines)}
                  keyExtractor={r => r.id}
                  scrollEnabled={false}
                  onDragEnd={({ data }) => { if (!query.trim() && sortOption === 'az') saveMyRoutines(data); }}
                  renderItem={({ item: routine, drag, isActive }: RenderItemParams<Routine>) => (
                    <ScaleDecorator>
                      <View style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderRadius: 12, padding: 16, marginHorizontal: 12, marginBottom: 12, opacity: isActive ? 0.95 : 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 16, fontFamily: 'DMSans_700Bold', flex: 1, marginRight: 8 }}>{routine.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); saveMyRoutines(myRoutines.map(r => r.id === routine.id ? { ...r, starred: !r.starred } : r)); }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                              <Ionicons name={routine.starred ? 'star' : 'star-outline'} size={16} color={routine.starred ? theme.accentAmber : theme.textDim} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditingRoutine(routine); setShowRoutineBuilder(true); }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                              <Ionicons name="pencil" size={15} color={theme.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleDeleteRoutine(routine); }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                              <Ionicons name="trash-outline" size={15} color={theme.accentRed} />
                            </TouchableOpacity>
                            <TouchableOpacity onLongPress={drag} delayLongPress={150}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 4 }}>
                              <Ionicons name="reorder-three" size={18} color={theme.textDim} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>
                          {routine.exercises.length} EXERCISE{routine.exercises.length !== 1 ? 'S' : ''}
                        </Text>
                        {routine.exercises.length > 0 && (
                          <View style={{ marginBottom: routine.tags.length > 0 ? 10 : 14, borderRadius: 6, overflow: 'hidden', borderWidth: 0.5, borderColor: theme.borderCard }}>
                            {routine.exercises.map((ex, idx) => (
                              <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: idx % 2 === 0 ? theme.bgInset : 'transparent', borderTopWidth: idx > 0 ? 0.5 : 0, borderTopColor: theme.borderCard }}>
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ex.isCardio ? theme.accentAmber : theme.accentBlue, marginRight: 8, flexShrink: 0 }} />
                                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>{ex.name}</Text>
                                {(ex.sets || ex.reps) ? (
                                  <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'DMSans_500Medium', marginLeft: 8 }}>
                                    {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join('')}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        )}
                        {routine.tags.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                            {routine.tags.map(tagId => {
                              const tag = libTags.find(t => t.id === tagId);
                              if (!tag) return null;
                              return (
                                <View key={tagId} style={{ backgroundColor: tag.color + '99', borderWidth: 1, borderColor: tag.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{tag.label.toUpperCase()}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openLoadRoutinePicker(routine); }}
                          style={{ paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
                          <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>LOAD ROUTINE</Text>
                        </TouchableOpacity>
                      </View>
                    </ScaleDecorator>
                  )}
                />
              )}
            </Animated.View>
          </Animated.View>

          {/* Presets section -- below My Routines */}
          {(() => {
            const filtered = getFilteredRoutines(PRESET_ROUTINES);
            if (filtered.length === 0) return null;
            return (
              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); togglePresets(); }}
                  style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 10, paddingVertical: 4 }}
                  activeOpacity={0.7}>
                  <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>PRESETS</Text>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: theme.borderCard, marginLeft: 10, marginRight: 8 }} />
                  <Animated.View style={{ transform: [{ rotate: presetsChevron.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
                    <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
                  </Animated.View>
                </TouchableOpacity>
                <Animated.View style={[
                  { overflow: 'hidden' },
                  presetsContentH !== null ? { height: presetsAnimHeight } : {},
                ]}>
                  <Animated.View style={{ opacity: presetsOpacity }}
                    onLayout={e => {
                      const h = e.nativeEvent.layout.height;
                      if (h > 0) {
                        setPresetsContentH(h);
                        if (presetsExpanded) presetsAnimHeight.setValue(h);
                      }
                    }}>
                    {filtered.map(routine => (
                      <View key={routine.id} style={{ backgroundColor: theme.bgCard, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, borderRadius: 12, padding: 16, marginHorizontal: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 5 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ color: theme.textPrimary, fontSize: 15, fontFamily: 'DMSans_700Bold', flex: 1, marginRight: 8 }}>{routine.name}</Text>
                          <View style={{ backgroundColor: theme.bgInset, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'DMSans_600SemiBold', letterSpacing: 1 }}>PRESET</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 9, letterSpacing: 2, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 6 }}>
                          {routine.exercises.length} EXERCISE{routine.exercises.length !== 1 ? 'S' : ''}
                        </Text>
                        {routine.exercises.length > 0 && (
                          <View style={{ marginBottom: routine.tags.length > 0 ? 8 : 12, borderRadius: 6, overflow: 'hidden', borderWidth: 0.5, borderColor: theme.borderCard }}>
                            {routine.exercises.map((ex, idx) => (
                              <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: idx % 2 === 0 ? theme.bgInset : 'transparent', borderTopWidth: idx > 0 ? 0.5 : 0, borderTopColor: theme.borderCard }}>
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ex.isCardio ? theme.accentAmber : theme.accentBlue, marginRight: 8, flexShrink: 0 }} />
                                <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'DMSans_400Regular', flex: 1 }}>{ex.name}</Text>
                                {(ex.sets || ex.reps) ? (
                                  <Text style={{ color: theme.textDim, fontSize: 10, fontFamily: 'DMSans_500Medium', marginLeft: 8 }}>
                                    {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join('')}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        )}
                        {routine.tags.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {routine.tags.map(tagId => {
                              const tag = libTags.find(t => t.id === tagId);
                              if (!tag) return null;
                              return (
                                <View key={tagId} style={{ backgroundColor: tag.color + '99', borderWidth: 1, borderColor: tag.color, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 2, color: '#ffffff' }}>{tag.label.toUpperCase()}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openLoadRoutinePicker(routine); }}
                            style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder }}>
                            <Text style={{ color: theme.accentBlue, fontSize: 13, fontFamily: 'DMSans_700Bold', letterSpacing: 1 }}>USE</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={async () => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              const copy: Routine = { ...routine, id: makeId(), name: routine.name, isPreset: false, exercises: routine.exercises.map(e => ({ ...e, id: makeId() })) };
                              await saveMyRoutines([...myRoutines, copy]);
                              showToast('Routine duplicated', copy.name, 'success');
                            }}
                            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard }}>
                            <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Duplicate</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </Animated.View>
                </Animated.View>
              </View>
            );
          })()}
        </ScrollView>
      )}

      <Modal visible={showDetailModal} transparent animationType="none" onRequestClose={() => closeDetailModal()}>
        <ToastRenderer />
        <Reanimated.View style={[{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }, detailOverlayStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => closeDetailModal()} />
          {selectedEx ? (
            <Reanimated.View style={[{ width: '90%', maxHeight: '88%' }, detailCardStyle]}>
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: theme.bgSheet, borderRadius: 14, width: '100%', borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, overflow: 'hidden' }}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <View style={[styles.typeBadge, selectedEx.type === 'cardio' && styles.typeBadgeCardio, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                <Text style={[styles.typeBadgeText, selectedEx.type === 'cardio' && { color: theme.accentAmber }]}>{selectedEx.type.toUpperCase()}</Text>
              </View>
              <Text style={{ color: selectedEx.type === 'cardio' ? theme.accentAmber : theme.accentBlue, fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: selectedEx.note ? 4 : 12 }}>{selectedEx.name}</Text>
              {selectedEx.note ? <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 12 }}>{selectedEx.note}</Text> : null}

              {(selectedEx.primaryMuscles?.length || selectedEx.secondaryMuscles?.length) ? (
                <View style={{ marginBottom: 14 }}>
                  <MuscleMap primaryMuscles={selectedEx.primaryMuscles} secondaryMuscles={selectedEx.secondaryMuscles} scale={0.62} />
                  <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 }}>MUSCLES</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {selectedEx.primaryMuscles?.map(m => (
                      <View key={m} style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_600SemiBold' }}>
                          {m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                      </View>
                    ))}
                    {selectedEx.secondaryMuscles?.map(m => (
                      <View key={m} style={{ backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                        <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>
                          {m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedEx.instructions?.length ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10 }}>HOW TO PERFORM</Text>
                  {selectedEx.instructions.map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_700Bold' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 }}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 }}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowDayPicker(true); }}>
                <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 }}>+ ADD TO DAY</Text>
              </TouchableOpacity>

              {showDayPicker && (
                <View style={{ marginBottom: 8, backgroundColor: theme.bgInset, borderRadius: 8, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <TouchableOpacity onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 20, paddingHorizontal: 8 }}>‹</Text>
                    </TouchableOpacity>
                    <Text style={{ color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'][calMonth]} {calYear}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 20, paddingHorizontal: 8 }}>›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <Text key={i} style={{ flex: 1, textAlign: 'center', color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>{d}</Text>
                    ))}
                  </View>
                  {(() => {
                    const firstDay = new Date(calYear, calMonth, 1).getDay();
                    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                    const cells: (number | null)[] = [];
                    for (let i = 0; i < firstDay; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    const rows = [];
                    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
                    return rows.map((row, ri) => (
                      <View key={ri} style={{ flexDirection: 'row', marginBottom: 4 }}>
                        {row.map((d, ci) => {
                          if (!d) return <View key={ci} style={{ flex: 1 }} />;
                          const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const isToday = dateKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                          return (
                            <TouchableOpacity
                              key={ci}
                              style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 4, backgroundColor: isToday ? theme.accentGreenBg : 'transparent' }}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (selectedEx) closeDetailModal(() => selectExercise(selectedEx, dateKey));
                              }}>
                              <Text style={{ color: isToday ? theme.accentGreen : theme.textPrimary, fontSize: 13, fontFamily: 'DMSans_400Regular' }}>{d}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>
              )}

              <TouchableOpacity
                style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 }}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeDetailModal(() => openEdit(selectedEx!)); }}>
                <Text style={{ color: theme.accentBlue, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ padding: 12, alignItems: 'center' }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Remove Exercise', `Remove "${selectedEx.name}" from library?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); deleteExercise(selectedEx!.id); closeDetailModal(); } }
                  ]);
                }}>
                <Text style={{ color: theme.accentRed, fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>Remove from Library</Text>
              </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
            </Reanimated.View>
          ) : null}
        </Reanimated.View>
      </Modal>

      <Modal visible={showAddModal} transparent animationType="none" onRequestClose={closeAddModal}>
        <ToastRenderer />
        <Reanimated.View style={[{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 340 }, addOverlayStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeAddModal} />
          <Reanimated.View style={[{ backgroundColor: theme.bgSheet, borderRadius: 20, borderWidth: 0.5, borderColor: theme.borderCard, borderTopColor: theme.borderCardTop, width: '100%', height: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 }, addCardAnimStyle]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <Text style={styles.modalTitle}>{editingEx ? 'EDIT EXERCISE' : 'ADD EXERCISE'}</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeAddModal(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ padding: 20 }}>
                <TextInput style={styles.modalInput} placeholder="Exercise name" placeholderTextColor={theme.textPlaceholder} value={form.name || ''} onChangeText={v => setForm(p => ({ ...p, name: v }))} autoCapitalize="words" />
                <Text style={styles.modalLabel}>Type</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity style={[styles.typeBtn, form.type === 'lift' && styles.typeBtnActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, type: 'lift' })); }}>
                    <Text style={[styles.typeBtnText, form.type === 'lift' && { color: theme.accentBlue }]}>Lift</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeBtn, form.type === 'cardio' && { borderColor: `${theme.accentAmber}66`, backgroundColor: `${theme.accentAmber}1a` }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, type: 'cardio' })); }}>
                    <Text style={[styles.typeBtnText, form.type === 'cardio' && { color: theme.accentAmber }]}>Cardio</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalLabel}>Tag <Text style={{ color: theme.accentRed }}>*</Text></Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {libTags.filter(t => t.id !== 'tag_rest').map(tag => {
                    const active = form.tags?.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(p => ({ ...p, tags: [tag.id] })); }}
                        style={{ backgroundColor: active ? tag.color + '99' : 'transparent', borderWidth: 1, borderColor: active ? tag.color : theme.borderCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: active ? '#ffffff' : theme.textMuted }}>{tag.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput style={styles.modalInput} placeholder="Note (optional)" placeholderTextColor={theme.textPlaceholder} value={form.note || ''} onChangeText={v => setForm(p => ({ ...p, note: v }))} />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeAddModal(); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalSaveBtn, (!form.name?.trim() || !form.tags?.length) && { opacity: 0.4 }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); saveExercise(); }} disabled={!form.name?.trim() || !form.tags?.length}>
                    <Text style={styles.modalSaveText}>{editingEx ? 'SAVE' : 'ADD'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Reanimated.View>
        </Reanimated.View>
      </Modal>

      {/* Sort + Filter modal */}
      <Modal visible={showFilterModal} transparent animationType="none" onRequestClose={closeFilterModal} onShow={onFilterModalShow}>
        <Reanimated.View style={[{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }, filterOverlayStyle]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeFilterModal} />
          <Reanimated.View style={[{ backgroundColor: theme.bgSheet, borderRadius: 18, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 }, filterCardStyle]}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeFilterModal(); }} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.textDim }} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard }}>
              <Text style={{ color: theme.accentBlue, fontSize: 18, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 }}>{activeTab === 'programs' ? 'SORT' : 'SORT & FILTER'}</Text>
              {filterActiveCount > 0 && (
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortOption('az'); setFilterTags([]); setFilterType('all'); }} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.accentRedBorder, backgroundColor: theme.accentRedBg }}>
                  <Text style={{ color: theme.accentRed, fontSize: 11, fontFamily: 'DMSans_700Bold' }}>CLEAR</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 12 }}>SORT</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: activeTab === 'programs' ? 0 : 20 }}>
                {(activeTab === 'programs'
                  ? [['az', 'A–Z'], ['za', 'Z–A'], ['active-first', 'Active First']] as const
                  : activeTab === 'routines'
                  ? [['az', 'A–Z'], ['za', 'Z–A']] as const
                  : [['az', 'A–Z'], ['za', 'Z–A'], ['favorites', 'Favorites First'], ['recent', 'Recently Used']] as const
                ).map(([val, label]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSortOption(val as any); }}
                    style={{ backgroundColor: sortOption === val ? theme.accentBlueBg : theme.bgInset, borderWidth: 1, borderColor: sortOption === val ? theme.accentBlueBorder : theme.borderCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: sortOption === val ? theme.accentBlue : theme.textMuted }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {(activeTab === 'all' || activeTab === 'favorites') && (<>
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 12 }}>TYPE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                  {([['all', 'All'], ['lift', 'Lift'], ['cardio', 'Cardio']] as const).map(([val, label]) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterType(val); }}
                      style={{ backgroundColor: filterType === val ? theme.accentBlueBg : theme.bgInset, borderWidth: 1, borderColor: filterType === val ? theme.accentBlueBorder : theme.borderCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: filterType === val ? theme.accentBlue : theme.textMuted }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>)}
              {(activeTab === 'all' || activeTab === 'favorites' || activeTab === 'routines') && (<>
                <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 12 }}>TAG</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {libTags.filter(t => t.id !== 'tag_rest').map(tag => {
                    const active = filterTags.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilterTags(prev => active ? prev.filter(id => id !== tag.id) : [...prev, tag.id]); }}
                        style={{ backgroundColor: active ? tag.color + '99' : 'transparent', borderWidth: 1, borderColor: active ? tag.color : theme.borderCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold', color: active ? '#ffffff' : theme.textMuted }}>{tag.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>)}
            </View>
          </Reanimated.View>
        </Reanimated.View>
      </Modal>

      {/* FAB backdrop */}
      {showFabMenu && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          activeOpacity={1}
          onPress={closeFabMenu}
        />
      )}

      {/* FAB speed dial menu - each item cascades in independently */}
      {showFabMenu && (
        <View style={{ position: 'absolute', bottom: 90 + insets.bottom, right: 20, alignItems: 'flex-end', gap: 12 }}>
          {/* Create Routine - active */}
          <Animated.View style={{ opacity: fabItem3Anim, transform: [{ translateY: fabItem3Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); setEditingRoutine(null); setShowRoutineBuilder(true); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Create Routine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); setEditingRoutine(null); setShowRoutineBuilder(true); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="repeat" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Create Program - active */}
          <Animated.View style={{ opacity: fabItem2Anim, transform: [{ translateY: fabItem2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); setEditingProgram(null); setShowBuilder(true); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Create Program</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); setEditingProgram(null); setShowBuilder(true); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="calendar-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Create Exercise - active, animates first */}
          <Animated.View style={{ opacity: fabItem1Anim, transform: [{ translateY: fabItem1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); openAdd(); }}
                style={{ backgroundColor: theme.accentBlue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Create Exercise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); closeFabMenu(); openAdd(); }}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: theme.accentBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6 }}>
                <Ionicons name="barbell-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Main FAB */}
      <Animated.View ref={libFabRef} collapsable={false} style={{ position: 'absolute', bottom: 20 + insets.bottom, right: 20, transform: [{ scale: fabScale }] }}>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleFabMenu(); }}
          onPressIn={() => Animated.timing(fabScale, { toValue: 0.9, duration: 80, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(fabScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
          activeOpacity={1}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentBlue, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      {showBuilder && (
        <ProgramBuilderModal
          onClose={() => { setShowBuilder(false); setEditingProgram(null); }}
          onSave={handleSaveProgram}
          editingProgram={editingProgram}
        />
      )}

      {showRoutineBuilder && (
        <RoutineBuilderModal
          onClose={() => { setShowRoutineBuilder(false); setEditingRoutine(null); }}
          onSave={handleSaveRoutine}
          editingRoutine={editingRoutine}
          library={library}
          allTags={libTags}
        />
      )}

      {/* Load Routine Day Picker */}
      {showLoadRoutinePicker && loadRoutineTarget && (() => {
        const weekDays = getWeekDays(loadPickerWeekOffset);
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const weekLabel = loadPickerWeekOffset === 0 ? 'THIS WEEK' : loadPickerWeekOffset === 1 ? 'NEXT WEEK' : `WEEK OF ${weekDays[0].label}`;
        return (
          <Modal transparent animationType="none" visible onRequestClose={closeLoadRoutinePicker}>
            <ToastRenderer />
            <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayBg }, loadRoutineOverlayStyle]} pointerEvents="none" />
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeLoadRoutinePicker} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} pointerEvents="box-none">
              <Reanimated.View pointerEvents="box-none" style={[{ width: '100%' }, loadRoutineCardStyle]}>
                <View pointerEvents="auto" style={{ backgroundColor: theme.bgSheet, borderRadius: 16, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 2, color: theme.accentBlueRaw }}>LOAD ROUTINE</Text>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); closeLoadRoutinePicker(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 13, fontFamily: 'DMSans_400Regular', marginBottom: 20 }}>{loadRoutineTarget.name}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase' }}>{weekLabel}</Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLoadPickerWeekOffset(o => o - 1); }} disabled={loadPickerWeekOffset <= 0} style={{ padding: 6, opacity: loadPickerWeekOffset <= 0 ? 0.25 : 1 }}>
                        <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLoadPickerWeekOffset(o => o + 1); }} style={{ padding: 6 }}>
                        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
                    {weekDays.map(d => {
                      const isSelected = loadRoutineSelectedDays.includes(d.key);
                      const isToday = d.key === todayKey;
                      const isPast = d.key < todayKey;
                      return (
                        <TouchableOpacity
                          key={d.key}
                          disabled={isPast}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLoadRoutineSelectedDays(prev => prev.includes(d.key) ? prev.filter(k => k !== d.key) : [...prev, d.key]); }}
                          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: isSelected ? theme.accentBlue : theme.bgInset, borderWidth: 1, borderColor: isSelected ? theme.accentBlue : isToday ? theme.textSecondary : theme.borderCard, opacity: isPast ? 0.25 : 1 }}>
                          <Text style={{ fontSize: 10, fontFamily: 'DMSans_700Bold', color: isSelected ? '#ffffff' : theme.textMuted, letterSpacing: 0.5 }}>{d.name.toUpperCase()}</Text>
                          <Text style={{ fontSize: 9, fontFamily: 'DMSans_400Regular', color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textDim, marginTop: 2 }}>{d.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLoadRoutineOntoDays(); }}
                    disabled={loadRoutineSelectedDays.length === 0}
                    style={{ paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: theme.accentBlue, opacity: loadRoutineSelectedDays.length > 0 ? 1 : 0.4 }}>
                    <Text style={{ color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 2 }}>
                      LOAD TO {loadRoutineSelectedDays.length} {loadRoutineSelectedDays.length === 1 ? 'DAY' : 'DAYS'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Reanimated.View>
            </View>
          </Modal>
        );
      })()}

      {/* ── Tutorial inline detail view ─────────────────────────────────────────
          Renders the exercise detail as a View (not Modal) so TutorialOverlay
          can measure refs inside it. Only active during exercise_library tutorial. */}
      {showTutorialDetail && selectedEx && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Reanimated.View style={[{ flex: 1, backgroundColor: theme.overlayBg, justifyContent: 'center', alignItems: 'center' }, detailOverlayStyle]}>
            <Reanimated.View style={[{ width: '90%', maxHeight: '88%' }, detailCardStyle]}>
              <View style={{ backgroundColor: theme.bgSheet, borderRadius: 14, borderWidth: 0.5, borderTopWidth: 1.5, borderColor: theme.borderCard, borderTopColor: theme.accentBlueRaw, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, overflow: 'hidden' }}>
                <ScrollView scrollEnabled={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                  <View style={[styles.typeBadge, selectedEx.type === 'cardio' && styles.typeBadgeCardio, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                    <Text style={[styles.typeBadgeText, selectedEx.type === 'cardio' && { color: theme.accentAmber }]}>{selectedEx.type.toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: selectedEx.type === 'cardio' ? theme.accentAmber : theme.accentBlue, fontSize: 22, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1, marginBottom: 12 }}>{selectedEx.name}</Text>

                  <View ref={libMuscleMapRef} collapsable={false}>
                    {(selectedEx.primaryMuscles?.length || selectedEx.secondaryMuscles?.length) ? (
                      <View style={{ marginBottom: 14 }}>
                        <MuscleMap primaryMuscles={selectedEx.primaryMuscles} secondaryMuscles={selectedEx.secondaryMuscles} scale={0.62} />
                        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 8, marginTop: 12 }}>MUSCLES</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {selectedEx.primaryMuscles?.map(m => (
                            <View key={m} style={{ backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                              <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_600SemiBold' }}>
                                {m.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              </Text>
                            </View>
                          ))}
                          {selectedEx.secondaryMuscles?.map(m => (
                            <View key={m} style={{ backgroundColor: theme.bgInset, borderWidth: 1, borderColor: theme.borderCard, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                              <Text style={{ color: theme.textMuted, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>
                                {m.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {selectedEx.instructions?.length ? (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginBottom: 10 }}>HOW TO PERFORM</Text>
                        {selectedEx.instructions.map((step, i) => (
                          <View key={i} style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.accentBlueBg, borderWidth: 1, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              <Text style={{ color: theme.accentBlue, fontSize: 11, fontFamily: 'DMSans_700Bold' }}>{i + 1}</Text>
                            </View>
                            <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 }}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </ScrollView>
              </View>
            </Reanimated.View>
          </Reanimated.View>
        </View>
      )}
    </View>
  );
}

const useStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: theme.borderCard },
  backBtn: { width: 60 },
  backBtnText: { color: theme.accentBlueRaw, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  headerTitle: { fontSize: 22, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  searchRow: { padding: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
  searchInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 8, color: theme.textPrimary, padding: 12, fontSize: 14, fontFamily: 'DMSans_400Regular' },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 8, backgroundColor: theme.bgProgressTrack, borderRadius: 8, padding: 4 },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: theme.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },
  tabText: { fontSize: 12, color: theme.textMuted, fontFamily: 'DMSans_500Medium' },
  tabTextActive: { color: theme.textPrimary, fontFamily: 'DMSans_700Bold' },
  sectionLabel: { fontSize: 9, letterSpacing: 3, color: theme.textMuted, fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', marginHorizontal: 16, marginBottom: 10 },
  exItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, marginHorizontal: 12, marginVertical: 4, borderRadius: 10, borderWidth: 0.5, borderLeftWidth: 3, borderColor: theme.borderCard, borderTopColor: 'rgba(255,255,255,0.1)', borderLeftColor: theme.accentBlueRaw, backgroundColor: theme.bgCard, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  exLeft: { flex: 1, marginRight: 12 },
  exTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  typeBadge: { backgroundColor: theme.accentBlueBg, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  typeBadgeCardio: { backgroundColor: `${theme.accentAmber}26` },
  typeBadgeText: { fontSize: 8, color: theme.accentBlue, fontFamily: 'DMSans_700Bold', letterSpacing: 1 },
  exName: { fontSize: 14, color: theme.textPrimary, fontFamily: 'DMSans_600SemiBold', flex: 1 },
  exNote: { fontSize: 11, color: theme.textDim, fontStyle: 'italic', fontFamily: 'DMSans_400Regular' },
  exActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 22, color: theme.accentBlueRaw, fontFamily: 'BebasNeue_400Regular', letterSpacing: 1 },
  modalInput: { backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, color: theme.textPrimary, padding: 10, fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 10 },
  modalLabel: { fontSize: 11, color: theme.textMuted, fontFamily: 'DMSans_500Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 10, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  typeBtnActive: { backgroundColor: theme.accentBlueBg, borderColor: theme.accentBlueBorder },
  typeBtnText: { color: theme.textMuted, fontSize: 14, fontFamily: 'DMSans_500Medium' },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 12, backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 6, alignItems: 'center' },
  modalCancelText: { color: theme.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 14 },
  modalSaveBtn: { flex: 1, padding: 12, backgroundColor: theme.accentBlue, borderRadius: 6, alignItems: 'center' },
  modalSaveText: { color: '#ffffff', fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
});
