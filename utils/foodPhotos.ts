// Food photo storage -- makes food photos survive a reinstall.
//
// Background: photos are saved as physical files in the app's document directory
// (food_photos/{safeId}.jpg) and the key pj_food_photo_{foodId} held only the local
// FILE PATH. That path synced to the cloud but the IMAGE never did, so deleting the
// app wiped every photo with no cloud copy (the 2026-06-22 data-loss incident).
//
// Fix: upload each photo to Firebase Storage at users/{uid}/food_photos/{safeId}.jpg,
// store the download URL in the synced key, and re-download to the local cache when
// the local file is gone (reinstall). A photo lives in the cloud permanently until
// the user removes it (Remove Photo) or deletes its food entry. A one-time backfill
// uploads any legacy local-only photo still on the device so it becomes cloud-safe.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import { storage, auth } from '../firebaseConfig';

const safeIdOf = (foodId: string) => foodId.replace(/[^a-zA-Z0-9_-]/g, '_');
export const photoKey = (foodId: string) => `pj_food_photo_${foodId}`;
const isCloudUrl = (v: string | null): boolean => !!v && v.startsWith('http');

// Deterministic local cache path for a food's photo. Creates the dir if needed.
export function localPhotoPath(foodId: string): string {
  const dir = new Directory(Paths.document, 'food_photos');
  if (!dir.exists) dir.create();
  return `${dir.uri}${safeIdOf(foodId)}.jpg`;
}

function cloudRef(foodId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return ref(storage, `users/${uid}/food_photos/${safeIdOf(foodId)}.jpg`);
}

// Upload a local image file to Storage; returns the download URL, or null on failure
// / no auth (caller falls back to local-only and a later backfill picks it up).
export async function uploadFoodPhoto(foodId: string, localUri: string): Promise<string | null> {
  const r = cloudRef(foodId);
  if (!r) return null;
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
    await uploadString(r, base64, 'base64', { contentType: 'image/jpeg' });
    return await getDownloadURL(r);
  } catch {
    return null;
  }
}

// Delete the cloud copy (ignored if it does not exist / no auth).
export async function deleteFoodPhotoCloud(foodId: string): Promise<void> {
  const r = cloudRef(foodId);
  if (!r) return;
  try { await deleteObject(r); } catch {}
}

// Resolve a displayable LOCAL uri for a food's photo. Handles, in order:
//  - local cache hit -> use it (and backfill-upload if the stored ref is a legacy
//    local path, so the photo becomes cloud-safe going forward);
//  - local missing but a cloud URL is stored -> download it back to the cache;
//  - legacy local-only ref whose file is gone -> unrecoverable, clean up the dead key.
// Returns the local uri to display, or null when there is no (recoverable) photo.
export async function resolveFoodPhoto(foodId: string): Promise<string | null> {
  let stored: string | null = null;
  try { stored = await AsyncStorage.getItem(photoKey(foodId)); } catch {}
  if (!stored) return null;

  const localPath = localPhotoPath(foodId);
  const localFile = new FSFile(localPath);

  if (localFile.exists) {
    if (!isCloudUrl(stored)) {
      const url = await uploadFoodPhoto(foodId, localPath);
      if (url) { try { await AsyncStorage.setItem(photoKey(foodId), url); } catch {} }
    }
    return localPath;
  }

  // Local file is gone (e.g. reinstall). Pull it back from the cloud if we have a URL.
  if (isCloudUrl(stored)) {
    try {
      const res = await FileSystem.downloadAsync(stored, localPath);
      if (res.status === 200) return localPath;
    } catch {}
    return null; // transient cloud/network failure -- try again on next load
  }

  // Legacy local-only path whose file no longer exists = unrecoverable. Remove dead key.
  try { await AsyncStorage.removeItem(photoKey(foodId)); } catch {}
  return null;
}
