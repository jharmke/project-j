import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

/**
 * Shared top-left header avatar. Lives on every tab header so the user's
 * profile is reachable from anywhere. Shows up to two initials from the
 * profile name, or a person icon when no name is set. Photo upload waits on
 * the Firebase Storage migration. Tapping opens the Profile screen.
 */
export default function HeaderAvatar() {
  const { theme } = useTheme();
  const [name, setName] = useState('');

  // Reload the name each time the owning tab regains focus so an edit in
  // Profile is reflected without an app restart.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem('pj_profile').then(raw => {
        if (!active) return;
        try {
          const p = raw ? JSON.parse(raw) : null;
          setName(p?.name ? p.name : '');
        } catch {
          setName('');
        }
      });
      return () => { active = false; };
    }, [])
  );

  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate('/profile'); }}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bgCard, borderWidth: 1.5, borderColor: theme.accentBlueBorder, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}>
      {initials
        ? <Text style={{ fontSize: 15, fontFamily: 'DMSans_700Bold', color: theme.accentBlue, letterSpacing: 0.5 }}>{initials}</Text>
        : <Ionicons name="person" size={20} color={theme.accentBlue} />}
    </TouchableOpacity>
  );
}
