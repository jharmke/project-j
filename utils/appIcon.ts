import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppIconName, setAlternateAppIcon, resetAppIcon } from 'expo-alternate-app-icons';

// ─── Alternate app icon (the gold Supporter icon) ────────────────────────────
// The gold icon is a Supporter perk. Everything about it is guarded, because it's a NATIVE feature and
// must never be able to take the app down:
//   - every call is wrapped: on a build without the native module (or on Android/simulator quirks) it
//     no-ops instead of throwing.
//   - iOS shows its own unavoidable system alert when an app changes icon ("You have changed the icon
//     for..."). Apple enforces that; we can't suppress it, and shouldn't try.
//   - the icon is DEVICE-LOCAL. It doesn't sync across a user's devices, so we don't try to store it in
//     the cloud -- it lives in local settings only.
//
// LAPSE GUARD: if someone stops being a Supporter while wearing the gold icon, enforceIconEntitlement()
// puts them back on the default. Otherwise the perk outlives the membership that paid for it.

export const GOLD_ICON = 'Gold';   // must match the `name` in app.json's expo-alternate-app-icons config
const PREF_KEY = 'pj_app_icon';    // 'gold' | 'default'

export function isGoldIconActive(): boolean {
  try {
    return getAppIconName() === GOLD_ICON;
  } catch {
    return false;
  }
}

// Returns true if the icon actually changed.
export async function setGoldIcon(on: boolean): Promise<boolean> {
  try {
    if (on) await setAlternateAppIcon(GOLD_ICON);
    else await resetAppIcon();
    await AsyncStorage.setItem(PREF_KEY, on ? 'gold' : 'default');
    return true;
  } catch (e) {
    console.warn('App icon change failed:', e);
    return false;
  }
}

// Call on launch / when entitlement changes. A non-Supporter can't keep the gold icon.
export async function enforceIconEntitlement(isSupporter: boolean): Promise<void> {
  try {
    if (isSupporter) return;
    if (!isGoldIconActive()) return;
    await resetAppIcon();
    await AsyncStorage.setItem(PREF_KEY, 'default');
  } catch {
    // Native module absent or the OS refused -- nothing to do, and never worth a crash.
  }
}
