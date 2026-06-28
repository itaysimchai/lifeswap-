/**
 * Headless rules check against the Firebase emulators.
 * Run after `npm run emulators` + `npm run seed`:
 *
 *   npx tsx scripts/verify-flow.ts
 *
 * The current booking flow is server-owned: clients may not create bookings,
 * payments, slot locks, booked slots, or chats directly. This script seeds one
 * confirmed booking/chat through Admin SDK, then signs in as seeded users with
 * the client SDK to prove participant reads/messages work and outsider/admin
 * boundaries still hold.
 */
import { initializeApp as initializeClientApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getApps, initializeApp as initializeAdminApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore as getAdminFirestore,
} from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

const PROJECT_ID = "demo-lifeswap";
const PW = "password123";

const app = initializeClientApp({
  projectId: PROJECT_ID,
  apiKey: "demo-key",
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const adminApp = getApps()[0] ?? initializeAdminApp({ projectId: PROJECT_ID });
const adminDb = getAdminFirestore(adminApp);

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed++;
  console.log(`  PASS ${name}`);
}

function bad(name: string, detail: string) {
  failed++;
  console.log(`  FAIL ${name} -- ${detail}`);
}

async function expectOk(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    bad(name, `expected success but got ${(e as { code?: string }).code ?? e}`);
  }
}

async function expectDenied(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    bad(name, "expected permission-denied but the operation succeeded");
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "permission-denied") ok(name);
    else bad(name, `expected permission-denied but got ${code || e}`);
  }
}

async function as(email: string) {
  await signOut(auth).catch(() => {});
  await signInWithEmailAndPassword(auth, email, PW);
}

const chatIdFor = (a: string, b: string, bookingId: string) => {
  const [x, y] = [a, b].sort();
  return `${x}_${y}_${bookingId}`;
};

async function seedConfirmedBooking() {
  const bookingId = "verify_booking";
  const chatId = chatIdFor("u_tom", "u_maya", bookingId);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  await adminDb.doc(`serviceRequests/${bookingId}`).set({
    serviceId: "s_career",
    serviceTitle: "Tech career & interview coaching",
    requesterId: "u_tom",
    requesterName: "Tom Becker",
    providerId: "u_maya",
    providerName: "Maya Chen",
    scheduledDate: tomorrow,
    scheduledTime: "10:30",
    price: 0,
    paymentMethod: "free",
    paymentStatus: "paid",
    paymentRef: "verify_free_payment",
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
  });

  await adminDb.doc(`chats/${chatId}`).set({
    participantIds: ["u_tom", "u_maya"],
    participantNames: { u_tom: "Tom Becker", u_maya: "Maya Chen" },
    serviceId: "s_career",
    serviceTitle: "Tech career & interview coaching",
    lastMessage: "Verified booking chat.",
    lastMessageAt: FieldValue.serverTimestamp(),
    lastSenderId: "u_tom",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { bookingId, chatId };
}

async function main() {
  console.log("Verifying client rules against the server-owned booking flow...\n");
  const { bookingId, chatId } = await seedConfirmedBooking();

  await as("tom@lifeswap.dev");
  await expectDenied("tom cannot create serviceRequests directly", () =>
    addDoc(collection(db, "serviceRequests"), {
      serviceId: "s_career",
      requesterId: "u_tom",
      providerId: "u_maya",
      status: "confirmed",
      createdAt: serverTimestamp(),
    })
  );
  await expectDenied("tom cannot create payments directly", () =>
    addDoc(collection(db, "payments"), { requesterId: "u_tom" })
  );
  await expectDenied("tom cannot create bookedSlots directly", () =>
    addDoc(collection(db, "bookedSlots"), { serviceId: "s_career" })
  );
  await expectDenied("tom cannot create slotLocks directly", () =>
    addDoc(collection(db, "slotLocks"), { serviceId: "s_career" })
  );
  await expectDenied("tom cannot create chats directly", () =>
    addDoc(collection(db, "chats"), {
      participantIds: ["u_tom", "u_maya"],
      createdAt: serverTimestamp(),
    })
  );

  await expectOk("tom can read his server-created booking", () =>
    getDoc(doc(db, "serviceRequests", bookingId))
  );
  await expectOk("tom can read his server-created chat", () =>
    getDoc(doc(db, "chats", chatId))
  );
  await expectOk("tom can send a message in that chat", async () => {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "u_tom",
      text: "Thanks Maya!",
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: "Thanks Maya!",
      lastMessageAt: serverTimestamp(),
      lastSenderId: "u_tom",
    });
  });
  await expectOk("tom can mark his chat read", () =>
    updateDoc(doc(db, "chats", chatId), {
      "lastRead.u_tom": serverTimestamp(),
    })
  );

  await as("maya@lifeswap.dev");
  await expectOk("maya sees the booking as provider", async () => {
    const snap = await getDocs(
      query(collection(db, "serviceRequests"), where("providerId", "==", "u_maya"))
    );
    if (!snap.docs.some((d) => d.id === bookingId)) throw { code: "not-found" };
  });
  await expectDenied("maya cannot mutate the booking directly", () =>
    updateDoc(doc(db, "serviceRequests", bookingId), { status: "cancelled" })
  );

  await as("leo@lifeswap.dev");
  await expectDenied("leo cannot read tom/maya booking", () =>
    getDoc(doc(db, "serviceRequests", bookingId))
  );
  await expectDenied("leo cannot read tom/maya chat", () =>
    getDoc(doc(db, "chats", chatId))
  );
  await expectDenied("leo cannot approve an application", () =>
    updateDoc(doc(db, "applications", "u_sara"), { status: "approved" })
  );

  await as("admin@lifeswap.dev");
  await expectOk("admin approves the application", () =>
    updateDoc(doc(db, "applications", "u_sara"), {
      status: "approved",
      reviewedAt: serverTimestamp(),
    })
  );
  await expectOk("admin flips applicant to provider", () =>
    updateDoc(doc(db, "users", "u_sara"), {
      isProvider: true,
      providerStatus: "approved",
    })
  );

  console.log(`\n${passed} passed, ${failed} failed.`);
  await signOut(auth).catch(() => {});
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\nVerification crashed:", e);
  process.exit(1);
});
