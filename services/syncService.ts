import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// pj_bible_* keys are cached GitHub content -- re-fetchable and potentially thousands of docs
const EXCLUDE_PREFIXES = ['pj_bible_'];

// Local-only gate -- never synced to Firestore, never restored. Marks that this
// install has already run restoreIfFresh so we don't repeat it on every cold launch.
const RESTORE_GATE_KEY = 'pj_fresh_restore_done';

// Local-only stamp recording which Firebase UID the local pj_* data belongs to.
// Survives sign-out on purpose: it is how the restore gate detects an account switch
// (incoming uid != stamped owner) so one account's local data can never be uploaded
// under another account's uid. Never synced, never restored.
const DATA_OWNER_KEY = 'pj_data_owner_uid';

// ── Sync lock (reinstall clobber protection) ──────────────────────────────────
// Cloud writes stay LOCKED until the restore gate (runRestoreGate) has run for the
// signed-in user. This is the core protection against the reinstall clobber: a fresh,
// empty, or mid-onboarding local state can NEVER upload over good cloud data before
// that cloud data has been pulled down. The gate unlocks sync only after it has either
// restored the account, confirmed a brand-new (empty-cloud) user, or confirmed an
// existing install. On a cloud-unreachable error it stays LOCKED (no upload, no wipe)
// and retries on the next launch.
export type RestoreGateResult = 'restored' | 'existing' | 'new-user' | 'error' | 'no-auth';

let syncReady = false;
let gatePromise: Promise<RestoreGateResult> | null = null;

export function markSyncReady(): void { syncReady = true; }
export function isSyncReady(): boolean { return syncReady; }

// Re-lock + clear the memoized gate. Called on sign-out so a different account that
// signs in re-runs the gate from scratch (never blends accounts, never syncs to a uid
// before that account's cloud data has been pulled down).
export function resetRestoreGate(): void { syncReady = false; gatePromise = null; }

export function shouldSync(key: string): boolean {
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
  if (!syncReady) return; // LOCKED until the restore gate runs (clobber protection)
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
  if (!syncReady) return 0; // never upload before the restore gate has run
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

// ── Restore gate ──────────────────────────────────────────────────────────────
// Runs once per session (memoized). Decides what a signed-in launch should do and
// unlocks sync only when it is provably safe:
//   - existing install (real data already local) -> just unlock sync, never overwrite
//   - fresh install + cloud has the account       -> restore everything, then unlock
//   - fresh install + cloud confirmed empty        -> brand-new user, unlock (let them onboard)
//   - cloud unreachable                            -> stay LOCKED, no wipe, retry next launch
// The error/no-auth results are NOT memoized so a later attempt (or relaunch) can retry.
export function runRestoreGate(): Promise<RestoreGateResult> {
  if (!gatePromise) {
    gatePromise = _runRestoreGate().then((result) => {
      if (result === 'error' || result === 'no-auth') gatePromise = null; // allow retry
      return result;
    });
  }
  return gatePromise;
}

// Fetch the signed-in user's whole cloud store, retrying a few times so a transient
// network hiccup is not mistaken for an empty account. Returns null if unreachable.
async function fetchCloudSnapshot(uid: string): Promise<Awaited<ReturnType<typeof getDocs>> | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getDocs(collection(db, 'users', uid, 'store'));
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
    }
  }
  return null;
}

function snapshotToPairs(snap: Awaited<ReturnType<typeof getDocs>>): [string, string][] {
  const pairs: [string, string][] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    if (data.key && data.value) pairs.push([data.key, data.value]);
  });
  return pairs;
}

// Wipe every local pj_* key. ONLY called after an incoming account's cloud snapshot is
// already in hand (account-switch path), so the data being cleared belongs to a different
// account that already has it safely in its own cloud. Never called on the normal path.
async function clearLocalPjData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const pjKeys = keys.filter((k) => k.startsWith('pj_'));
  if (pjKeys.length > 0) await AsyncStorage.multiRemove(pjKeys);
}

async function stampOwner(uid: string): Promise<void> {
  try { await AsyncStorage.setItem(DATA_OWNER_KEY, uid); } catch {}
}

