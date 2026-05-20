import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// pj_bible_* keys are cached GitHub content -- re-fetchable and potentially thousands of docs
const EXCLUDE_PREFIXES = ['pj_bible_'];

function shouldSync(key: string): boolean {
  if (!key.startsWith('pj_')) return false;
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

// Called on login. Only restores if local storage has no pj_* data (fresh device).
// Returns true if data was restored.
export async function restoreIfFresh(): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const hasPjData = allKeys.some(k => shouldSync(k));
    if (hasPjData) return false;

    const snap = await getDocs(collection(db, 'users', uid, 'store'));
    if (snap.empty) return false;

    const pairs: [string, string][] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.key && data.value) pairs.push([data.key, data.value]);
    });

    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
    return pairs.length > 0;
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
