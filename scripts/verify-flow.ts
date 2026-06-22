/**
 * Headless end-to-end check of the core loop AGAINST the real security rules.
 * Run after `npm run emulators` + `npm run seed`:
 *
 *   npx tsx scripts/verify-flow.ts
 *
 * Uses the client SDK (subject to firestore.rules, unlike the Admin-SDK seed),
 * signing in as seeded users to prove both that the happy path works and that
 * the rules reject self-request, cross-user reads, and non-admin approvals.
 */
import { initializeApp } from "firebase/app";
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
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const app = initializeApp({
  projectId: "demo-lifeswap",
  apiKey: "demo-key",
  authDomain: "demo-lifeswap.firebaseapp.com",
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const PW = "password123";
let passed = 0;
let failed = 0;

function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}
function bad(name: string, detail: string) {
  failed++;
  console.log(`  ✗ ${name}  --  ${detail}`);
}

/** Assert an operation succeeds. */
async function expectOk(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    bad(name, `expected success but got ${(e as { code?: string }).code ?? e}`);
  }
}

/** Assert an operation is rejected by the security rules. */
async function expectDenied(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    bad(name, "expected permission-denied but the write/read SUCCEEDED");
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

const chatIdFor = (a: string, b: string, requestId: string) => {
  const [x, y] = [a, b].sort();
  return `${x}_${y}_${requestId}`;
};

async function main() {
  console.log("Verifying core loop against firestore.rules...\n");

  // --- Happy path: tom requests Maya's career-coaching service -------------
  await as("tom@lifeswap.dev");
  let reqId = "";
  await expectOk("tom can request a service he doesn't own", async () => {
    const ref = await addDoc(collection(db, "serviceRequests"), {
      serviceId: "s_career",
      serviceTitle: "Tech career & interview coaching",
      requesterId: "u_tom",
      requesterName: "Tom Becker",
      providerId: "u_maya",
      providerName: "Maya Chen",
      message: "Keen to prep for interviews.",
      status: "pending",
      createdAt: serverTimestamp(),
    });
    reqId = ref.id;
  });

  // --- Negative: self-request must be rejected -----------------------------
  await as("maya@lifeswap.dev");
  await expectDenied("maya CANNOT request her own service", () =>
    addDoc(collection(db, "serviceRequests"), {
      serviceId: "s_career",
      serviceTitle: "Tech career & interview coaching",
      requesterId: "u_maya",
      requesterName: "Maya Chen",
      providerId: "u_maya",
      providerName: "Maya Chen",
      status: "pending",
      createdAt: serverTimestamp(),
    })
  );

  // --- Provider accepts -> chat is created ---------------------------------
  await expectOk("maya sees the incoming request", async () => {
    const snap = await getDocs(
      query(
        collection(db, "serviceRequests"),
        where("providerId", "==", "u_maya")
      )
    );
    if (!snap.docs.some((d) => d.id === reqId)) throw { code: "not-found" };
  });

  const chatId = chatIdFor("u_tom", "u_maya", reqId);
  await expectOk("maya accepts the request", () =>
    updateDoc(doc(db, "serviceRequests", reqId), { status: "accepted" })
  );
  await expectOk("maya creates the chat", () =>
    setDoc(doc(db, "chats", chatId), {
      participantIds: ["u_tom", "u_maya"],
      participantNames: { u_tom: "Tom Becker", u_maya: "Maya Chen" },
      serviceId: "s_career",
      serviceTitle: "Tech career & interview coaching",
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
  );
  await expectOk("maya sends the first message", () =>
    addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "u_maya",
      text: "Hi Tom! Happy to help.",
      createdAt: serverTimestamp(),
    })
  );

  // --- Tom (the other participant) can read + reply ------------------------
  await as("tom@lifeswap.dev");
  await expectOk("tom sees the chat in his list", async () => {
    const snap = await getDocs(
      query(
        collection(db, "chats"),
        where("participantIds", "array-contains", "u_tom")
      )
    );
    if (!snap.docs.some((d) => d.id === chatId)) throw { code: "not-found" };
  });
  await expectOk("tom reads the message thread", async () => {
    const snap = await getDocs(collection(db, "chats", chatId, "messages"));
    if (snap.empty) throw { code: "not-found" };
  });
  await expectOk("tom replies", () =>
    addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "u_tom",
      text: "Thanks Maya!",
      createdAt: serverTimestamp(),
    })
  );

  // --- Negative: an outsider cannot read the request or chat ---------------
  await as("leo@lifeswap.dev");
  await expectDenied("leo (outsider) CANNOT read tom<->maya request", () =>
    getDoc(doc(db, "serviceRequests", reqId))
  );
  await expectDenied("leo (outsider) CANNOT read tom<->maya chat", () =>
    getDoc(doc(db, "chats", chatId))
  );

  // --- Negative: a non-admin cannot approve an application -----------------
  await expectDenied("leo (non-admin) CANNOT approve an application", () =>
    updateDoc(doc(db, "applications", "u_sara"), { status: "approved" })
  );

  // --- Admin approval path (mirrors reviewApplication) ---------------------
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
