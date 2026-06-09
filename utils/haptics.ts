import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

async function isEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem('pj_settings');
    return raw ? (JSON.parse(raw).hapticsEnabled ?? true) : true;
  } catch {
    return true;
  }
}

export function triggerHaptic(style: Haptics.ImpactFeedbackStyle): void {
  isEnabled().then(enabled => {
    if (enabled) Haptics.impactAsync(style).catch(() => {});
  });
}

export function triggerHapticNotification(type: Haptics.NotificationFeedbackType): void {
  isEnabled().then(enabled => {
    if (enabled) Haptics.notificationAsync(type).catch(() => {});
  });
}

export function triggerHapticSelection(): void {
  isEnabled().then(enabled => {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  });
}
