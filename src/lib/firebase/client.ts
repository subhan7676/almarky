import type { FirebaseApp } from "firebase/app";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const firestoreDatabaseId =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() || "default";

export const firebaseClientMissingEnvKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const isFirebaseClientConfigured =
  firebaseClientMissingEnvKeys.length === 0;

let appCache: FirebaseApp | null = null;
let authCache: Auth | null = null;
let dbCache: Firestore | null = null;
let storageCache: FirebaseStorage | null = null;
let providerCache: GoogleAuthProvider | null = null;

function canInitialize() {
  return isFirebaseClientConfigured;
}

function getFirebaseApp() {
  if (appCache) return appCache;

  if (!canInitialize()) {
    throw new Error("Required public configuration is missing.");
  }

  appCache = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appCache;
}

export function getClientAuth() {
  if (authCache) return authCache;
  authCache = getAuth(getFirebaseApp());
  return authCache;
}

export function getClientDb() {
  if (dbCache) return dbCache;
  const app = getFirebaseApp();
  const settings = {
    // Keep client state server-backed for consistent cross-device/live behavior.
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
  } as const;
  try {
    dbCache = firestoreDatabaseId
      ? initializeFirestore(app, settings, firestoreDatabaseId)
      : initializeFirestore(app, settings);
  } catch {
    dbCache = firestoreDatabaseId
      ? getFirestore(app, firestoreDatabaseId)
      : getFirestore(app);
  }
  return dbCache;
}

export function getClientStorage() {
  if (storageCache) return storageCache;
  storageCache = getStorage(getFirebaseApp());
  return storageCache;
}

export function getGoogleProvider() {
  if (providerCache) return providerCache;
  providerCache = new GoogleAuthProvider();
  providerCache.setCustomParameters({ prompt: "select_account" });
  return providerCache;
}
