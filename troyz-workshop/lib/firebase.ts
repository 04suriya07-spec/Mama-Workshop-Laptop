import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp, Timestamp, enableIndexedDbPersistence } from 'firebase/firestore';

let app: FirebaseApp | null = null;

const firebaseConfig = {
  apiKey: 'AIzaSyBqoRG--iC4DPPygsEunK9qNW2S0JyUWlM',
  projectId: 'mew-os',
  appId: '1:540889157966:android:ae15cfaa2f8254829f8e1f',
  storageBucket: 'mew-os.firebasestorage.app',
};

// Web Client ID from Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration
// This must be configured by the user in Firebase Console
export const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID || '';

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp());
}

export { GoogleAuthProvider, signInWithCredential, firebaseSignOut, onAuthStateChanged, doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp, Timestamp, enableIndexedDbPersistence };
export type { User };
