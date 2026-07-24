// Recipe photo storage -- one photo per recipe. Direct mirror of utils/mealPhotos.ts /
// utils/foodPhotos.ts's pattern (that pattern exists because of the real 2026-06-22
// data-loss incident: local-only photos with no cloud copy were wiped on reinstall).
// Local file cache + Firebase Storage upload + the download URL stored in the synced
// AsyncStorage key + re-download-on-reinstall resolve function.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File as FSFile, Paths } from 'expo-file-system/next';
import { storage, auth } from '../firebaseConfig';

const safeIdOf = (recipeId: string) => recipeId.replace(/[^a-zA-Z0-9_-]/g, '_');
export const recipePhotoKey = (recipeId: string) => `pj_recipe_photo_${recipeId}`;
const isCloudUrl = (v: string | null): boolean => !!v && v.startsWith('http');

// Deterministic local cache path for a recipe's photo. Creates the dir if needed.
export function localRecipePhotoPath(recipeId: string): string {
  const dir = new Directory(Paths.document, 'recipe_photos');
  if (!dir.exists) dir.create();
  return `${dir.uri}${safeIdOf(recipeId)}.jpg`;
}

function cloudRef(recipeId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return ref(storage, `users/${uid}/recipe_photos/${safeIdOf(recipeId)}.jpg`);
}

// Upload a local image file to Storage; returns the download URL or, on failure/no auth,
// url:null plus an error string for diagnostics.
export async function uploadRecipePhoto(recipeId: string, localUri: string): Promise<{ url: string | null; error?: string }> {
  const r = cloudRef(recipeId);
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
export async function deleteRecipePhotoCloud(recipeId: string): Promise<void> {
  const r = cloudRef(recipeId);
  if (!r) return;
  try { await deleteObject(r); } catch {}
}

// Full cleanup: local cache file + stored key + cloud copy. Safe no-op if there was no photo.
export async function purgeRecipePhoto(recipeId: string): Promise<void> {
  if (!recipeId) return;
  try {
    const f = new FSFile(localRecipePhotoPath(recipeId));
    if (f.exists) f.delete();
  } catch {}
  try { await AsyncStorage.removeItem(recipePhotoKey(recipeId)); } catch {}
  await deleteRecipePhotoCloud(recipeId);
}

// Resolve a displayable LOCAL uri for a recipe's photo. Local cache hit -> use it directly;
// local missing but a cloud URL is stored (reinstall) -> download it back to the cache; no
// stored key -> no photo. Returns the local uri to display, or null.
export async function resolveRecipePhoto(recipeId: string): Promise<string | null> {
  if (!recipeId) return null;
  let stored: string | null = null;
  try { stored = await AsyncStorage.getItem(recipePhotoKey(recipeId)); } catch {}
  if (!stored) return null;

  const localPath = localRecipePhotoPath(recipeId);
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
  try { await AsyncStorage.removeItem(recipePhotoKey(recipeId)); } catch {}
  return null;
}