// ── Backup verification (read-only) ───────────────────────────────────────────
// Cross-checks LOCAL data against the cloud so we can prove nothing is missing,
// instead of trusting a raw key count. Two layers:
//   - every syncable pj_* key is confirmed present in Firestore;
//   - every food-photo key is checked for a real CLOUD URL value (an http URL means
//     the IMAGE is in Firebase Storage; a local file path means the image is local-only
//     and would die on reinstall -- the exact failure mode that lost photos before).
// Reads only; never writes, never deletes.
export interface BackupReport {
  totalLocalKeys: number;
  syncableKeys: number;
  keysInCloud: number;
  keysMissing: string[];
  photoTotal: number;
  photosCloudSafe: number;
  photosAtRisk: string[]; // foodIds whose photo is local-only (no cloud image)
  cloudReachable: boolean;
  signedIn: boolean;
}

export async function verifyBackup(): Promise<BackupReport> {
  const base: BackupReport = {
    totalLocalKeys: 0, syncableKeys: 0, keysInCloud: 0, keysMissing: [],
    photoTotal: 0, photosCloudSafe: 0, photosAtRisk: [], cloudReachable: false, signedIn: false,
  };
  const uid = auth.currentUser?.uid;
  if (!uid) return base;
  base.signedIn = true;

  const allKeys = await AsyncStorage.getAllKeys();
  base.totalLocalKeys = allKeys.length;
  const syncable = allKeys.filter(shouldSync);
  base.syncableKeys = syncable.length;

  // Photo cloud-safety (value is an http cloud URL vs a local file path).
  const photoKeys = allKeys.filter(k => k.startsWith('pj_food_photo_'));
  base.photoTotal = photoKeys.length;
  const photoPairs = await AsyncStorage.multiGet(photoKeys);
  for (const [k, v] of photoPairs) {
    if (v && v.startsWith('http')) base.photosCloudSafe++;
    else base.photosAtRisk.push(k.slice('pj_food_photo_'.length));
  }

  // Confirm each syncable key exists in the cloud.
  const snap = await fetchCloudSnapshot(uid);
  if (!snap) return base; // cloudReachable stays false
  base.cloudReachable = true;
  const cloudKeys = new Set<string>();
  snap.forEach(d => { const data = d.data() as any; if (data.key) cloudKeys.add(data.key); });
  base.keysMissing = syncable.filter(k => !cloudKeys.has(k));
  base.keysInCloud = syncable.length - base.keysMissing.length;
  return base;
}

async function _runRestoreGate(): Promise<RestoreGateResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 'no-auth'; // nothing to do without a user; sync stays locked

  // Which account does the local data belong to? (Stamp survives sign-out on purpose.)
  let owner: string | null = null;
  try {
    owner = await AsyncStorage.getItem(DATA_OWNER_KEY);
  } catch {
    // Storage unreadable: safe default, treat as existing, never blind-overwrite.
    markSyncReady();
    return 'existing';
  }

  // ── Account switch ──────────────────────────────────────────────────────────
  // Local data belongs to a DIFFERENT account. That account's data is already in its
  // own cloud (synced while it was active), so we must NEVER upload it under this uid.
  // Pull THIS account's cloud FIRST; only once it is in hand do we clear the previous
  // account's local data and replace it. Cloud unreachable => stay LOCKED, do not wipe.
  if (owner && owner !== uid) {
    const snap = await fetchCloudSnapshot(uid);
    if (!snap) return 'error';
    await clearLocalPjData();
    const pairs = snapshotToPairs(snap);
    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
    await stampOwner(uid);
    markSyncReady();
    return snap.empty ? 'new-user' : 'restored';
  }

  // ── Same account (or first run on an un-stamped existing install) ─────────────
  // Existing install: real data already present locally. Local is authoritative (it may
  // hold newer-than-cloud changes), so do NOT overwrite it; just stamp + turn sync on.
  let onboarded: string | null = null;
  try {
    onboarded = await AsyncStorage.getItem('pj_onboarding_complete');
  } catch {
    await stampOwner(uid);
    markSyncReady();
    return 'existing';
  }
  if (onboarded === 'true') { await stampOwner(uid); markSyncReady(); return 'existing'; }

  // Fresh install (not onboarded locally). Pull the account from the cloud BEFORE any
  // onboarding write can clobber it.
  const snap = await fetchCloudSnapshot(uid);
  if (!snap) return 'error'; // cloud unreachable: stay LOCKED, do not wipe, retry next launch

  if (snap.empty) { await stampOwner(uid); markSyncReady(); return 'new-user'; } // brand-new

  // Cloud holds the account. Restore everything (local is empty on a fresh install, so
  // this is purely additive in practice). Only AFTER the write succeeds do we unlock sync.
  const pairs = snapshotToPairs(snap);
  if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
  await stampOwner(uid);
  markSyncReady();
  return 'restored';
}
