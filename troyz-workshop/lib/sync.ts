import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  GoogleAuthProvider,
  signInWithCredential,
  firebaseSignOut,
  onAuthStateChanged,
  doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp,
  Timestamp,
  User,
} from './firebase';
import type { Customer, Vehicle, Job, Payment, Expense, Supplier, Part, StockMovement, Purchase, Worker, Attendance, Advance, SalaryPayment, Setting } from './db';
import { getDB } from './db';

// ═══════════════════════════════════════════════════════════
//  MEW OS — Firebase Auth + Firestore Sync Service
// ═══════════════════════════════════════════════════════════

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  workshop?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

// ── STORE NAMES matching IndexedDB ──
const COLLECTIONS = [
  'customers', 'vehicles', 'jobs', 'invoices', 'payments',
  'expenses', 'purchases', 'suppliers', 'parts', 'stock_movements',
  'workers', 'attendance', 'advances', 'salary_payments', 'settings',
] as const;

type CollectionName = typeof COLLECTIONS[number];

// ── AUTH ──

let currentUid: string | null = null;

export function getCurrentUid(): string | null {
  return currentUid;
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  currentUid = result.user.uid;
  return result.user;
}

export async function signOutApp(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
  currentUid = null;
}

// ── USER PROFILE ──

function userDoc(uid: string) {
  const db = getFirebaseFirestore();
  return doc(db, 'users', uid);
}

function collectionRef(uid: string, name: CollectionName) {
  const db = getFirebaseFirestore();
  return collection(db, 'users', uid, name);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(userDoc(uid), 'profile', 'data'));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    workshop: data.workshop || '',
    photoURL: data.photoURL || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

export async function saveUserProfile(profile: Omit<UserProfile, 'updatedAt'>): Promise<void> {
  const now = new Date().toISOString();
  await setDoc(doc(userDoc(profile.uid), 'profile', 'data'), {
    ...profile,
    updatedAt: now,
    createdAt: profile.createdAt || now,
  }, { merge: true });
}

// ── LOCAL → CLOUD MIGRATION ──

export async function hasLocalData(): Promise<boolean> {
  const db = await getDB();
  const counts = await Promise.all(
    COLLECTIONS.map(async (name) => {
      if (name === 'settings') return 0;
      try { return (await db.getAll(name as any)).length; } catch { return 0; }
    })
  );
  return counts.some(c => c > 0);
}

export async function hasCloudData(uid: string): Promise<boolean> {
  try {
    const results = await Promise.all(
      COLLECTIONS.map(async (name) => {
        if (name === 'settings') return 0;
        try {
          const snap = await getDocs(collectionRef(uid, name));
          return snap.size;
        } catch { return 0; }
      })
    );
    return results.some(c => c > 0);
  } catch {
    return false;
  }
}

export async function uploadLocalDataToCloud(uid: string, onProgress?: (msg: string) => void): Promise<number> {
  const localDb = await getDB();
  let totalRecords = 0;

  for (const name of COLLECTIONS) {
    try {
      const items = await localDb.getAll(name as any);
      if (items.length === 0) continue;
      onProgress?.(`Syncing ${name}... (${items.length} records)`);

      const batchSize = 450;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = writeBatch(getFirebaseFirestore());
        const chunk = items.slice(i, i + batchSize);
        for (const item of chunk) {
          const docRef = doc(collectionRef(uid, name), item.id);
          batch.set(docRef, item);
        }
        await batch.commit();
        totalRecords += chunk.length;
      }
    } catch (e) {
      console.warn(`Failed to sync ${name}:`, e);
    }
  }

  return totalRecords;
}

// ── CLOUD → LOCAL SYNC ──

export async function downloadCloudDataToLocal(uid: string, onProgress?: (msg: string) => void): Promise<number> {
  const localDb = await getDB();
  let totalRecords = 0;

  for (const name of COLLECTIONS) {
    try {
      const snap = await getDocs(collectionRef(uid, name));
      if (snap.empty) continue;
      onProgress?.(`Loading ${name}... (${snap.size} records)`);

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        await localDb.put(name as any, { ...data, id: docSnap.id } as any);
        totalRecords++;
      }
    } catch (e) {
      console.warn(`Failed to load ${name}:`, e);
    }
  }

  return totalRecords;
}

// ── FULL SYNC: local ↔ cloud ──

export async function syncAll(uid: string, onProgress?: (msg: string) => void): Promise<void> {
  onProgress?.('Checking cloud data...');
  const cloudExists = await hasCloudData(uid);
  const localExists = await hasLocalData();

  if (!cloudExists && localExists) {
    onProgress?.('Uploading local data to your cloud account...');
    const count = await uploadLocalDataToCloud(uid, onProgress);
    onProgress?.(`Uploaded ${count} records to cloud.`);
    return;
  }

  if (cloudExists) {
    onProgress?.('Loading your cloud data...');
    const count = await downloadCloudDataToLocal(uid, onProgress);
    onProgress?.(`Loaded ${count} records from cloud.`);
    return;
  }

  onProgress?.('Fresh start — no data to sync.');
}

// ── WRITE-THROUGH: save to both IndexedDB and Firestore ──

export async function saveToCloud<T extends { id: string }>(
  uid: string,
  collectionName: CollectionName,
  item: T
): Promise<void> {
  const localDb = await getDB();
  await localDb.put(collectionName as any, item as any);

  try {
    const docRef = doc(collectionRef(uid, collectionName), item.id);
    await setDoc(docRef, item);
  } catch (e) {
    console.warn(`Cloud save failed for ${collectionName}/${item.id}:`, e);
  }
}

export async function deleteFromCloud(
  uid: string,
  collectionName: CollectionName,
  itemId: string
): Promise<void> {
  const localDb = await getDB();
  try { await localDb.delete(collectionName as any, itemId); } catch {}

  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(collectionRef(uid, collectionName), itemId));
  } catch (e) {
    console.warn(`Cloud delete failed for ${collectionName}/${itemId}:`, e);
  }
}

export async function saveSettingToCloud(uid: string, key: string, value: string): Promise<void> {
  const localDb = await getDB();
  await localDb.put('settings', { key, value });

  try {
    const docRef = doc(collectionRef(uid, 'settings'), key);
    await setDoc(docRef, { key, value });
  } catch (e) {
    console.warn(`Cloud setting save failed for ${key}:`, e);
  }
}
