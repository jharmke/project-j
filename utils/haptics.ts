import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Cached synchronously so a haptic never waits on a storage read before firing -- that wait was landing
// behind whatever the tap was also doing (e.g. a navigation), so the buzz felt tied to the destination
// screen instead of the tap. Defaults enabled (matches prior fallback) until the first refresh lands, then
// stays current via a fire-and-forget refresh after every call.
let cachedEnabled = true;

function refreshEnabledCache(): void {
  AsyncStorage.getItem('pj_settings')
    .then(raw => { cachedEnabled = raw ? (JSON.parse(raw).hapticsEnabled ?? true) : true; })
    .catch(() => { cachedEnabled = true; });
}
refreshEnabledCache();

export function triggerHaptic(style: Haptics.ImpactFeedbackStyle): void {
  if (cachedEnabled) Haptics.impactAsync(style).catch(() => {});
  refreshEnabledCache();
}

export function triggerHapticNotification(type: Haptics.NotificationFeedbackType): void {
  if (cachedEnabled) Haptics.notificationAsync(type).catch(() => {});
  refreshEnabledCache();
}

export function triggerHapticSelection(): void {
  if (cachedEnabled) Haptics.selectionAsync().catch(() => {});
  refreshEnabledCache();
}
