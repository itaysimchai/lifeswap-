import { publicConfig } from "./public-config";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  connectAuthEmulator,
  type Auth,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || publicConfig.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || publicConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || publicConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || publicConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || publicConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || publicConfig.NEXT_PUBLIC_FIREBASE_APP_ID),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// getAuth() installs a popup/redirect resolver that loads an iframe from
// authDomain while initialising. That request never completes here, so
// onAuthStateChanged never fires and every screen sits on its loading spinner.
// Nothing in the app uses popup/redirect sign-in, so initialise without a
// resolver. If popup sign-in is ever added, pass popupRedirectResolver here.
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: browserLocalPersistence });
  } catch {
    // Already initialised - e.g. this module re-evaluated by Fast Refresh.
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);
// The SDK retries a failed upload for two minutes by default, which turns a
// misconfigured bucket into a spinner that never resolves. Fail in seconds so
// the UI can say what went wrong.
storage.maxUploadRetryTime = 15_000;
storage.maxOperationRetryTime = 15_000;

// Local dev: point the SDK at the Firebase Emulator Suite (npm run emulators).
// Guarded so Fast Refresh / repeated imports don't reconnect.
declare global {
  var __fbEmulatorsConnected: boolean | undefined;
}

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  !globalThis.__fbEmulatorsConnected
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  globalThis.__fbEmulatorsConnected = true;
}

export default app;
