import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { triggerHaptic } from '@/utils/haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { deleteObject, ref } from 'firebase/storage';
import { auth, storage } from '../firebaseConfig';
import { storageSet } from '../utils/storage';
import { useTheme } from '../theme';
import { Type } from '../typography';

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
  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // Reload the name/photo each time the owning tab regains focus so an edit in
  // Profile is reflected without an app restart.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem('pj_profile').then(raw => {
        if (!active) return;
        try {
          const p = raw ? JSON.parse(raw) : null;
          setName(p?.name ? p.name : '');
          setPhotoURL(p?.photoURL ? p.photoURL : null);
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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      const raw = await AsyncStorage.getItem('pj_profile');
      const p = raw ? JSON.parse(raw) : {};
      await storageSet('pj_profile', JSON.stringify({ ...p, photoURL: null }));
      setPhotoURL(null);
      if (auth.currentUser) {
        try { await deleteObject(ref(storage, `users/${auth.currentUser.uid}/profile_photo.jpg`)); } catch {}
      }
    } catch {}
  };

  const openPicker = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const removeOption = photoURL ? ['Remove Photo'] : [];
    if (Platform.OS === 'ios') {
      const options = ['Take Photo', 'Choose from Library', ...removeOption, 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: photoURL ? 2 : undefined },
        (i) => {
          if (i === 0) takePhoto();
          else if (i === 1) pickFromLibrary();
          else if (photoURL && i === 2) removePhoto();
        },
      );
    } else {
      const buttons: any[] = [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
      ];
      if (photoURL) buttons.push({ text: 'Remove Photo', style: 'destructive', onPress: removePhoto });
      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Profile Photo', undefined, buttons);
    }
  };

  const avatarInner = photoURL
    ? <Image source={{ uri: photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
    : initials
      ? <Text style={{ fontSize: 15, fontFamily: Type.uiBold, color: theme.accentBlue, letterSpacing: 0.5 }}>{initials}</Text>
      : <Ionicons name="person" size={20} color={theme.accentBlue} />;

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
          onPress={openPicker}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9,
            backgroundColor: theme.accentBlue, borderWidth: 2, borderColor: theme.bgPrimary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={12} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
