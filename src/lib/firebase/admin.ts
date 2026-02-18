import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function privateKey() {
  return requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function firestoreDatabaseId() {
  return (
    process.env.FIREBASE_DATABASE_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() ||
    "default"
  );
}

let cachedApp: App | null = null;

function adminApp() {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApp();
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: privateKey(),
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(adminApp());
}

export function getAdminDb() {
  const dbId = firestoreDatabaseId();
  return dbId ? getFirestore(adminApp(), dbId) : getFirestore(adminApp());
}

export function getAdminStorage() {
  return getStorage(adminApp());
}
