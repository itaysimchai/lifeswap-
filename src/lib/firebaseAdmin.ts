/**
 * Firebase Admin SDK — the SERVER-side, fully-trusted Firebase client.
 *
 * Unlike the browser SDK (`firebase.ts`), the Admin SDK *bypasses Firestore
 * security rules*. That's exactly what we want for payments: only the server,
 * after verifying a real charge, is allowed to write a "paid" booking.
 *
 * Two modes:
 *  - Local dev (NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true): talk to the local
 *    emulator. No service-account credentials needed — the emulator trusts
 *    anyone. This lets you test real Stripe payments without any Firebase secret.
 *  - Production: authenticate with a service account (the 3 FIREBASE_* secrets
 *    from the downloaded JSON). These let the server prove it's really you.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function createApp(): App {
  if (useEmulator) {
    // Point the Admin SDK at the running emulator (npm run emulators). Setting
    // this env var is the documented way to make admin writes hit the emulator.
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
    return initializeApp({ projectId });
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key arrives with literal "\n" in the env var — turn them
      // back into real newlines so the SDK can parse the key.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// Create the Admin app + Firestore LAZILY, on first actual use. `next build`
// imports this module while collecting the API routes but never runs a handler,
// so deferring init keeps a missing service-account key from crashing the build.
// (Reuse one app across hot-reloads / serverless invocations.)
let _adminDb: Firestore | null = null;
function adminDbInstance(): Firestore {
  if (!_adminDb) {
    const app: App = getApps()[0] ?? createApp();
    _adminDb = getFirestore(app);
  }
  return _adminDb;
}

// A thin proxy so existing call sites (`adminDb.doc(...)`, `adminDb.collection(...)`)
// are unchanged, while the real client is only built at first use at runtime.
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = adminDbInstance();
    const value = Reflect.get(db as object, prop);
    return typeof value === "function" ? value.bind(db) : value;
  },
});
