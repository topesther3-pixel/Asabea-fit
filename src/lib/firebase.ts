import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const FALLBACK_FIREBASE_API_KEY = 'AIzaSyAi3esyzepM9962H4_ozfDbT7uq8Rdd9hE';

// Read API key securely from environment variable / secret, config file, or fallback
const firebaseApiKey =
  (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
  (import.meta as any).env?.FIREBASE_API_KEY ||
  (typeof process !== 'undefined' && (process.env?.FIREBASE_API_KEY || process.env?.VITE_FIREBASE_API_KEY)) ||
  firebaseConfig.apiKey ||
  FALLBACK_FIREBASE_API_KEY;

const resolvedConfig = {
  ...firebaseConfig,
  apiKey: firebaseApiKey
};

// Initialize Firebase App safely
let appInstance: any;
try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
} catch (e) {
  console.error('Firebase App initialization notice:', e);
}
export const app = appInstance;

// CRITICAL: Initialize Firestore with configured databaseId from firebase-applet-config.json
let dbInstance: any;
try {
  dbInstance = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;
} catch (e) {
  console.error('Firestore initialization notice:', e);
}
export const db = dbInstance;

export const isFirebaseConfigured = Boolean(app && db);

// Initialize Firebase Authentication safely
let authInstance: any;
try {
  authInstance = app ? getAuth(app) : null;
} catch (e) {
  console.error('Firebase Auth initialization notice:', e);
}
export const auth = authInstance;

// Provider for Google Auth
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Auth is not available. Please verify your connection.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser() {
  if (!auth) return;
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
}

// Error handling as mandated by Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on boot
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Firebase Firestore connected successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase notice: client is running offline.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}
