import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { deleteObject, ref } from 'firebase/storage';
import { auth, storage } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { Type } from '../typography';
import GradientIcon from './GradientIcon';
import PhotoOptionsModal from './PhotoOptionsModal';

// Module-level cache (outside the component) so every HeaderAvatar instance across the app shares
// one last-known-good value. Each tab header is a SEPARATE component instance that reads pj_profile
// itself on first mount -- without this, the very first visit to each tab renders the blank default
// icon for a beat before the async read resolves and swaps in the real photo. Seeding new instances
// from this cache means only the very first tab touched in a session can ever show that flash.
let cache: { name: string; photoURL: string | null } | null = null;

/**
 * Shared top-left header avatar. Lives on every tab header so the user's
 * profile is reachable from anywhere. Shows the user's photo if one is set,
 * otherwise up to two initials from the profile name, or a person icon when
 * no name is set. Tapping opens the Profile screen -- except when `editable`
 * is set (Profile screen's own header), where the avatar itself is inert
 * (there's nowhere to navigate to) and a small plus badge opens the photo
 * picker -> crop flow instead.
 */
export default function HeaderAvatar({ inert = false, editable = false }: { inert?: boolean; editable?: boolean }) {
  const { theme } = useTheme();
  const [name, setName] = useState(cache?.name ?? '');
  const [photoURL, setPhotoURL] = useState<string | null>(cache?.photoURL ?? null);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Reload the name/photo each time the owning tab regains focus so an edit in
  // Profile is reflected without an app restart.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem('pj_profile').then(raw => {
        if (!active) return;
        try {
          const p = raw ? JSON.parse(raw) : null;
          const nextName = p?.name ? p.name : '';
          const nextPhoto = p?.photoURL ? p.photoURL : null;
          setName(nextName);
          setPhotoURL(nextPhoto);
          cache = { name: nextName, photoURL: nextPhoto };
        } catch {
          setName('');
          setPhotoURL(null);
        }
      });
      return () => { active = false; };
    }, [])
  );

  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Allow photo access in Settings to set a profile photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    applyPicked(res);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take a profile photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.9 });
    applyPicked(res);
  };

  const applyPicked = (res: ImagePicker.ImagePickerResult) => {
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    router.push({
      pathname: '/profile-photo-crop',
      params: { uri: a.uri, width: String(a.width ?? 0), height: String(a.height ?? 0) },
    });
  };

  const removePhoto = async () => {
    try {
      const raw = await AsyncStorage.getItem('pj_profile');
      const p = raw ? JSON.parse(raw) : {};
      await storageSet('pj_profile', JSON.stringify({ ...p, photoURL: null }));
      setPhotoURL(null);
      cache = { name, photoURL: null };
      if (auth.currentUser) {
        try { await deleteObject(ref(storage, `users/${auth.currentUser.uid}/profile_photo.jpg`)); } catch {}
      }
    } catch {}
  };

  const avatarInner = photoURL
    ? <Image source={{ uri: photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
    : initials
      ? <Text style={{ fontSize: 15, fontFamily: Type.uiBold, color: theme.accentBlue, letterSpacing: 0.5 }}>{initials}</Text>
      : <GradientIcon name="person" size={20} color={theme.accentBlueRaw} />;

  return (
    <View>
      <TouchableOpacity
        onPress={inert || editable ? undefined : () => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); router.navigate('/profile'); }}
        disabled={inert || editable}
        activeOpacity={inert || editable ? 1 : 0.8}
        hitSlop={inert || editable ? undefined : { top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgCard, borderWidth: 1.5, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}>
        {avatarInner}
      </TouchableOpacity>
      {editable && (
        <TouchableOpacity
          onPress={() => { triggerHaptic(Haptics.ImpactFeedbackStyle.Light); setPickerVisible(true); }}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: 9,
            backgroundColor: theme.bgCard, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {/* add-circle's plus mark is a transparent knockout in the glyph -- without an opaque
              backing behind it, the "plus" has nothing to contrast against and just disappears. */}
          <GradientIcon name="add-circle" size={18} color={theme.accentBlueRaw} />
        </TouchableOpacity>
      )}
      <PhotoOptionsModal
        visible={pickerVisible}
        hasPhoto={!!photoURL}
        onClose={() => setPickerVisible(false)}
        onTakePhoto={() => { setPickerVisible(false); takePhoto(); }}
        onChooseLibrary={() => { setPickerVisible(false); pickFromLibrary(); }}
        onRemove={() => { setPickerVisible(false); removePhoto(); }}
      />
    </View>
  );
}
