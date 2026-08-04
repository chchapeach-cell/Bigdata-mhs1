import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBSLb2bAiHaYqfriuKpyzIXFKtAYrrZBvw",
  authDomain: "mhs1-dmc.firebaseapp.com",
  projectId: "mhs1-dmc",
  storageBucket: "mhs1-dmc.firebasestorage.app",
  messagingSenderId: "615145729605",
  appId: "1:615145729605:web:365a0db791798f2c057d2c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId and offline persistence
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  },
  'ai-studio-mhs1bigdata-b097cba8-6fe0-43e2-ad20-e20681250b82'
);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const isQuota = rawMsg.includes('Quota') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('Free daily read');

  const errInfo: FirestoreErrorInfo = {
    error: isQuota ? 'Firestore read quota limit reached' : rawMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Notice: ', isQuota ? 'Quota limit reached' : JSON.stringify(errInfo));
  throw new Error(isQuota ? 'Firestore read quota limit reached' : JSON.stringify(errInfo));
}

export { app, db, auth, googleProvider };

