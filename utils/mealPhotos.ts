// Meal-slot photo storage -- one photo per meal slot per day (Morning/Lunch/Dinner/etc.), showing
// the completed meal. Directly mirrors utils/foodPhotos.ts's hard-won pattern (that file exists
// because of a real 2026-06-22 data-loss incident: local-only photos with no cloud copy were wiped
// on reinstall). Same fix here from day one: upload to Firebase Storage, store the download URL in
// the synced AsyncStorage key, re-download to a local cache file when the local copy is gone.
//
// Independent from the meal's logged food items on purpose -- "Clear all" (which deletes a slot's
// food entries) must never touch its photo. They are two separate pieces of data that happen to
// live under the same meal slot.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import { storage, auth } from '../firebaseConfig';

const safeIdOf = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');
export const mealPhotoKey = (date: string, slotId: string) => `pj_meal_photo_${date}_${slotId}`;
const isCloudUrl = (v: string | null): boolean => !!v && v.startsWith('http');

// Deterministic local cache path for a meal slot's photo. Creates the dir if needed.
export function localMealPhotoPath(date: string, slotId: string): string {
  const dir = new Directory(Paths.document, 'meal_photos');
  if (!dir.exists) dir.create();
  return `${dir.uri}${safeIdOf(`${date}_${slotId}`)}.jpg`;
}

function cloudRef(date: string, slotId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return ref(storage, `users/${uid}/meal_photos/${safeIdOf(`${date}_${slotId}`)}.jpg`);
}

// Upload a local image file to Storage; returns the download URL or, on failure/no auth,
// url:null plus an error string for diagnostics.
export async function uploadMealPhoto(date: string, slotId: string, localUri: string): Promise<{ url: string | null; error?: string }> {
  const r = cloudRef(date, slotId);
  if (!r) return { url: null, error: 'not signed in (no uid)' };
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    await uploadBytes(r, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(r);
    return { url };
  } catch (e: any) {
    return { url: null, error: e?.message || String(e) };
  }
}

// Delete the cloud copy (ignored if it does not exist / no auth).
export async function deleteMealPhotoCloud(date: string, slotId: string): Promise<void> {
  const r = cloudRef(date, slotId);
  if (!r) return;
  try { await deleteObject(r); } catch {}
}

// Full cleanup: local cache file + stored key + cloud copy. Safe no-op if there was no photo.
export async function purgeMealPhoto(date: string, slotId: string): Promise<void> {
  try {
    const f = new FSFile(localMealPhotoPath(date, slotId));
    if (f.exists) f.delete();
  } catch {}
  try { await AsyncStorage.removeItem(mealPhotoKey(date, slotId)); } catch {}
  await deleteMealPhotoCloud(date, slotId);
}

// Resolve a displayable LOCAL uri for a meal slot's photo. Local cache hit -> use it directly;
// local missing but a cloud URL is stored (reinstall) -> download it back to the cache; no stored
// key -> no photo. Returns the local uri to display, or null.
export async function resolveMealPhoto(date: string, slotId: string): Promise<string | null> {
  let stored: string | null = null;
  try { stored = await AsyncStorage.getItem(mealPhotoKey(date, slotId)); } catch {}
  if (!stored) return null;

  const localPath = localMealPhotoPath(date, slotId);
  const localFile = new FSFile(localPath);
  if (localFile.exists) return localPath;

  if (isCloudUrl(stored)) {
    try {
      const res = await FileSystem.downloadAsync(stored, localPath);
      if (res.status === 200) return localPath;
    } catch {}
    return null; // transient cloud/network failure -- try again on next load
  }

  // Legacy/unexpected local-only ref whose file is gone = unrecoverable. Clean up the dead key.
  try { await AsyncStorage.removeItem(mealPhotoKey(date, slotId)); } catch {}
  return null;
}
