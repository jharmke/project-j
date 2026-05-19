import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBCrbrtqp8deQ6h2exQB1iaDjO5E6yJofA",
  authDomain: "projectj-5d024.firebaseapp.com",
  projectId: "projectj-5d024",
  storageBucket: "projectj-5d024.firebasestorage.app",
  messagingSenderId: "841973180275",
  appId: "1:841973180275:web:96042ce517c7631f088706"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export const getUserId = (): string => {
  return auth.currentUser?.uid ?? 'anonymous';
};

export const saveToFirebase = async (dateKey: string, field: string, value: any) => {
  try {
    const userId = getUserId();
    if (userId === 'anonymous') return;
    const ref = doc(db, 'users', userId, 'days', dateKey);
    await setDoc(ref, { [field]: value }, { merge: true });
  } catch (e) {
    console.log('Firebase save error', e);
  }
};

export const loadFromFirebase = async (dateKey: string) => {
  try {
    const userId = getUserId();
    if (userId === 'anonymous') return null;
    const ref = doc(db, 'users', userId, 'days', dateKey);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    console.log('Firebase load error', e);
    return null;
  }
};
