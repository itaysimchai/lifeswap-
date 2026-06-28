/**
 * Seeds the Firebase Emulator Suite with demo users, services, and a couple of
 * in-flight requests so the app has something to show on first run.
 *
 *   1. npm run emulators      (Auth + Firestore, in another terminal)
 *   2. npm run seed
 *
 * Uses the Admin SDK, which BYPASSES Firestore security rules — exactly what a
 * seed needs (it can mint the admin user and approved providers that the client
 * rules would otherwise forbid). It talks to the emulators via the *_EMULATOR_HOST
 * env vars set below, so it never touches a real project.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-lifeswap";

// Point the Admin SDK at the local emulators (ports from firebase.json).
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

interface SeedUser {
  uid: string;
  email: string;
  displayName: string;
  password: string;
  role: "user" | "admin";
  isProvider: boolean;
}

const PASSWORD = "password123";

// Host availability: each date has its OWN time slots.
function upcomingDates(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 2; out.length < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
const AVAIL_DATES = upcomingDates(4);
const SEED_AVAILABILITY: Record<string, string[]> = {
  // Adjacent slots so the "1-hour overlap" rule is visible: booking 11:00 hides 11:30.
  [AVAIL_DATES[0]]: ["11:00", "11:30", "12:00", "13:00"],
  [AVAIL_DATES[1]]: ["14:00", "15:30"],
  [AVAIL_DATES[2]]: ["09:00", "11:00", "16:00"],
  [AVAIL_DATES[3]]: ["10:00", "17:00"],
};

function slotLockIds(serviceId: string, date: string, time: string): string[] {
  const [h, m] = time.split(":").map(Number);
  const start = h * 60 + m;
  return [0, 30].map((offset) => {
    const total = start + offset;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${serviceId}_${date}_${hh}${mm}`;
  });
}

const USERS: SeedUser[] = [
  { uid: "u_admin", email: "admin@lifeswap.dev", displayName: "Ava Admin", password: PASSWORD, role: "admin", isProvider: false },
  { uid: "u_maya", email: "maya@lifeswap.dev", displayName: "Maya Chen", password: PASSWORD, role: "user", isProvider: true },
  { uid: "u_leo", email: "leo@lifeswap.dev", displayName: "Leo Martins", password: PASSWORD, role: "user", isProvider: true },
  { uid: "u_sara", email: "sara@lifeswap.dev", displayName: "Sara Klein", password: PASSWORD, role: "user", isProvider: false },
  { uid: "u_tom", email: "tom@lifeswap.dev", displayName: "Tom Becker", password: PASSWORD, role: "user", isProvider: false },
];

interface SeedService {
  id: string;
  providerUid: string;
  title: string;
  description: string;
  category: string;
  price: number;
  linkedin?: string;
}

const SERVICES: SeedService[] = [
  { id: "s_react", providerUid: "u_maya", title: "React & Next.js code review", description: "I'll review your React/Next.js codebase and pair with you on architecture, performance, and testing. 8 years shipping production frontends.", category: "Software Engineering", price: 80, linkedin: "https://www.linkedin.com/in/maya-chen" },
  { id: "s_career", providerUid: "u_maya", title: "Tech career & interview coaching", description: "Mock interviews, resume teardown, and a concrete plan to land your next engineering role. I've sat on both sides of the hiring table.", category: "Career Coaching", price: 60, linkedin: "https://www.linkedin.com/in/maya-chen" },
  { id: "s_design", providerUid: "u_leo", title: "Product design critique", description: "Bring your app or landing page and I'll give you a structured UX/visual critique with prioritized, actionable fixes.", category: "Design", price: 50, linkedin: "https://www.linkedin.com/in/leo-martins" },
  // Intentionally no LinkedIn — demonstrates the link is optional / provider-controlled.
  { id: "s_ml", providerUid: "u_leo", title: "Intro to applied machine learning", description: "A friendly, hands-on session to get you from zero to a working ML model, with no heavy math prerequisites.", category: "Data Science & AI", price: 70 },
];

async function seedUsers() {
  for (const u of USERS) {
    try {
      await auth.createUser({
        uid: u.uid,
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });
    } catch (e: unknown) {
      // Re-running the seed shouldn't blow up on existing accounts.
      if ((e as { code?: string }).code !== "auth/uid-already-exists") throw e;
    }
    await db.doc(`users/${u.uid}`).set({
      email: u.email,
      displayName: u.displayName,
      photoURL: null,
      role: u.role,
      isProvider: u.isProvider,
      providerStatus: u.isProvider ? "approved" : "none",
      isBlocked: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  user  ${u.email} (${u.role}${u.isProvider ? ", provider" : ""})`);
  }
}

async function seedServices() {
  for (const s of SERVICES) {
    const provider = USERS.find((u) => u.uid === s.providerUid)!;
    await db.doc(`services/${s.id}`).set({
      providerId: s.providerUid,
      providerName: provider.displayName,
      providerLinkedin: s.linkedin ?? null,
      title: s.title,
      description: s.description,
      category: s.category,
      price: s.price,
      availability: SEED_AVAILABILITY,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  service  "${s.title}"`);
  }
}

async function seedExtras() {
  // A pending application from a non-provider, for the admin approval queue.
  await db.doc("applications/u_sara").set({
    uid: "u_sara",
    displayName: "Sara Klein",
    email: "sara@lifeswap.dev",
    bio: "Marketing lead with 7 years across B2B SaaS growth, lifecycle, and brand. I've built marketing teams from scratch twice and love teaching the fundamentals.",
    experience: "Ran growth at two Series-A startups; scaled one from 2k to 80k signups. Comfortable across SEO, paid, lifecycle email, and positioning.",
    skills: ["Marketing", "Growth", "SEO", "Positioning"],
    linkedin: "https://linkedin.com/in/saraklein",
    portfolio: "",
    motivation: "I want to give early founders the marketing playbook I wish I'd had, without the agency price tag.",
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log("  application  Sara Klein (pending)");

  // A confirmed (paid) booking: Tom booked Maya's React review, with its chat.
  const reqId = "req_tom_react";
  const bookedDate = AVAIL_DATES[0];
  const bookedTime = SEED_AVAILABILITY[bookedDate][0];
  await db.collection("serviceRequests").doc(reqId).set({
    serviceId: "s_react",
    serviceTitle: "React & Next.js code review",
    requesterId: "u_tom",
    requesterName: "Tom Becker",
    providerId: "u_maya",
    providerName: "Maya Chen",
    scheduledDate: bookedDate,
    scheduledTime: bookedTime,
    price: 0,
    paymentMethod: "free",
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: FieldValue.serverTimestamp(),
  });

  const [a, b] = ["u_tom", "u_maya"].sort();
  const chatId = `${a}_${b}_${reqId}`;
  const opener = `Hi! I booked "React & Next.js code review" for ${bookedDate} at ${bookedTime}.`;
  await db.doc(`chats/${chatId}`).set({
    participantIds: ["u_tom", "u_maya"],
    participantNames: { u_tom: "Tom Becker", u_maya: "Maya Chen" },
    serviceId: "s_react",
    serviceTitle: "React & Next.js code review",
    lastMessage: opener,
    lastMessageAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection(`chats/${chatId}/messages`).add({
    senderId: "u_tom",
    text: opener,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Claim the slot so the booking modal hides 11:00 (and overlapping 11:30).
  const slotId = `s_react_${bookedDate}_${bookedTime.replace(":", "")}`;
  await db.doc(`bookedSlots/${slotId}`).set({
    serviceId: "s_react",
    providerId: "u_maya",
    date: bookedDate,
    time: bookedTime,
    createdAt: FieldValue.serverTimestamp(),
  });
  for (const lockId of slotLockIds("s_react", bookedDate, bookedTime)) {
    await db.doc(`slotLocks/${lockId}`).set({
      serviceId: "s_react",
      providerId: "u_maya",
      date: bookedDate,
      time: bookedTime,
      bookingPaymentRef: "seed_req_tom_react",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  console.log("  booking  Tom -> 'React & Next.js code review' (confirmed + chat + slot)");
}

async function main() {
  console.log(`Seeding emulator project "${PROJECT_ID}"...`);
  await seedUsers();
  await seedServices();
  await seedExtras();
  console.log("\nDone. Sign in with any seeded email + password 'password123'.");
  console.log("Admin: admin@lifeswap.dev");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  console.error(
    "\nIs the emulator running? Start it with `npm run emulators` first."
  );
  process.exit(1);
});
