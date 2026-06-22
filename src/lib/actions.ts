import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { enqueueBookingEmails } from "./email";
import type {
  PaymentMethod,
  Service,
  ServiceRequest,
  ServiceStatus,
  UserProfile,
} from "./types";

/**
 * Deterministic chat id from the two participants + the request, so accepting
 * the same request twice can't create duplicate chats. Participants are sorted
 * first so both sides compute the same id.
 */
export function chatIdFor(
  a: string,
  b: string,
  requestId: string
): string {
  const [x, y] = [a, b].sort();
  return `${x}_${y}_${requestId}`;
}

// ---- Services (provider) -------------------------------------------------

export interface ServiceInput {
  title: string;
  description: string;
  category: string;
  price: number;
  /** Optional LinkedIn URL; only shown on the card when the provider provides it. */
  linkedin?: string;
  /** date (ISO) -> time slots ("HH:mm") available on that date. */
  availability: Record<string, string[]>;
}

function serviceFields(input: ServiceInput) {
  const linkedin = input.linkedin?.trim();
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    price: input.price,
    providerLinkedin: linkedin ? linkedin : null,
    availability: input.availability,
  };
}

export async function createService(
  profile: UserProfile,
  input: ServiceInput
): Promise<string> {
  const ref = await addDoc(collection(db, "services"), {
    providerId: profile.uid,
    providerName: profile.displayName,
    ...serviceFields(input),
    status: "active" as ServiceStatus,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateService(
  serviceId: string,
  input: ServiceInput
): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), serviceFields(input));
}

export async function setServiceStatus(
  serviceId: string,
  status: ServiceStatus
): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), { status });
}

export async function deleteService(serviceId: string): Promise<void> {
  await deleteDoc(doc(db, "services", serviceId));
}

// ---- Requests ------------------------------------------------------------

export interface BookingInput {
  date: string;
  time: string;
  paymentMethod: PaymentMethod;
}

/**
 * Book a service. There is no host approval — a successful payment confirms the
 * meeting, creates the booking as "confirmed", and opens the chat so the two
 * sides can talk (e.g. to adjust the time).
 *
 * NOTE: the payment here is SIMULATED — no real charge is made. Wiring real
 * Stripe/PayPal needs merchant accounts, secret keys, and a server checkout +
 * webhook; that replaces only the "payment succeeds" line below.
 */
export async function bookService(
  requester: UserProfile,
  service: Service,
  input: BookingInput
): Promise<string> {
  if (service.providerId === requester.uid) {
    throw new Error("You cannot book your own service.");
  }

  // --- Simulated payment success (replace with real Stripe/PayPal) ---------
  const paymentSucceeded = true;
  if (!paymentSucceeded) throw new Error("Payment failed.");

  // Claim the slot first. The deterministic id + create-only rule means a second
  // booking of the same slot is an update → denied, preventing double-booking.
  const slotId = `${service.id}_${input.date}_${input.time.replace(":", "")}`;
  try {
    await setDoc(doc(db, "bookedSlots", slotId), {
      serviceId: service.id,
      providerId: service.providerId,
      date: input.date,
      time: input.time,
      createdAt: serverTimestamp(),
    });
  } catch {
    throw new Error("That time was just booked. Please choose another slot.");
  }

  const bookingRef = await addDoc(collection(db, "serviceRequests"), {
    serviceId: service.id,
    serviceTitle: service.title,
    requesterId: requester.uid,
    requesterName: requester.displayName,
    providerId: service.providerId,
    providerName: service.providerName,
    scheduledDate: input.date,
    scheduledTime: input.time,
    price: service.price,
    paymentMethod: input.paymentMethod,
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: serverTimestamp(),
  });

  // Payment confirmed the meeting → open the chat immediately.
  const chatId = chatIdFor(requester.uid, service.providerId, bookingRef.id);
  const opener = `Hi! I booked "${service.title}" for ${input.date} at ${input.time}.`;
  await setDoc(
    doc(db, "chats", chatId),
    {
      participantIds: [requester.uid, service.providerId],
      participantNames: {
        [requester.uid]: requester.displayName,
        [service.providerId]: service.providerName,
      },
      serviceId: service.id,
      serviceTitle: service.title,
      lastMessage: opener,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: requester.uid,
    text: opener,
    createdAt: serverTimestamp(),
  });

  // Confirmation + new-session emails (best-effort: never fail the booking).
  try {
    const providerSnap = await getDoc(doc(db, "users", service.providerId));
    const providerEmail = providerSnap.exists()
      ? ((providerSnap.data().email as string | undefined) ?? null)
      : null;
    await enqueueBookingEmails({
      serviceTitle: service.title,
      providerName: service.providerName,
      providerEmail,
      requesterName: requester.displayName,
      requesterEmail: requester.email,
      date: input.date,
      time: input.time,
      price: service.price,
    });
  } catch (e) {
    console.error("Booking emails could not be queued:", e);
  }

  return chatId;
}

