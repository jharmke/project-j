import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncKey } from '../services/syncService';

// Write to AsyncStorage first (awaited), then mirror to Firestore silently.
// Drop-in replacement for AsyncStorage.setItem everywhere pj_* keys are written.
export async function storageSet(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
  syncKey(key, value); // intentionally not awaited
}
