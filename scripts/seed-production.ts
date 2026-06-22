/**
 * Seeds the REAL Firebase project (not the emulator) with realistic demo data
 * so the live site looks alive for a portfolio. Idempotent — safe to re-run.
 *
 * Requires a service-account key (Admin SDK bypasses security rules):
 *   1. Firebase console → Project settings → Service accounts → Generate new private key
 *   2. Save it as `serviceAccount.json` in the lifeswap/ folder (it's gitignored)
 *   3. npm run seed:prod
 *
 * Demo logins it creates: any email below + password "password123".
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json";
let sa: { project_id: string };
try {
  sa = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  console.error(
    `\n✗ Could not read a service-account key at "${keyPath}".\n` +
      `  Firebase console → Project settings → Service accounts → Generate new private key,\n` +
      `  save it as serviceAccount.json in the lifeswap/ folder, then run again.\n`
  );
  process.exit(1);
}

initializeApp({ credential: cert(sa as never), projectId: sa.project_id });
const auth = getAuth();
const db = getFirestore();
const now = FieldValue.serverTimestamp();
const PASSWORD = "password123";

// ── Upcoming weekday dates for availability ──────────────────────────────────
function upcoming(count: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 2; out.length < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
const DATES = upcoming(6);
function avail(spec: Record<number, string[]>): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const k of Object.keys(spec)) m[DATES[Number(k)]] = spec[Number(k)];
  return m;
}

// ── People ───────────────────────────────────────────────────────────────────
interface Person {
  uid: string;
  name: string;
  email: string;
  isProvider: boolean;
  linkedin?: string;
}
const PEOPLE: Person[] = [
  { uid: "u_maya", name: "Maya Chen", email: "maya@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/maya-chen" },
  { uid: "u_leo", name: "Leo Martins", email: "leo@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/leo-martins" },
  { uid: "u_aisha", name: "Aisha Rahman", email: "aisha@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/aisha-rahman" },
  { uid: "u_daniel", name: "Daniel Cohen", email: "daniel@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/daniel-cohen" },
  { uid: "u_sara", name: "Sara Klein", email: "sara@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/sara-klein" },
  { uid: "u_omar", name: "Omar Haddad", email: "omar@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/omar-haddad" },
  { uid: "u_priya", name: "Priya Nair", email: "priya@lifeswap.demo", isProvider: true, linkedin: "https://www.linkedin.com/in/priya-nair" },
  { uid: "u_noa", name: "Noa Levi", email: "noa@lifeswap.demo", isProvider: true },
  { uid: "u_tom", name: "Tom Becker", email: "tom@lifeswap.demo", isProvider: false },
  { uid: "u_emma", name: "Emma Wilson", email: "emma@lifeswap.demo", isProvider: false },
  { uid: "u_jonas", name: "Jonas Weber", email: "jonas@lifeswap.demo", isProvider: false },
];
const byUid = Object.fromEntries(PEOPLE.map((p) => [p.uid, p]));

// ── Services ─────────────────────────────────────────────────────────────────
interface Svc {
  id: string;
  provider: string;
  title: string;
  category: string;
  price: number;
  description: string;
  availability: Record<string, string[]>;
}
const SERVICES: Svc[] = [
  { id: "svc_react", provider: "u_maya", title: "React & Next.js code review", category: "Software Engineering", price: 90,
    description: "I'll review your React/Next.js codebase and pair with you on architecture, performance, and testing. 8 years shipping production frontends at scale.",
    availability: avail({ 0: ["09:00", "11:00", "14:00"], 1: ["10:00", "15:30"], 3: ["09:30", "13:00"] }) },
  { id: "svc_sysdesign", provider: "u_maya", title: "System design interview prep", category: "Software Engineering", price: 120,
    description: "Mock system-design interviews with detailed feedback. We'll cover scalability, trade-offs, and how to communicate your design clearly under pressure.",
    availability: avail({ 1: ["11:00", "16:00"], 2: ["09:00", "14:30"], 4: ["10:30"] }) },
  { id: "svc_uxcrit", provider: "u_leo", title: "Product design critique", category: "Design", price: 70,
    description: "Bring your app or landing page and I'll give you a structured UX/visual critique with prioritized, actionable fixes you can ship the same week.",
    availability: avail({ 0: ["10:00", "13:30"], 2: ["09:30", "15:00"], 3: ["11:00"] }) },
  { id: "svc_designsys", provider: "u_leo", title: "Design system setup", category: "Design", price: 150,
    description: "Set up a clean, scalable design system — tokens, components, and documentation — so your team ships consistent UI faster.",
    availability: avail({ 1: ["09:00", "14:00"], 4: ["10:00", "16:00"] }) },
  { id: "svc_ml", provider: "u_aisha", title: "Intro to applied machine learning", category: "Data Science & AI", price: 80,
    description: "A friendly, hands-on session to get you from zero to a working ML model, with no heavy math prerequisites. Perfect for engineers crossing into ML.",
    availability: avail({ 0: ["09:00", "12:00"], 2: ["10:30", "15:30"], 5: ["09:30"] }) },
  { id: "svc_dataport", provider: "u_aisha", title: "Data science portfolio review", category: "Data Science & AI", price: 60,
    description: "I'll review your projects and GitHub, tell you what hiring managers actually look for, and help you turn good work into a standout portfolio.",
    availability: avail({ 1: ["11:30"], 3: ["10:00", "14:00"] }) },
  { id: "svc_career", provider: "u_daniel", title: "Tech career & interview coaching", category: "Career Coaching", price: 75,
    description: "Mock interviews, resume teardown, and a concrete plan to land your next engineering role. I've sat on both sides of the hiring table.",
    availability: avail({ 0: ["08:30", "17:00"], 2: ["09:00", "16:30"], 4: ["10:00"] }) },
  { id: "svc_resume", provider: "u_daniel", title: "Resume teardown", category: "Career Coaching", price: 45,
    description: "A focused 45-minute session rewriting your resume line by line so it gets past screeners and actually lands interviews.",
    availability: avail({ 1: ["09:00", "13:00", "16:00"], 3: ["11:00"] }) },
  { id: "svc_growth", provider: "u_sara", title: "Early-stage growth strategy", category: "Marketing", price: 110,
    description: "We'll build a concrete growth plan for your stage — channels, messaging, and the first experiments to run — drawn from scaling two startups from scratch.",
    availability: avail({ 0: ["10:00"], 2: ["11:00", "15:00"], 4: ["09:30", "14:00"] }) },
  { id: "svc_seo", provider: "u_sara", title: "SEO audit & action plan", category: "Marketing", price: 85,
    description: "A practical audit of your site's SEO with a prioritized action plan — technical fixes, content gaps, and quick wins you can tackle first.",
    availability: avail({ 1: ["10:30", "14:30"], 3: ["09:00"] }) },
  { id: "svc_bizmodel", provider: "u_omar", title: "Business model deep-dive", category: "Business Strategy", price: 130,
    description: "Pressure-test your business model: pricing, unit economics, and go-to-market. Leave with a sharper story for customers and investors.",
    availability: avail({ 0: ["09:00", "13:00"], 2: ["10:00"], 5: ["11:00", "15:00"] }) },
  { id: "svc_pm", provider: "u_priya", title: "Product management mentoring", category: "Product Management", price: 95,
    description: "1:1 mentoring for aspiring and early PMs — roadmaps, prioritization, stakeholder management, and breaking into product.",
    availability: avail({ 1: ["09:30", "16:00"], 3: ["10:00", "14:30"] }) },
  { id: "svc_lang", provider: "u_noa", title: "Conversational English coaching", category: "Languages", price: 40,
    description: "Relaxed, conversation-first coaching to build fluency and confidence. We'll talk about things you care about and fix mistakes as we go.",
    availability: avail({ 0: ["08:00", "18:00"], 2: ["09:00", "19:00"], 4: ["08:30"] }) },
];
const svcById = Object.fromEntries(SERVICES.map((s) => [s.id, s]));

async function seedPeople() {
  for (const p of PEOPLE) {
    try {
      await auth.createUser({ uid: p.uid, email: p.email, password: PASSWORD, displayName: p.name });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "auth/uid-already-exists") throw e;
    }
    await db.doc(`users/${p.uid}`).set({
      email: p.email,
      displayName: p.name,
      photoURL: null,
      role: "user",
      isProvider: p.isProvider,
      providerStatus: p.isProvider ? "approved" : "none",
      isBlocked: false,
      createdAt: now,
    });
  }
  console.log(`  ✓ ${PEOPLE.length} users`);
}

async function seedServices() {
  for (const s of SERVICES) {
    const provider = byUid[s.provider];
    await db.doc(`services/${s.id}`).set({
      providerId: s.provider,
      providerName: provider.name,
      providerLinkedin: provider.linkedin ?? null,
      title: s.title,
      description: s.description,
      category: s.category,
      price: s.price,
      availability: s.availability,
      status: "active",
      createdAt: now,
    });
  }
  console.log(`  ✓ ${SERVICES.length} services`);
}

async function makeBooking(opts: {
  id: string;
  serviceId: string;
  requester: string;
  messages: { from: string; text: string }[];
}) {
  const svc = svcById[opts.serviceId];
  const requester = byUid[opts.requester];
  const provider = byUid[svc.provider];
  const date = Object.keys(svc.availability)[0];
  const time = svc.availability[date][0];

  await db.doc(`serviceRequests/${opts.id}`).set({
    serviceId: svc.id,
    serviceTitle: svc.title,
    requesterId: requester.uid,
    requesterName: requester.name,
    providerId: provider.uid,
    providerName: provider.name,
    scheduledDate: date,
    scheduledTime: time,
    price: svc.price,
    paymentMethod: "stripe",
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: now,
  });

  const [a, b] = [requester.uid, provider.uid].sort();
  const chatId = `${a}_${b}_${opts.id}`;
  await db.doc(`chats/${chatId}`).set({
    participantIds: [requester.uid, provider.uid],
    participantNames: { [requester.uid]: requester.name, [provider.uid]: provider.name },
    serviceId: svc.id,
    serviceTitle: svc.title,
    lastMessage: opts.messages[opts.messages.length - 1].text,
    lastMessageAt: now,
    createdAt: now,
  });
  for (const m of opts.messages) {
    await db.collection(`chats/${chatId}/messages`).add({
      senderId: m.from === "requester" ? requester.uid : provider.uid,
      text: m.text,
      createdAt: now,
    });
  }

  const slotId = `${svc.id}_${date}_${time.replace(":", "")}`;
  await db.doc(`bookedSlots/${slotId}`).set({
    serviceId: svc.id,
    providerId: provider.uid,
    date,
    time,
    createdAt: now,
  });
}

async function seedBookings() {
  await makeBooking({
    id: "req_tom_react",
    serviceId: "svc_react",
    requester: "u_tom",
    messages: [
      { from: "requester", text: "Hi Maya! Excited for the review — I'll share my repo link before we start." },
      { from: "provider", text: "Perfect, looking forward to it. Send it over whenever you're ready." },
    ],
  });
  await makeBooking({
    id: "req_emma_career",
    serviceId: "svc_career",
    requester: "u_emma",
    messages: [
      { from: "requester", text: "Hi Daniel, I'd love to focus on system design and behavioural rounds." },
      { from: "provider", text: "Great — send me the role you're targeting and we'll tailor the mock to it." },
    ],
  });
  await makeBooking({
    id: "req_jonas_ux",
    serviceId: "svc_uxcrit",
    requester: "u_jonas",
    messages: [
      { from: "requester", text: "Hey Leo, here's my landing page — keen to hear your thoughts on the hero." },
    ],
  });
  console.log("  ✓ 3 bookings (+ chats + slots)");
}

async function seedApplications() {
  await db.doc("applications/u_emma").set({
    uid: "u_emma",
    displayName: "Emma Wilson",
    email: "emma@lifeswap.demo",
    bio: "UX writer and content strategist with 6 years across B2B SaaS. I help teams find a clear, human voice and turn dense products into copy people actually understand.",
    experience: "Led content at two Series-A startups; built style guides and onboarding flows that lifted activation. Comfortable across microcopy, docs, and positioning.",
    skills: ["UX Writing", "Content Strategy", "Positioning"],
    linkedin: "https://www.linkedin.com/in/emma-wilson",
    portfolio: "",
    motivation: "I want to help early founders get their words as sharp as their product, without an agency price tag.",
    status: "pending",
    createdAt: now,
  });
  await db.doc("applications/u_jonas").set({
    uid: "u_jonas",
    displayName: "Jonas Weber",
    email: "jonas@lifeswap.demo",
    bio: "Backend engineer focused on Go and distributed systems. I've built payment and messaging infra handling millions of events a day and enjoy mentoring on fundamentals.",
    experience: "Senior engineer at a fintech scale-up; designed event-driven services and led on-call/reliability. Strong on databases, queues, and observability.",
    skills: ["Go", "Distributed Systems", "Databases"],
    linkedin: "https://www.linkedin.com/in/jonas-weber",
    portfolio: "",
    motivation: "I learned the most from a few great mentors and want to pay that forward to engineers leveling up into backend.",
    status: "pending",
    createdAt: now,
  });
  console.log("  ✓ 2 pending applications");
}

async function seedReports() {
  await db.collection("reports").doc("rep_demo_1").set({
    reporterId: "u_tom",
    reporterName: "Tom Becker",
    reportedId: "u_jonas",
    reportedName: "Jonas Weber",
    subject: "No-show for a session",
    description: "We had a confirmed session but the other person didn't show up or reply in chat. Just flagging it.",
    status: "open",
    createdAt: now,
  });
  console.log("  ✓ 1 report");
}

async function main() {
  console.log(`\nSeeding production project "${sa.project_id}"...`);
  await seedPeople();
  await seedServices();
  await seedBookings();
  await seedApplications();
  await seedReports();
  console.log(`\n✓ Done. Demo logins: any *@lifeswap.demo + password "${PASSWORD}".`);
  console.log("  Customer: tom@lifeswap.demo   Provider: maya@lifeswap.demo\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("\nSeed failed:", e);
  process.exit(1);
});