/**
 * Provider accepts or declines a request. Accepting also creates (idempotently)
 * the chat both parties will use. Self-chat is impossible because a request can
 * never have requesterId === providerId.
 */
export async function respondToRequest(
  request: ServiceRequest,
  accept: boolean
): Promise<string | null> {
  await updateDoc(doc(db, "serviceRequests", request.id), {
    status: accept ? "accepted" : "declined",
  });

  if (!accept) return null;

  const chatId = chatIdFor(
    request.requesterId,
    request.providerId,
    request.id
  );
  await setDoc(
    doc(db, "chats", chatId),
    {
      participantIds: [request.requesterId, request.providerId],
      participantNames: {
        [request.requesterId]: request.requesterName,
        [request.providerId]: request.providerName,
      },
      serviceId: request.serviceId,
      serviceTitle: request.serviceTitle,
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return chatId;
}

// ---- Chat ----------------------------------------------------------------

export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
  });
}

// ---- Provider applications -----------------------------------------------

export interface ApplicationInput {
  bio: string;
  experience: string;
  skills: string[];
  linkedin?: string;
  portfolio?: string;
  motivation: string;
}

export async function submitApplication(
  profile: UserProfile,
  input: ApplicationInput
): Promise<void> {
  // Note: providerStatus on the user doc is admin-controlled (security rules),
  // so the "pending" state is read from this application doc, not the profile.
  await setDoc(doc(db, "applications", profile.uid), {
    uid: profile.uid,
    displayName: profile.displayName,
    email: profile.email,
    bio: input.bio,
    experience: input.experience,
    skills: input.skills,
    linkedin: input.linkedin ?? "",
    portfolio: input.portfolio ?? "",
    motivation: input.motivation,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

/** Admin: approve or reject. Approval flips the applicant's user doc to provider. */
export async function reviewApplication(
  uid: string,
  approve: boolean
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "applications", uid), {
    status: approve ? "approved" : "rejected",
    reviewedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", uid), {
    isProvider: approve,
    providerStatus: approve ? "approved" : "rejected",
  });
  await batch.commit();
}

// ---- User profile / admin moderation -------------------------------------

export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; photoURL?: string | null }
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

export async function setUserBlocked(
  uid: string,
  blocked: boolean
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { isBlocked: blocked });
}

// ---- Reports -------------------------------------------------------------

export interface ReportInput {
  subject: string;
  description: string;
  reportedId?: string;
  reportedName?: string;
}

export async function submitReport(
  reporter: UserProfile,
  input: ReportInput
): Promise<void> {
  await addDoc(collection(db, "reports"), {
    reporterId: reporter.uid,
    reporterName: reporter.displayName,
    reportedId: input.reportedId ?? null,
    reportedName: input.reportedName ?? null,
    subject: input.subject.trim(),
    description: input.description.trim(),
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function resolveReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, "reports", reportId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
  });
}
