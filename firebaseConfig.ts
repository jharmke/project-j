import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBCrbrtqp8deQ6h2exQB1iaDjO5E6yJofA",
  authDomain: "projectj-5d024.firebaseapp.com",
  projectId: "projectj-5d024",
  storageBucket: "projectj-5d024.firebasestorage.app",
  messagingSenderId: "841973180275",
  appId: "1:841973180275:web:96042ce517c7631f088706"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import * as Application from 'expo-application';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const getUserId = () => {
  return Application.applicationId || 'default-user';
};

export const saveToFirebase = async (dateKey: string, field: string, value: any) => {
  try {
    console.log('Saving to Firebase:', dateKey, field, JSON.stringify(value));
    const userId = getUserId();
    console.log('User ID:', userId);
    const ref = doc(db, 'users', userId, 'days', dateKey);
    await setDoc(ref, { [field]: value }, { merge: true });
    console.log('Firebase save successful');
  } catch (e) {
    console.log('Firebase save error', e);
  }
};

export const loadFromFirebase = async (dateKey: string) => {
  try {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, 'days', dateKey);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    console.log('Firebase load error', e);
    return null;
  }
};