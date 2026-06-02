import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// pj_bible_* keys are cached GitHub content -- re-fetchable and potentially thousands of docs
const EXCLUDE_PREFIXES = ['pj_bible_'];

// Local-only gate -- never synced to Firestore, never restored. Marks that this
// install has already run restoreIfFresh so we don't repeat it on every cold launch.
const RESTORE_GATE_KEY = 'pj_fresh_restore_done';

function shouldSync(key: string): boolean {
  if (!key.startsWith('pj_')) return false;
  if (key === RESTORE_GATE_KEY) return false;
  // Journal entries live under a pj_bible_ key but are precious user data, not the
  // re-fetchable chapter cache the exclude list targets, so force them to sync.
  if (key === 'pj_bible_reflections') return true;
  return !EXCLUDE_PREFIXES.some(p => key.startsWith(p));
}

function safeDocId(key: string): string {
  return key.replace(/\//g, '_');
}

// Fire-and-forget mirror write. Never throws, never blocks local saves.
export async function syncKey(key: string, value: string): Promise<void> {
  if (!shouldSync(key)) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  try {
    const ref = doc(db, 'users', uid, 'store', safeDocId(key));
    await setDoc(ref, { key, value, updatedAt: Date.now() });
  } catch {
    // Intentionally swallowed -- sync failure must never break local saves
  }
}

// Called on login. Restores from Firestore on first run after a fresh install or reinstall.
// Gate key (local-only, never synced) prevents repeat runs on subsequent cold launches.
// Returns true if data was restored.
export async function restoreIfFresh(): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    if (allKeys.includes(RESTORE_GATE_KEY)) return false;

    const snap = await getDocs(collection(db, 'users', uid, 'store'));
    if (snap.empty) {
      await AsyncStorage.setItem(RESTORE_GATE_KEY, 'true');
      return false;
    }

    const pairs: [string, string][] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.key && data.value) pairs.push([data.key, data.value]);
    });

    const existingKeys = await AsyncStorage.getAllKeys();
    const newPairs = pairs.filter(([key]) => !existingKeys.includes(key));
    if (newPairs.length > 0) await AsyncStorage.multiSet(newPairs);
    await AsyncStorage.setItem(RESTORE_GATE_KEY, 'true');
    return newPairs.length > 0;
  } catch {
    return false;
  }
}

// One-time upload of all local pj_* data to Firestore. Safe to run any time.
// Returns number of keys uploaded.
export async function uploadAllLocal(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const pjKeys = allKeys.filter(shouldSync);
    const pairs = await AsyncStorage.multiGet(pjKeys);
    const promises = pairs
      .filter(([, value]) => value !== null)
      .map(([key, value]) => {
        const ref = doc(db, 'users', uid, 'store', safeDocId(key));
        return setDoc(ref, { key, value, updatedAt: Date.now() });
      });
    await Promise.all(promises);
    return promises.length;
  } catch {
    return 0;
  }
}
