import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { triggerHaptic } from '@/utils/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useToast } from '../components/Toast';
import { useTheme } from '../theme';
import { Type } from '../typography';

// Full-screen "move and scale" crop step between picking a profile photo and saving it.
// Black background regardless of app theme -- standard for a photo-editing context, keeps
// focus on the image, matches the system photo picker's own crop screen. Pinch to zoom,
// drag to reposition; the circular window always stays fully covered by the image (scale
// is clamped so you can never zoom out past "image fills the circle").

const { width: SCREEN_W } = Dimensions.get('window');
const CROP_SIZE = Math.min(SCREEN_W - 64, 320);
const MAX_PINCH = 5;

function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
}

export default function ProfilePhotoCrop() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { uri, width: wParam, height: hParam } = useLocalSearchParams<{ uri: string; width: string; height: string }>();
  const [saving, setSaving] = useState(false);

  const imgW = Number(wParam) || CROP_SIZE;
  const imgH = Number(hParam) || CROP_SIZE;
  const baseScale = CROP_SIZE / Math.min(imgW, imgH);
  const dispW = imgW * baseScale;
  const dispH = imgH * baseScale;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      const next = clamp(savedScale.value * e.scale, 1, MAX_PINCH);
      scale.value = next;
      const maxX = Math.max(0, (dispW * next - CROP_SIZE) / 2);
      const maxY = Math.max(0, (dispH * next - CROP_SIZE) / 2);
      translateX.value = clamp(translateX.value, -maxX, maxX);
      translateY.value = clamp(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      const maxX = Math.max(0, (dispW * scale.value - CROP_SIZE) / 2);
      const maxY = Math.max(0, (dispH * scale.value - CROP_SIZE) / 2);
      translateX.value = clamp(savedTranslateX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedTranslateY.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const imageStyle = useAnimatedStyle(() => ({
    width: dispW,
    height: dispH,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const cancel = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const confirm = async () => {
    if (saving || !uri || !auth.currentUser) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const totalScale = baseScale * scale.value;
      const originX = clamp((dispW * scale.value) / 2 - CROP_SIZE / 2 - translateX.value, 0, imgW) / totalScale;
      const originY = clamp((dispH * scale.value) / 2 - CROP_SIZE / 2 - translateY.value, 0, imgH) / totalScale;
      const cropSize = CROP_SIZE / totalScale;
      const boundedOriginX = Math.min(originX, Math.max(0, imgW - cropSize));
      const boundedOriginY = Math.min(originY, Math.max(0, imgH - cropSize));

      const context = ImageManipulator.manipulate(uri)
        .crop({ originX: boundedOriginX, originY: boundedOriginY, width: cropSize, height: cropSize })
        .resize({ width: 512, height: 512 });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

      const r = ref(storage, `users/${auth.currentUser.uid}/profile_photo.jpg`);
      const response = await fetch(saved.uri);
      const blob = await response.blob();
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      const photoURL = await getDownloadURL(r);

      const raw = await AsyncStorage.getItem('pj_profile');
      const p = raw ? JSON.parse(raw) : {};
      await storageSet('pj_profile', JSON.stringify({ ...p, photoURL }));

      showToast('Profile photo updated', undefined, 'success');
      router.back();
    } catch {
      showToast('Could not save photo', 'Please try again', 'error');
      setSaving(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={[styles.topBar, { paddingTop: 54 }]}>
        <TouchableOpacity onPress={cancel} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.topBarText, { color: saving ? 'rgba(255,255,255,0.35)' : '#ffffff' }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { fontFamily: Type.uiSemibold }]}>Move and Scale</Text>
        <TouchableOpacity onPress={confirm} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {saving
            ? <ActivityIndicator size="small" color={theme.accentBlue} />
            : <Text style={[styles.topBarText, { color: theme.accentBlue, fontFamily: Type.uiBold }]}>Choose</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <GestureDetector gesture={composedGesture}>
          <View style={{ width: CROP_SIZE, height: CROP_SIZE, overflow: 'hidden' }}>
            <View style={{ width: CROP_SIZE, height: CROP_SIZE, alignItems: 'center', justifyContent: 'center' }}>
              <Reanimated.View style={imageStyle}>
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
              </Reanimated.View>
            </View>

            {/* Decorative only -- wrapped in a plain View with pointerEvents="none" because setting
                that prop directly on <Svg> doesn't reliably stop it from intercepting touches on iOS,
                which is what silently ate every pinch/pan gesture the first time this shipped. Scoped
                to the same CROP_SIZE box as the gesture target (not full-screen) so the circle guide
                can never drift out of alignment with the square that actually gets cropped. */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
              <Svg width={CROP_SIZE} height={CROP_SIZE}>
                <Defs>
                  <Mask id="cropMask">
                    <Rect x={0} y={0} width={CROP_SIZE} height={CROP_SIZE} fill="#ffffff" />
                    <Circle cx={CROP_SIZE / 2} cy={CROP_SIZE / 2} r={CROP_SIZE / 2} fill="#000000" />
                  </Mask>
                </Defs>
                <Rect x={0} y={0} width={CROP_SIZE} height={CROP_SIZE} fill="rgba(0,0,0,0.7)" mask="url(#cropMask)" />
                <Circle cx={CROP_SIZE / 2} cy={CROP_SIZE / 2} r={CROP_SIZE / 2 - 1} stroke="#ffffff" strokeWidth={1.5} fill="none" />
              </Svg>
            </View>
          </View>
        </GestureDetector>
      </View>

      <View style={{ paddingBottom: 60, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: Type.ui }}>Pinch to zoom, drag to reposition</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  topBarText: { fontSize: 16 },
  topBarTitle: { fontSize: 15, color: '#ffffff' },
});
